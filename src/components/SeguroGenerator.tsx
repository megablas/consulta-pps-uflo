import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchAirtableData } from '../services/airtableService';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { Convocatoria, ConvocatoriaFields, EstudianteFields, LanzamientoPPSFields, StudentForReview } from '../types';
import {
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_PLANTILLA_SEGURO_LANZAMIENTOS,
    TEMPLATE_PPS_NAME,
    EMAIL_SEGUROS
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Checkbox from './Checkbox';
import Toast from './Toast';
import Card from './Card';

interface SeguroGeneratorProps {
    showModal: (title: string, message: string) => void;
}

// Function moved here to resolve a build error
function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Removes '+54', an optional space, an optional '9', and another optional space from the start.
  return phone.replace(/^\+54\s?9?\s?/, '').trim();
}

const simpleNameSplit = (fullName: string): { nombre: string; apellido: string } => {
    if (!fullName) return { nombre: '', apellido: '' };
    let nombre = '';
    let apellido = '';
    if (fullName.includes(',')) {
        const parts = fullName.split(',').map(p => p.trim());
        apellido = parts[0] || '';
        nombre = parts[1] || '';
    } else {
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        if (nameParts.length > 1) {
            apellido = nameParts.pop()!;
            nombre = nameParts.join(' ');
        } else {
            nombre = fullName;
        }
    }
    return { nombre, apellido };
};


