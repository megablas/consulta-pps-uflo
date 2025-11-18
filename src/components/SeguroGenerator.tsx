import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAirtableData } from '../services/airtableService';
import { formatDate, normalizeStringForComparison, simpleNameSplit } from '../utils/formatters';
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
import { convocatoriaArraySchema, estudianteArraySchema, lanzamientoPPSArraySchema } from '../schemas';

interface SeguroGeneratorProps {
    showModal: (title: string, message: string) => void;
    isTestingMode?: boolean;
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

const mockConvocatoriasForSeguro: Convocatoria[] = [{
    id: 'Hospital de Simulación||2024-08-15',
    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Hospital de Simulación',
    [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15',
    [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudTest1', 'recStudTest2'],
}];

const mockStudentsForReview: StudentForReview[] = [
    { studentId: 'recStudTest1', nombre: 'Juan', apellido: 'Tester', dni: '11222333', legajo: 'T9001', correo: 'juan@test.com', telefono: '1133445566', institucion: 'Hospital de Simulación', direccion: 'Calle Falsa 123', periodo: 'Del 15/08/2024 al 15/12/2024', horario: 'Lunes y Miércoles 9 a 13hs', lugar: 'Hospital de Simulación - Calle Falsa 123', duracion: 'Período: Del 15/08/2024 al 15/12/2024. Horario: Lunes y Miércoles 9 a 13hs', tutor: 'Selva Estrella', orientacion: 'Clinica' },
    { studentId: 'recStudTest2', nombre: 'Maria', apellido: 'Debug', dni: '44555666', legajo: 'T9002', correo: 'maria@test.com', telefono: '1177889900', institucion: 'Hospital de Simulación', direccion: 'Calle Falsa 123', periodo: 'Del 15/08/2024 al 15/12/2024', horario: 'Lunes y Miércoles 9 a 13hs', lugar: 'Hospital de Simulación - Calle Falsa 123', duracion: 'Período: Del 15/08/2024 al 15/12/2024. Horario: Lunes y Miércoles 9 a 13hs', tutor: 'Selva Estrella', orientacion: 'Clinica' },
];

// Helper function to safely extract string values from potentially complex Airtable fields (e.g., lookups returning arrays).
function getTextField(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
        const first = value[0];
        if (first == null) return '';
        if (typeof first === 'object') {
            const maybeName = (first as any)?.name ?? (first as any)?.text ?? '';
            return typeof maybeName === 'string' ? maybeName : String(maybeName ?? '');
        }
        return typeof first === 'string' ? first : String(first);
    }
    return typeof value === 'string' ? value : String(value);
}

// Function moved here to resolve a build error
function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Removes '+54', an optional space, an optional '9', and another optional space from the start.
  return phone.replace(/^\+54\s?9?\s?/, '').trim();
}

const SeguroGenerator: React.FC<SeguroGeneratorProps> = ({ showModal, isTestingMode = false }) => {
    const [step, setStep] = useState<'selection' | 'review'>('selection');
    
    const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
    const [allIndividualConvocatorias, setAllIndividualConvocatorias] = useState<Convocatoria[]>([]);
    const [selectedConvocatorias, setSelectedConvocatorias] = useState<Set<string>>(new Set());
    
    const [studentsForReview, setStudentsForReview] = useState<StudentForReview[]>([]);
    const [blankTemplateUrl, setBlankTemplateUrl] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleFetchConvocatorias = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Cargando convocatorias...');
        setConvocatorias([]);

        if (isTestingMode) {
            setAllIndividualConvocatorias([]);
            setConvocatorias(mockConvocatoriasForSeguro);
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }
        
        // FIX: Added zod schema as second argument to fetchAirtableData
        const { records, error } = await fetchAirtableData<ConvocatoriaFields>(
            AIRTABLE_TABLE_NAME_CONVOCATORIAS,
            convocatoriaArraySchema,
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
    }, [isTestingMode, showModal]);

