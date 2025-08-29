import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fetchAirtableData, updateAirtableRecords } from '../services/airtableService';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { Convocatoria, ConvocatoriaFields, EstudianteFields, LanzamientoPPSFields } from '../types';
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
    lugar: string; // for excel
    duracion: string; // for excel
    tutor: string; // for excel
    orientacion: string;
};

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

        const selectedGroups = convocatorias.filter(c => selectedConvocatorias.has(c.id));
        const studentIds = Array.from(new Set(selectedGroups.flatMap(c => c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])));

        if (studentIds.length === 0) {
            showModal('Sin Estudiantes', 'No hay estudiantes en las convocatorias seleccionadas.');
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }

        try {
            // Map student IDs to their individual convocatoria records from the selected groups
            const studentIdToIndividualConvMap = new Map<string, Convocatoria>();
            allIndividualConvocatorias.forEach(individualConv => {
                const groupKey = [individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS], individualConv[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
                if (selectedConvocatorias.has(groupKey)) {
                    (individualConv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []).forEach(studentId => {
                        studentIdToIndividualConvMap.set(studentId, individualConv);
                    });
                }
            });

            // Fetch base student details (name, DNI, etc.)
            const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
            const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES, 
                [FIELD_NOMBRE_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES], 
                studentFormula
            );
            if (studentError) throw new Error(`Error al obtener datos de estudiantes: ${typeof studentError.error === 'string' ? studentError.error : studentError.error.message}`);
            const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));
            
            // Get all unique Lanzamiento IDs to fetch their authoritative data
            const allRelevantConvocatorias = [...studentIdToIndividualConvMap.values()];
            const lanzamientoIds = [...new Set(allRelevantConvocatorias.flatMap(c => c[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []))];
            
            let lanzamientoMap = new Map<string, LanzamientoPPSFields>();
            if (lanzamientoIds.length > 0) {
                const lanzamientoFormula = `OR(${lanzamientoIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
                const { records: lanzamientoRecords, error: lanzamientoError } = await fetchAirtableData<LanzamientoPPSFields>(
                    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                    [
                        FIELD_NOMBRE_PPS_LANZAMIENTOS,
                        FIELD_DIRECCION_LANZAMIENTOS,
                        FIELD_FECHA_INICIO_LANZAMIENTOS,
                        FIELD_FECHA_FIN_LANZAMIENTOS,
                        FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
                        FIELD_ORIENTACION_LANZAMIENTOS,
                        FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
                    ],
                    lanzamientoFormula
                );

                if (lanzamientoError) {
                    throw new Error(`Error al obtener detalles de la PPS: ${typeof lanzamientoError.error === 'string' ? lanzamientoError.error : lanzamientoError.error.message}`);
                }
                lanzamientoMap = new Map(lanzamientoRecords.map(r => [r.id, r.fields]));
            }

            // Build the final list for review using Lanzamientos as the source of truth
            const studentsToReview = studentIds.map((studentId) => {
                const student = studentMap.get(studentId);
                const individualConv = studentIdToIndividualConvMap.get(studentId);
                if (!student || !individualConv) return null;

                const lanzamientoId = (individualConv[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
                const ppsData = lanzamientoId ? lanzamientoMap.get(lanzamientoId) : null;
                
                const institucion = ppsData?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS] || 'N/A';
                const direccion = ppsData?.[FIELD_DIRECCION_LANZAMIENTOS] || individualConv[FIELD_DIRECCION_CONVOCATORIAS] || 'N/A';
                const fechaInicio = ppsData?.[FIELD_FECHA_INICIO_LANZAMIENTOS] || individualConv[FIELD_FECHA_INICIO_CONVOCATORIAS];
                const fechaFin = ppsData?.[FIELD_FECHA_FIN_LANZAMIENTOS] || individualConv[FIELD_FECHA_FIN_CONVOCATORIAS];
                const horario = individualConv[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || ppsData?.[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || 'N/A';
                const orientacion = ppsData?.[FIELD_ORIENTACION_LANZAMIENTOS] || (individualConv[FIELD_ORIENTACION_CONVOCATORIAS] as string) || '';

                const fullName = student?.[FIELD_NOMBRE_ESTUDIANTES] || '';
                let nombre = student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES] || '';
                let apellido = student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] || '';
                
                if (!nombre || !apellido) {
                    const split = simpleNameSplit(fullName);
                    nombre = split.nombre;
                    apellido = split.apellido;
                }

                const uniqueOrientations = Array.from(new Set(orientacion.split(',').map(o => o.trim()).filter(Boolean)));
                const orientacionFinal = uniqueOrientations.length > 0 ? uniqueOrientations[0] : 'N/A';

                const tutores = new Set<string>();
                uniqueOrientations.map(o => normalizeStringForComparison(o)).forEach(o => {
                    if (o === 'clinica') tutores.add('Selva Estrella');
                    else if (o === 'educacional') tutores.add('Franco Pedraza');
                    else if (o === 'laboral' || o === 'comunitaria') tutores.add('Cynthia Rossi');
                });
                
                const periodoValue = `Del ${formatDate(fechaInicio as string | undefined)} al ${formatDate(fechaFin as string | undefined)}`;
                
                return {
                    studentId, nombre, apellido,
                    dni: student[FIELD_DNI_ESTUDIANTES] || 'N/A',
                    legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                    correo: student[FIELD_CORREO_ESTUDIANTES] || 'N/A',
                    telefono: formatPhoneNumber(student[FIELD_TELEFONO_ESTUDIANTES] as string | undefined),
                    institucion: institucion,
                    direccion: direccion,
                    periodo: periodoValue,
                    horario: horario,
                    lugar: `${institucion} - ${direccion}`,
                    duracion: `Período: ${periodoValue}. Horario: ${horario}`,
                    tutor: tutores.size > 0 ? Array.from(tutores).join(', ') : 'N/A',
                    orientacion: orientacionFinal,
                };
            }).filter(Boolean) as StudentForReview[];
            
            setStudentsForReview(studentsToReview);
            setStep('review');

        } catch(e: any) {
             showModal('Error', e.message || 'Ocurrió un error al procesar los estudiantes.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleGenerateSelectionExcel = () => {
        if (studentsForReview.length === 0) {
            showModal('Sin Datos', 'No hay estudiantes en la lista para generar el reporte.');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const studentsByInstitution = studentsForReview.reduce((acc, student) => {
                const key = student.institucion;
                if (!acc[key]) acc[key] = [];
                acc[key].push(student);
                return acc;
            }, {} as Record<string, StudentForReview[]>);

            for (const institucion in studentsByInstitution) {
                const group = studentsByInstitution[institucion];
                const wsData: (string | number)[][] = [
                    ['APELLIDO', 'NOMBRE', 'DNI', 'LEGAJO', 'CORREO', 'TELEFONO', 'HORARIO SELECCIONADO']
                ];

                group.forEach(student => {
                    wsData.push([
                        student.apellido,
                        student.nombre,
                        student.dni,
                        student.legajo,
                        student.correo,
                        student.telefono,
                        student.horario
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [ {wch:25}, {wch:25}, {wch:12}, {wch:12}, {wch:30}, {wch:20}, {wch:30} ];
                
                const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "FFD9E2F3" } }}; // Light blue fill
                wsData[0].forEach((_, col) => {
                    const cellRef = XLSX.utils.encode_cell({r: 0, c: col});
                    if(ws[cellRef]) ws[cellRef].s = headerStyle;
                });
                
                let baseSheetName = institucion.replace(/[\\/?*[\]]/g, "").substring(0, 25);
                XLSX.utils.book_append_sheet(wb, ws, baseSheetName);
            }

            const ppsName = Array.from(new Set(studentsForReview.map(s => s.institucion)))
                                 .join(' & ')
                                 .replace(/[\\/?*[\]]/g, "")
                                 .substring(0, 100);
            const fileName = `Listado de alumnos (${ppsName || 'PPS'}).xlsx`;
            XLSX.writeFile(wb, fileName);
            setToastInfo({ message: 'Excel con lista de seleccionados generado.', type: 'success' });
        } catch (e: any) {
            showModal('Error al Generar Excel', e.message || 'Ocurrió un error inesperado.');
        }
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedConvocatorias);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedConvocatorias(newSelection);
    };

    const isProceedDisabled = useMemo(() => {
        if (isLoading) return true;
        return selectedConvocatorias.size === 0;
    }, [isLoading, selectedConvocatorias]);


    const renderSelectionStep = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Paso 1: Seleccionar Convocatorias</h3>
                <p className="text-slate-600 max-w-xl mt-1">Seleccione una o más de las últimas convocatorias con alumnos seleccionados para generar los reportes.</p>
            </div>

            {isLoading && !loadingMessage.includes('convocatorias') ? null : (isLoading ? <Loader /> : null)}
            
            {!isLoading && convocatorias.length === 0 && (
                <EmptyState icon="event_busy" title="Sin Convocatorias" message="No se encontraron convocatorias con estudiantes seleccionados." />
            )}

            {!isLoading && convocatorias.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="p-4 w-16 text-left">
                                    <Checkbox id="select-all" name="select-all" checked={selectedConvocatorias.size > 0 && selectedConvocatorias.size === convocatorias.length} onChange={() => setSelectedConvocatorias(selectedConvocatorias.size === convocatorias.length ? new Set() : new Set(convocatorias.map(c => c.id)))} label="" />
                                </th>
                                <th className="p-4 text-left font-semibold text-slate-500 uppercase text-xs tracking-wider">Institución</th>
                                <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Nº Estudiantes</th>
                                <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Período</th>
                            </tr>
                        </thead>
                        <tbody>
                            {convocatorias.map((convocatoria) => (
                                <tr key={convocatoria.id} className="transition-colors duration-200 hover:bg-slate-50/50 border-b border-slate-200/60 last:border-b-0">
                                    <td className="p-4 align-middle">
                                        <Checkbox id={`conv-${convocatoria.id}`} name="convocatoria" checked={selectedConvocatorias.has(convocatoria.id)} onChange={() => toggleSelection(convocatoria.id)} label="" />
                                    </td>
                                    <td className="p-4 align-middle font-semibold text-slate-800">{convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS]}</td>
                                    <td className="p-4 align-middle text-center text-slate-600 font-medium">{convocatoria[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]?.length || 0}</td>
                                    <td className="p-4 align-middle text-center text-slate-600">{formatDate(convocatoria[FIELD_FECHA_INICIO_CONVOCATORIAS])} - {formatDate(convocatoria[FIELD_FECHA_FIN_CONVOCATORIAS])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
             <div className="mt-6 flex justify-end">
                <button onClick={handleProceedToReview} disabled={isProceedDisabled} className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700">
                    {isLoading ? (
                        <>
                            <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                            <span>{loadingMessage || 'Procesando...'}</span>
                        </>
                    ) : (
                        <>
                            <span>Ir a Revisión</span>
                            <span className="material-icons !text-base">arrow_forward</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => setStep('selection')} className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                    <span className="material-icons">arrow_back</span>
                </button>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Paso 2: Revisar y Generar Reportes</h3>
                    <p className="text-slate-600 max-w-xl mt-1">Verifica los datos de los estudiantes y genera los archivos necesarios.</p>
                </div>
            </div>

            {isLoading && <Loader />}

            {!isLoading && studentsForReview.length === 0 && (
                <EmptyState icon="person_off" title="Sin Estudiantes" message="No hay estudiantes para revisar en las convocatorias seleccionadas." />
            )}

            {!isLoading && studentsForReview.length > 0 && (
                <>
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
                         <p className="text-sm font-semibold text-slate-700">{studentsForReview.length} estudiante(s) listos para generar.</p>
                         <div className="flex flex-col sm:flex-row gap-3">
                             <button onClick={handleGenerateSelectionExcel} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-green-700">
                                 <span className="material-icons !text-base">download</span>
                                 <span>Lista para Instituciones</span>
                             </button>
                         </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-200">
                                    <th className="p-3 text-left font-semibold text-slate-500">Alumno</th>
                                    <th className="p-3 text-left font-semibold text-slate-500">Institución</th>
                                    <th className="p-3 text-left font-semibold text-slate-500">Período</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60">
                                {studentsForReview.map(student => (
                                    <tr key={student.studentId} className="hover:bg-slate-50/50">
                                        <td className="p-3">
                                            <p className="font-semibold text-slate-800">{student.nombre} {student.apellido}</p>
                                            <p className="text-xs text-slate-500">Legajo: {student.legajo}</p>
                                        </td>
                                        <td className="p-3 text-slate-600">{student.institucion}</td>
                                        <td className="p-3 text-slate-600">{student.periodo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );

    // FIX: Add a return statement to the component to render the correct step.
    return (
        <Card 
            icon="shield" 
            title="Generador de Seguros y Reportes" 
            description="Genera los reportes necesarios para dar de alta los seguros de los alumnos y para notificar a las instituciones."
        >
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            {step === 'selection' ? renderSelectionStep() : renderReviewStep()}
        </Card>
    );
};
// FIX: Add a default export to make the component importable.
export default SeguroGenerator;