const SeguroGenerator: React.FC<SeguroGeneratorProps> = ({ showModal }) => {
    const [step, setStep] = useState<'selection' | 'review'>('selection');
    
    const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
    const [allIndividualConvocatorias, setAllIndividualConvocatorias] = useState<Convocatoria[]>([]);
    const [selectedConvocatorias, setSelectedConvocatorias] = useState<Set<string>>(new Set());
    
    const [studentsForReview, setStudentsForReview] = useState<StudentForReview[]>([]);
    const [blankTemplateUrl, setBlankTemplateUrl] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchTemplate = async () => {
            const { records, error } = await fetchAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                [FIELD_PLANTILLA_SEGURO_LANZAMIENTOS],
                `{${FIELD_NOMBRE_PPS_LANZAMIENTOS}} = '${TEMPLATE_PPS_NAME}'`,
                1
            );

            if (error || records.length === 0) {
                console.error("Could not fetch the master insurance template from Airtable.");
                setBlankTemplateUrl(null);
                return;
            }

            const attachment = records[0].fields[FIELD_PLANTILLA_SEGURO_LANZAMIENTOS] as { url: string }[] | undefined;
            if (attachment && attachment[0]?.url) {
                setBlankTemplateUrl(attachment[0].url);
            } else {
                console.warn(`Template PPS record found ('${TEMPLATE_PPS_NAME}'), but it has no attachment in the '${FIELD_PLANTILLA_SEGURO_LANZAMIENTOS}' field.`);
                setBlankTemplateUrl(null);
            }
        };

        fetchTemplate();
        handleFetchConvocatorias();
    }, []);

    const handleFetchConvocatorias = async () => {
        setIsLoading(true);
        setLoadingMessage('Cargando convocatorias...');
        setConvocatorias([]);
        
        const { records, error } = await fetchAirtableData<ConvocatoriaFields>(
            AIRTABLE_TABLE_NAME_CONVOCATORIAS,
            [
                FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
                FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS,
                FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
            ],
            `AND({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}} != '', LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado')`,
            200, [{ field: FIELD_FECHA_INICIO_CONVOCATORIAS, direction: 'desc' }]
        );

        setIsLoading(false);
        setLoadingMessage('');
        if (error) {
            showModal('Error de Carga', `No se pudieron cargar las convocatorias: ${typeof error.error === 'string' ? error.error : error.error.message}`);
            return;
        }

        const allRecordsFromApi = records.map(r => ({ ...r.fields, id: r.id }));
        setAllIndividualConvocatorias(allRecordsFromApi);

        const groupedConvocatorias = new Map<string, Convocatoria>();
        allRecordsFromApi.forEach(record => {
            const fields = record;
            const key = [fields[FIELD_NOMBRE_PPS_CONVOCATORIAS], fields[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
            if (!groupedConvocatorias.has(key)) {
                groupedConvocatorias.set(key, { ...fields, id: key, [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [] });
            }
            const group = groupedConvocatorias.get(key)!;
            group[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] = [...new Set([...group[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]!, ...(fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])])];
            group[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] = [...new Set([...(group[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []), ...(fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])])];
        });
        
        const finalConvocatorias = Array.from(groupedConvocatorias.values()).sort((a, b) => new Date(b[FIELD_FECHA_INICIO_CONVOCATORIAS]!).getTime() - new Date(a[FIELD_FECHA_INICIO_CONVOCATORIAS]!).getTime()).slice(0, 5);
        setConvocatorias(finalConvocatorias);
    };

    const handleProceedToReview = async () => {
        setIsLoading(true);
        setLoadingMessage('Procesando estudiantes...');
        const relevantConvocatorias = allIndividualConvocatorias.filter(c => {
            const key = [c[FIELD_NOMBRE_PPS_CONVOCATORIAS], c[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
            return selectedConvocatorias.has(key);
        });

        if (relevantConvocatorias.length === 0) {
            showModal('Sin Selección', 'Por favor, selecciona al menos una convocatoria para continuar.');
            setIsLoading(false);
            return;
        }

        const allStudentIds = [...new Set(relevantConvocatorias.flatMap(c => c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []))];
        
        if (allStudentIds.length === 0) {
            showModal('Sin Estudiantes', 'Las convocatorias seleccionadas no tienen estudiantes seleccionados.');
            setIsLoading(false);
            return;
        }
        
        setLoadingMessage(`Cargando datos de ${allStudentIds.length} estudiantes...`);

        const studentFormula = `OR(${allStudentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
        const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES,
            [FIELD_NOMBRE_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES],
            studentFormula
        );

        if (studentError) {
            showModal('Error', 'No se pudieron cargar los datos de los estudiantes.');
            setIsLoading(false);
            return;
        }

        const studentDataMap = new Map(studentRecords.map(r => [r.id, r.fields]));
        
        const studentsToReview: StudentForReview[] = [];

        relevantConvocatorias.forEach(conv => {
            const studentIds = conv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [];
            studentIds.forEach(studentId => {
                const student = studentDataMap.get(studentId);
                if (student) {
                    const fullName = student[FIELD_NOMBRE_ESTUDIANTES] || '';
                    const { nombre, apellido } = (student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] && student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES])
                        ? { nombre: student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES]!, apellido: student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES]! }
                        : simpleNameSplit(fullName);
                    
                    const startDate = formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS]);
                    const endDate = formatDate(conv[FIELD_FECHA_FIN_CONVOCATORIAS]);
                    const institucionLookup = conv[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                    const institucion = Array.isArray(institucionLookup) ? institucionLookup[0] : institucionLookup;

                    studentsToReview.push({
                        studentId,
                        nombre,
                        apellido,
                        dni: String(student[FIELD_DNI_ESTUDIANTES] || ''),
                        legajo: String(student[FIELD_LEGAJO_ESTUDIANTES] || ''),
                        correo: String(student[FIELD_CORREO_ESTUDIANTES] || ''),
                        telefono: formatPhoneNumber(student[FIELD_TELEFONO_ESTUDIANTES]),
                        institucion: String(institucion || ''),
                        direccion: conv[FIELD_DIRECCION_CONVOCATORIAS] || '',
                        periodo: `${startDate} - ${endDate}`,
                        horario: conv[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '',
                        lugar: conv[FIELD_DIRECCION_CONVOCATORIAS] || '',
                        duracion: '', 
                        tutor: 'A completar',
                        orientacion: conv[FIELD_ORIENTACION_CONVOCATORIAS] || '',
                    });
                }
            });
        });
        
        setStudentsForReview(studentsToReview.sort((a,b) => a.apellido.localeCompare(b.apellido)));
        setStep('review');
        setIsLoading(false);
    };

    const handleToggleConvocatoria = (key: string) => {
        setSelectedConvocatorias(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleGenerateExcel = async () => {
        if (!blankTemplateUrl) {
            showModal('Error', 'No se encontró la plantilla de Excel. Contacta al administrador.');
            return;
        }

        try {
            const response = await fetch(blankTemplateUrl);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            const excelData = studentsForReview.map(s => ({
                "NOMBRE": s.nombre,
                "APELLIDO": s.apellido,
                "DNI": s.dni,
                "LEGAJO": s.legajo,
                "LUGAR": s.lugar,
                "PERIODO": s.periodo,
                "HORARIO": s.horario,
                "DURACION": s.duracion,
                "TUTOR": s.tutor,
                "ORIENTACION": s.orientacion
            }));

            XLSX.utils.sheet_add_json(worksheet, excelData, { skipHeader: true, origin: 'A5' });

            const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
            const fileName = `Seguro_PPS_${today}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            setToastInfo({ message: `¡Planilla "${fileName}" generada!`, type: 'success'});

        } catch (error) {
            console.error('Error generating Excel file:', error);
            showModal('Error', 'No se pudo generar el archivo Excel.');
        }
    };
    
    return (
        <Card
            icon="shield"
            title="Generador de Planillas de Seguro"
            description="Selecciona las convocatorias activas para generar la planilla de seguro ART para los alumnos seleccionados."
            className="transition-all duration-500"
        >
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            {isLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center z-20">
                    <Loader />
                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{loadingMessage}</p>
                </div>
            )}
            
            {step === 'selection' && (
                <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700 pt-6 animate-fade-in-up">
                    {convocatorias.length > 0 ? (
                        <div className="space-y-3">
                            {convocatorias.map(conv => {
                                const key = conv.id;
                                const studentCount = conv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]?.length || 0;
                                return (
                                    <Checkbox
                                        key={key}
                                        id={key}
                                        name={key}
                                        checked={selectedConvocatorias.has(key)}
                                        onChange={() => handleToggleConvocatoria(key)}
                                        label={`${conv[FIELD_NOMBRE_PPS_CONVOCATORIAS]} (${formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS])}) - ${studentCount} alumno${studentCount !== 1 ? 's' : ''}`}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon="upcoming_off" title="Sin Convocatorias" message="No se encontraron convocatorias recientes con alumnos seleccionados."/>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleProceedToReview}
                            disabled={selectedConvocatorias.size === 0 || isLoading}
                            className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700"
                        >
                           <span className="material-icons !text-base">arrow_forward</span>
                           <span>Continuar a Revisión</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 'review' && (
                <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700 pt-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{studentsForReview.length} Alumnos para Incluir en la Planilla</h3>
                    <div className="overflow-x-auto max-h-96 border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100/70 dark:bg-slate-800/70 sticky top-0">
                                <tr>
                                    {['Apellido', 'Nombre', 'DNI', 'Legajo', 'Institución'].map(h => <th key={h} className="p-3 text-left font-semibold text-slate-500 dark:text-slate-400">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700">
                                {studentsForReview.map(s => (
                                    <tr key={s.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{s.apellido}</td>
                                        <td className="p-3 text-slate-700 dark:text-slate-200">{s.nombre}</td>
                                        <td className="p-3 text-slate-700 dark:text-slate-200">{s.dni}</td>
                                        <td className="p-3 text-slate-700 dark:text-slate-200 font-mono">{s.legajo}</td>
                                        <td className="p-3 text-slate-700 dark:text-slate-200">{s.institucion}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-8 flex justify-between items-center">
                        <button onClick={() => setStep('selection')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 flex items-center gap-2">
                           <span className="material-icons !text-base">arrow_back</span>
                           <span>Volver</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <a href={`mailto:${EMAIL_SEGUROS}?subject=Planilla%20Seguro%20ART%20-%20${new Date().toLocaleDateString('es-AR')}`} className="bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center gap-2 hover:bg-slate-800">
                                <span className="material-icons !text-base">email</span>
                                <span>Enviar por Correo</span>
                            </a>
                            <button onClick={handleGenerateExcel} className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center gap-2 hover:bg-green-700">
                                <span className="material-icons !text-base">download</span>
                                <span>Generar Excel</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default SeguroGenerator;