    useEffect(() => {
        const fetchTemplate = async () => {
            if (isTestingMode) {
                setBlankTemplateUrl('mock-template-url');
                return;
            }
            // FIX: Added zod schema as second argument to fetchAirtableData
            const { records, error } = await fetchAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                lanzamientoPPSArraySchema,
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
    }, [handleFetchConvocatorias, isTestingMode]);


    const handleProceedToReview = async () => {
        setIsLoading(true);
        setLoadingMessage('Procesando estudiantes...');

        if (isTestingMode) {
            setStudentsForReview(mockStudentsForReview);
            setStep('review');
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }

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
            // FIX: Added zod schema as second argument to fetchAirtableData
            const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES, 
                estudianteArraySchema,
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
                // FIX: Added zod schema as second argument to fetchAirtableData
                const { records: lanzamientoRecords, error: lanzamientoError } = await fetchAirtableData<LanzamientoPPSFields>(
                    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                    lanzamientoPPSArraySchema,
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
                
                const institucion = getTextField(ppsData?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS]) || 'N/A';
                const direccion = getTextField(ppsData?.[FIELD_DIRECCION_LANZAMIENTOS] || individualConv[FIELD_DIRECCION_CONVOCATORIAS]) || 'N/A';
                const fechaInicio = getTextField(ppsData?.[FIELD_FECHA_INICIO_LANZAMIENTOS] || individualConv[FIELD_FECHA_INICIO_CONVOCATORIAS] || '');
                const fechaFin = getTextField(ppsData?.[FIELD_FECHA_FIN_LANZAMIENTOS] || individualConv[FIELD_FECHA_FIN_CONVOCATORIAS] || '');
                const horario = getTextField(individualConv[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || ppsData?.[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]) || 'N/A';
                // FIX: Removed `as any` cast. The `getTextField` function is typed to accept `unknown`.
                const orientacion = getTextField(ppsData?.[FIELD_ORIENTACION_LANZAMIENTOS] || individualConv[FIELD_ORIENTACION_CONVOCATORIAS]) || '';

                const fullName = student[FIELD_NOMBRE_ESTUDIANTES] || '';
                // FIX: Removed `as any` cast. The `getTextField` function is typed to accept `unknown`.
                // FIX: Coerce unknown values to string to satisfy function expecting a string parameter.
                let nombre = getTextField(String(student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES] ?? ''));
                let apellido = getTextField(String(student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] ?? ''));
                
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
                
                const periodoValue = `Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`;
                
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
    
    const handleGenerateSelectionExcel = async () => {
        if (studentsForReview.length === 0) {
            showModal('Sin Datos', 'No hay estudiantes en la lista para generar el reporte.');
            return;
        }

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            
            const studentsByInstitution = studentsForReview.reduce((acc, student) => {
                const key = student.institucion;
                if (!acc[key]) acc[key] = [];
                acc[key].push(student);
                return acc;
            }, {} as Record<string, StudentForReview[]>);

            for (const institucion in studentsByInstitution) {
                const group = studentsByInstitution[institucion];
                let baseSheetName = institucion.replace(/[\\/?*[\]]/g, "").substring(0, 25);
                const worksheet = workbook.addWorksheet(baseSheetName);

                worksheet.columns = [
                    { header: 'APELLIDO', key: 'apellido', width: 25 },
                    { header: 'NOMBRE', key: 'nombre', width: 25 },
                    { header: 'DNI', key: 'dni', width: 12 },
                    { header: 'LEGAJO', key: 'legajo', width: 12 },
                    { header: 'CORREO', key: 'correo', width: 30 },
                    { header: 'TELEFONO', key: 'telefono', width: 20 },
                    { header: 'HORARIO SELECCIONADO', key: 'horario', width: 30 },
                ];
                
                worksheet.addRows(group);

                // Style header row
                worksheet.getRow(1).eachCell(cell => {
                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD9E2F3' } // Light blue fill
                    };
                });
            }
            
            const ppsName = Array.from(new Set(studentsForReview.map(s => s.institucion)))
                                 .join(' & ')
                                 .replace(/[\\/?*[\]]/g, "")
                                 .substring(0, 100);
            const fileName = `Listado de alumnos (${ppsName || 'PPS'}).xlsx`;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

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
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Paso 1: Seleccionar Convocatorias</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-xl mt-1">Seleccione una o más de las últimas convocatorias con alumnos seleccionados para generar los reportes.</p>
            </div>

            {isLoading && !loadingMessage.includes('convocatorias') ? null : (isLoading ? <Loader /> : null)}
            
            {!isLoading && convocatorias.length === 0 && (
                <EmptyState icon="event_busy" title="Sin Convocatorias" message="No se encontraron convocatorias con estudiantes seleccionados." />
            )}

            {!isLoading && convocatorias.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                                <th className="p-4 w-16 text-left">
                                    <Checkbox id="select-all" name="select-all" checked={selectedConvocatorias.size > 0 && selectedConvocatorias.size === convocatorias.length} onChange={() => setSelectedConvocatorias(selectedConvocatorias.size === convocatorias.length ? new Set() : new Set(convocatorias.map(c => c.id)))} label="" />
                                </th>
                                <th className="p-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Institución</th>
                                <th className="p-4 text-center font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Nº Estudiantes</th>
                                <th className="p-4 text-center font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Período</th>
                            </tr>
                        </thead>
                        <tbody>
                            {convocatorias.map((convocatoria) => (
                                <tr key={convocatoria.id} className="transition-colors duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700 last:border-b-0">
                                    <td className="p-4 align-middle">
                                        <Checkbox id={`conv-${convocatoria.id}`} name="convocatoria" checked={selectedConvocatorias.has(convocatoria.id)} onChange={() => toggleSelection(convocatoria.id)} label="" />
                                    </td>
                                    <td className="p-4 align-middle font-semibold text-slate-800 dark:text-slate-100">{String(convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS])}</td>
                                    <td className="p-4 align-middle text-center text-slate-600 dark:text-slate-300 font-medium">{convocatoria[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]?.length || 0}</td>
                                    <td className="p-4 align-middle text-center text-slate-600 dark:text-slate-300">{formatDate(String(convocatoria[FIELD_FECHA_INICIO_CONVOCATORIAS] ?? ''))} - {formatDate(String(convocatoria[FIELD_FECHA_FIN_CONVOCATORIAS] ?? ''))}</td>
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

    const renderReviewStep = () => {
        const groupedStudents = studentsForReview.reduce((acc, student) => {
            const key = student.institucion;
            if (!acc[key]) {
                acc[key] = {
                    institucion: student.institucion,
                    tutor: student.tutor,
                    orientacion: student.orientacion,
                    students: [],
                };
            }
            acc[key].students.push(student);
            return acc;
        }, {} as Record<string, { institucion: string; tutor: string; orientacion: string; students: StudentForReview[] }>);

      const handleCopyToClipboard = (students: StudentForReview[]) => {
          const tsv = students.map(s => [
              s.apellido, s.nombre, s.dni, s.legajo, 'Estudiante', s.lugar, s.duracion
          ].join('\t')).join('\n');

          navigator.clipboard.writeText(tsv).then(() => {
              setToastInfo({ message: 'Datos de la tabla copiados.', type: 'success' });
          }).catch(err => {
              console.error('Failed to copy data: ', err);
              setToastInfo({ message: 'Error al copiar los datos.', type: 'error' });
          });
      };

      const handleDownloadBlankInsurance = async (institutionName: string) => {
          if (!blankTemplateUrl) {
              showModal('Plantilla no Encontrada', `No se encontró una plantilla de seguro. Por favor, asegúrese de que esté subida al registro '${TEMPLATE_PPS_NAME}' en Airtable.`);
              return;
          }
          
          try {
              setToastInfo({ message: `Iniciando descarga de plantilla para '${institutionName}'...`, type: 'success' });
              const response = await fetch(blankTemplateUrl);
              if (!response.ok) {
                  throw new Error(`Error del servidor: ${response.statusText}`);
              }
              const blob = await response.blob();
      
              const safeFileName = institutionName.replace(/[\\/?*[\]]/g, "").substring(0, 100);
              const fileName = `Seguro - ${safeFileName}.xlsx`;
      
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
          } catch (e: any) {
              console.error('Error downloading insurance template:', e);
              showModal('Error de Descarga', e.message || 'No se pudo descargar la plantilla del seguro. Verifique la consola para más detalles.');
          }
      };
      
        const handleSendEmail = (group: { institucion: string; students: StudentForReview[] }) => {
            if (group.students.length === 0) return;

            const mailToSubject = `Reporte de Seguro - ${group.institucion}`;
            const mailToBody = `Hola Sergio,\n\nTe adjunto el seguro de la PPS.\n\nSaludos!`;
            const mailtoLink = `mailto:${EMAIL_SEGUROS}?subject=${encodeURIComponent(mailToSubject)}&body=${encodeURIComponent(mailToBody)}`;
            
            window.location.href = mailtoLink;
        };


      return (
          <>
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Paso 2: Generar Documentación</h3>
                      <p className="text-slate-600 dark:text-slate-400 max-w-2xl mt-1">Para cada grupo, descargue la plantilla del seguro y copie los datos de los alumnos para pegarlos en el archivo.</p>
                  </div>
                  <button onClick={() => setStep('selection')} className="bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-sm border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2">
                      <span className="material-icons !text-base">arrow_back</span>
                      <span>Volver</span>
                  </button>
              </div>

              {studentsForReview.length === 0 ? (
                   <EmptyState icon="group_off" title="Sin Estudiantes para Revisar" message="No se encontraron estudiantes en las convocatorias seleccionadas." />
              ) : (
                <div className="space-y-8">
                  {Object.values(groupedStudents).map((group: any, index) => (
                      <Card key={index} className="animate-fade-in-up" style={{animationDelay: `${index * 100}ms`}} title={group.institucion} description={`Tutor: ${group.tutor} - Orientación: ${group.orientacion}`}>
                          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex flex-col sm:flex-row gap-3">
                                  <button onClick={() => handleDownloadBlankInsurance(group.institucion)} className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md hover:bg-emerald-700">
                                      <span className="material-icons !text-base">download</span>
                                      <span>Descargar Plantilla</span>
                                  </button>
                                  <button onClick={() => handleCopyToClipboard(group.students)} className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-sm border border-slate-300 dark:border-slate-600 transition-colors shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600">
                                      <span className="material-icons !text-base">content_copy</span>
                                      <span>Copiar Datos ({group.students.length})</span>
                                  </button>
                                   <button onClick={() => handleSendEmail(group)} className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-sm border border-slate-300 dark:border-slate-600 transition-colors shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600">
                                      <span className="material-icons !text-base">send</span>
                                      <span>Enviar por Correo</span>
                                  </button>
                              </div>
                          </div>
                      </Card>
                  ))}
                  <div className="flex justify-end pt-4">
                      <button onClick={handleGenerateSelectionExcel} className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md hover:bg-indigo-700">
                          <span className="material-icons !text-base">download_for_offline</span>
                          <span>Generar Excel de Selección</span>
                      </button>
                  </div>
                </div>
              )}
          </>
      );
    };

    return (
        <Card title="Generador de Seguros" icon="shield">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
                {step === 'selection' ? renderSelectionStep() : renderReviewStep()}
            </div>
        </Card>
    );
};

export default SeguroGenerator;