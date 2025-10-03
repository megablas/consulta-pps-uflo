import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fetchAllAirtableData, fetchAirtableData } from '../services/airtableService';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { Convocatoria, ConvocatoriaFields, EstudianteFields, InstitucionFields, LanzamientoPPSFields } from '../types';
import {
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_PLANTILLA_SEGURO_LANZAMIENTOS,
    TEMPLATE_PPS_NAME,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_DIRECCION_INSTITUCIONES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Checkbox from './Checkbox';
import Toast from './Toast';
import Card from './Card';

interface SeguroGeneratorProps {
    showModal: (title: string, message: string) => void;
}

interface StudentForReview {
    studentId: string;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
    correo: string;
    telefono: string;
    institucion: string;
    direccion: string;
    periodo: string;
    horario: string;
    lugar: string; 
    duracion: string; 
    tutor: string; 
    orientacion: string;
};

function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
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

export const SeguroGenerator: React.FC<SeguroGeneratorProps> = ({ showModal }) => {
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
            if (error || records.length === 0) return;
            const attachment = records[0].fields[FIELD_PLANTILLA_SEGURO_LANZAMIENTOS] as { url: string }[] | undefined;
            if (attachment && attachment[0]?.url) setBlankTemplateUrl(attachment[0].url);
        };
        fetchTemplate();
        handleFetchConvocatorias();
    }, []);

    const handleFetchConvocatorias = async () => {
        setIsLoading(true);
        setLoadingMessage('Cargando convocatorias...');
        setConvocatorias([]);
        
        const { records, error } = await fetchAllAirtableData<ConvocatoriaFields>(
            AIRTABLE_TABLE_NAME_CONVOCATORIAS,
            [
                FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
                FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS,
                FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
            ],
            `AND({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}} != '', {${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}} = 'Seleccionado')`,
            [{ field: FIELD_FECHA_INICIO_CONVOCATORIAS, direction: 'desc' }]
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
        
        const finalConvocatorias = Array.from(groupedConvocatorias.values()).sort((a, b) => new Date(b[FIELD_FECHA_INICIO_CONVOCATORIAS]!).getTime() - new Date(a[FIELD_FECHA_INICIO_CONVOCATORIAS]!).getTime());
        setConvocatorias(finalConvocatorias);
    };

    const handleProceedToReview = async () => {
        if (selectedConvocatorias.size === 0) {
            showModal('Selección Vacía', 'Por favor, selecciona al menos una convocatoria para continuar.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Recopilando datos de los alumnos...');

        try {
            const studentIdsToFetch = new Set<string>();
            allIndividualConvocatorias.forEach(conv => {
                const key = [conv[FIELD_NOMBRE_PPS_CONVOCATORIAS], conv[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
                if (selectedConvocatorias.has(key)) {
                    (conv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []).forEach(id => studentIdsToFetch.add(id));
                }
            });

            if (studentIdsToFetch.size === 0) {
                throw new Error('No se encontraron estudiantes en las convocatorias seleccionadas.');
            }

            const studentFormula = `OR(${Array.from(studentIdsToFetch).map(id => `RECORD_ID()='${id}'`).join(',')})`;
            const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES,
                [
                    FIELD_NOMBRE_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
                    FIELD_DNI_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES
                ],
                studentFormula
            );

            if (studentError) throw new Error('Error al obtener los detalles de los estudiantes.');

            const studentDetailsMap = new Map<string, EstudianteFields>();
            studentRecords.forEach(r => studentDetailsMap.set(r.id, r.fields));
            
            // FIX: Add an explicit type annotation to the 'key' parameter to resolve the 'unknown' type error.
            const institutionsFormula = `OR(${Array.from(selectedConvocatorias).map((key: string) => `{Nombre} = "${key.split('||')[0]}"`).join(',')})`;
            const { records: institutionRecords, error: instError } = await fetchAllAirtableData<InstitucionFields>(
                AIRTABLE_TABLE_NAME_INSTITUCIONES,
                [FIELD_NOMBRE_INSTITUCIONES, FIELD_DIRECCION_INSTITUCIONES],
                institutionsFormula
            );
            if(instError) console.warn("Could not fetch institution addresses for insurance generator");

            const institutionAddressMap = new Map<string, string>();
            institutionRecords.forEach(inst => {
                if(inst.fields[FIELD_NOMBRE_INSTITUCIONES] && inst.fields[FIELD_DIRECCION_INSTITUCIONES]) {
                    institutionAddressMap.set(normalizeStringForComparison(inst.fields[FIELD_NOMBRE_INSTITUCIONES]), inst.fields[FIELD_DIRECCION_INSTITUCIONES]);
                }
            });

            const reviewList: StudentForReview[] = [];
            allIndividualConvocatorias.forEach(conv => {
                const key = [conv[FIELD_NOMBRE_PPS_CONVOCATORIAS], conv[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
                if (!selectedConvocatorias.has(key)) return;

                const studentId = (conv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
                if (!studentId) return;

                const student = studentDetailsMap.get(studentId);
                if (!student) return;
                
                const fullName = student[FIELD_NOMBRE_ESTUDIANTES] || '';
                const { nombre, apellido } = (student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] && student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES])
                    ? { nombre: student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES] || '', apellido: student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] || '' }
                    : simpleNameSplit(fullName);
                
                const ppsName = Array.isArray(conv[FIELD_NOMBRE_PPS_CONVOCATORIAS]) ? conv[FIELD_NOMBRE_PPS_CONVOCATORIAS][0] : conv[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                const direccion = conv[FIELD_DIRECCION_CONVOCATORIAS] || institutionAddressMap.get(normalizeStringForComparison(ppsName || '')) || 'No especificada';

                reviewList.push({
                    studentId: studentId,
                    nombre: nombre || '',
                    apellido: apellido || '',
                    dni: String(student[FIELD_DNI_ESTUDIANTES] || ''),
                    legajo: String(student[FIELD_LEGAJO_ESTUDIANTES] || ''),
                    correo: student[FIELD_CORREO_ESTUDIANTES] || '',
                    telefono: formatPhoneNumber(student[FIELD_TELEFONO_ESTUDIANTES]),
                    institucion: ppsName || 'N/A',
                    direccion: direccion,
                    periodo: `${formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS])} al ${formatDate(conv[FIELD_FECHA_FIN_CONVOCATORIAS])}`,
                    horario: conv[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'A convenir',
                    lugar: direccion,
                    duracion: '3 meses',
                    tutor: 'A designar',
                    orientacion: conv[FIELD_ORIENTACION_CONVOCATORIAS] || 'N/A',
                });
            });
            
            reviewList.sort((a, b) => a.institucion.localeCompare(b.institucion) || a.apellido.localeCompare(b.apellido));

            setStudentsForReview(reviewList);
            setStep('review');
        } catch (err: any) {
            showModal('Error', err.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleBackToSelection = () => {
        setStep('selection');
        setStudentsForReview([]);
    };
    
    const handleGenerateExcel = () => {
        if (studentsForReview.length === 0) {
            showModal('Error', 'No hay estudiantes para generar la planilla.');
            return;
        }
        const dataForSheet = studentsForReview.map(s => ({
            'Nombre': s.nombre,
            'Apellido': s.apellido,
            'DNI': s.dni,
            'Correo': s.correo,
            'Teléfono': s.telefono,
            'Lugar de Práctica': s.lugar,
            'Duración': s.duracion,
            'Período': s.periodo,
            'Tutor': s.tutor,
        }));

        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Alumnos para Seguro');
        XLSX.writeFile(wb, `Seguro_PPS_${new Date().toISOString().split('T')[0]}.xlsx`);

        setToastInfo({ message: 'Planilla de Excel generada.', type: 'success' });
    };

    const handleToggleSelection = (convocatoriaId: string) => {
        setSelectedConvocatorias(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(convocatoriaId)) {
                newSelection.delete(convocatoriaId);
            } else {
                newSelection.add(convocatoriaId);
            }
            return newSelection;
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <Loader />
                <p className="mt-4 font-semibold text-slate-600 dark:text-slate-300">{loadingMessage}</p>
            </div>
        );
    }

    const reviewHeaders = ['Nombre', 'Apellido', 'DNI', 'Institución', 'Período'];

    return (
        <div className="space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}

            {step === 'selection' && (
                <Card
                    title="Generador de Planilla de Seguros"
                    icon="shield"
                    description="Selecciona las convocatorias para incluir a los alumnos en la planilla de seguro ART."
                    actions={
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleProceedToReview}
                                disabled={selectedConvocatorias.size === 0}
                                className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors shadow-md hover:bg-blue-700 disabled:bg-slate-400"
                            >
                                Revisar Alumnos ({selectedConvocatorias.size})
                            </button>
                        </div>
                    }
                >
                    {convocatorias.length > 0 ? (
                        <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700 pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {convocatorias.map(conv => {
                                const isSelected = selectedConvocatorias.has(conv.id);
                                return (
                                    <div key={conv.id} className={`p-4 rounded-lg border-2 ${isSelected ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200/80 dark:border-slate-700'}`}>
                                        <Checkbox
                                            id={conv.id}
                                            name={conv.id}
                                            checked={isSelected}
                                            onChange={() => handleToggleSelection(conv.id)}
                                            label={
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{Array.isArray(conv[FIELD_NOMBRE_PPS_CONVOCATORIAS]) ? conv[FIELD_NOMBRE_PPS_CONVOCATORIAS][0] : conv[FIELD_NOMBRE_PPS_CONVOCATORIAS]}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS])} - {conv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]?.length} alumnos</p>
                                                </div>
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState icon="format_list_bulleted" title="Sin Convocatorias" message="No se encontraron convocatorias con alumnos seleccionados." />
                    )}
                </Card>
            )}

            {step === 'review' && (
                <Card
                    title="Revisar Datos para el Seguro"
                    icon="person_search"
                    description={`Verifica los datos de los ${studentsForReview.length} alumnos antes de generar la planilla de Excel.`}
                    actions={
                        <div className="flex items-center gap-3">
                            <button onClick={handleBackToSelection} className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg text-sm border border-slate-300 dark:border-slate-600">
                                Volver
                            </button>
                            <button onClick={handleGenerateExcel} className="bg-emerald-600 text-white font-bold py-2 px-5 rounded-lg text-sm">
                                Generar Excel
                            </button>
                            {blankTemplateUrl && <a href={blankTemplateUrl} target="_blank" rel="noopener noreferrer" className="bg-slate-600 text-white font-bold py-2 px-5 rounded-lg text-sm">Plantilla Vacía</a>}
                        </div>
                    }
                >
                    <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700 pt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100/70 dark:bg-slate-800/70">
                                    <tr>
                                        {reviewHeaders.map(h => <th key={h} className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700">
                                    {studentsForReview.map((student, index) => (
                                        <tr key={`${student.studentId}-${index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70">
                                            <td className="p-3 text-slate-800 dark:text-slate-100 font-medium">{student.nombre}</td>
                                            <td className="p-3 text-slate-800 dark:text-slate-100 font-medium">{student.apellido}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-300">{student.dni}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-300">{student.institucion}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-300">{student.periodo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};