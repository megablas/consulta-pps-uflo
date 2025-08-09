import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fetchAirtableData } from '../services/airtableService';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { Convocatoria, ConvocatoriaFields, EstudianteFields } from '../types';
import {
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS,
    FIELD_DIRECCION_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Checkbox from './Checkbox';
import Toast from './Toast';
import { splitNameWithAI } from '../services/aiService';

interface SeguroGeneratorProps {
    showModal: (title: string, message: string) => void;
}

type StudentForReview = {
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
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
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
                FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
            ],
            `AND({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}} != '', {${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}} = 'Seleccionado')`,
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
            const studentIdToIndividualConvMap = new Map<string, Convocatoria>();
            allIndividualConvocatorias.forEach(individualConv => {
                const groupKey = [individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS], individualConv[FIELD_FECHA_INICIO_CONVOCATORIAS]].join('||');
                // Only consider records from the user-selected groups
                if (selectedConvocatorias.has(groupKey)) {
                    (individualConv[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []).forEach(studentId => {
                        studentIdToIndividualConvMap.set(studentId, individualConv);
                    });
                }
            });

            const formula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
            const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_NOMBRE_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES], formula
            );
            if (studentError) throw new Error(`Error al obtener datos de estudiantes: ${typeof studentError.error === 'string' ? studentError.error : studentError.error.message}`);
            
            const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));
            
            const studentsToReview = studentIds.map((studentId) => {
                const student = studentMap.get(studentId);
                const individualConv = studentIdToIndividualConvMap.get(studentId);
                if (!student || !individualConv) return null;

                const fullName = student?.[FIELD_NOMBRE_ESTUDIANTES] || '';
                let nombre = student[FIELD_NOMBRE_SEPARADO_ESTUDIANTES] || '';
                let apellido = student[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] || '';
                
                if (!nombre || !apellido) {
                    const split = simpleNameSplit(fullName);
                    nombre = split.nombre;
                    apellido = split.apellido;
                }

                const orientacionRaw = individualConv[FIELD_ORIENTACION_CONVOCATORIAS] || '';
                const tutores = new Set<string>();
                 orientacionRaw.split(',').map(o => normalizeStringForComparison(o.trim())).forEach(o => {
                    if (o === 'clinica') tutores.add('Selva Estrella');
                    else if (o === 'educacional') tutores.add('Franco Pedraza');
                    else if (o === 'laboral' || o === 'comunitaria') tutores.add('Cynthia Rossi');
                 });
                
                const periodoValue = `Del ${formatDate(individualConv[FIELD_FECHA_INICIO_CONVOCATORIAS])} al ${formatDate(individualConv[FIELD_FECHA_FIN_CONVOCATORIAS])}`;
                const horarioValue = individualConv[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'N/A';
                const direccionValue = individualConv[FIELD_DIRECCION_CONVOCATORIAS] || 'N/A';
                
                return {
                    studentId, nombre, apellido,
                    dni: student[FIELD_DNI_ESTUDIANTES] || 'N/A',
                    legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                    correo: student[FIELD_CORREO_ESTUDIANTES] || 'N/A',
                    telefono: formatPhoneNumber(student[FIELD_TELEFONO_ESTUDIANTES]),
                    institucion: individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS] || 'N/A',
                    direccion: direccionValue,
                    periodo: periodoValue,
                    horario: horarioValue,
                    lugar: `${individualConv[FIELD_NOMBRE_PPS_CONVOCATORIAS] || ''} - ${direccionValue}`,
                    duracion: `Período: ${periodoValue}. Horario: ${horarioValue}`,
                    tutor: tutores.size > 0 ? Array.from(tutores).join(', ') : 'N/A',
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
    
    const handleGenerateExcel = () => {
        setIsLoading(true);
        setLoadingMessage('Construyendo archivo Excel...');
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
                const firstStudent = group[0];
                const wsData: (string | number | Date | null)[][] = [
                    ['ASEGURADO UNIVERSIDAD DE FLORES'],
                    ['INFORME DE ACTIVIDAD: PPS Presencial'],
                    [`Orientación: ${firstStudent.tutor}`],
                    [`Institución: ${firstStudent.institucion}`],
                    [`Tutor Institucional: ${firstStudent.tutor}`],
                    ['Tramitado por: Lic. Rivera Blas'],
                    [],
                    ['APELLIDO', 'NOMBRE', 'DNI', 'LEGAJO', 'CARGO', 'LUGAR (Nombre-Dirección)', 'DURACION DE LA ACTIVIDAD (Período, días y franja horaria)']
                ];
                
                group.forEach(student => {
                    wsData.push([student.apellido, student.nombre, student.dni, student.legajo, 'Estudiante', student.lugar, student.duracion]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!merges'] = [0,1,2,3,4,5].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
                ws['!cols'] = [ {wch:20}, {wch:25}, {wch:12}, {wch:12}, {wch:15}, {wch:45}, {wch:70} ];
                const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "FFE0E0E0" } }};
                wsData[7].forEach((_, col) => {
                    const cellRef = XLSX.utils.encode_cell({r: 7, c: col});
                    if(ws[cellRef]) ws[cellRef].s = headerStyle;
                });
                
                let baseSheetName = institucion.replace(/[\\/?*[\]]/g, "").substring(0, 25);
                XLSX.utils.book_append_sheet(wb, ws, baseSheetName);
            }

            const ppsName = Array.from(new Set(studentsForReview.map(s => s.institucion)))
                                 .join(' & ')
                                 .replace(/[\\/?*[\]]/g, "")
                                 .substring(0, 100);
            const fileName = `Seguro (${ppsName || 'PPS'}).xlsx`;
            XLSX.writeFile(wb, fileName);
            setToastInfo({ message: 'Excel para seguro generado exitosamente.', type: 'success' });
        } catch (e: any) {
            showModal('Error al Generar Excel', e.message || 'Ocurrió un error inesperado.');
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

    const handleUpdateStudentField = (studentId: string, field: keyof StudentForReview, value: string) => {
        setStudentsForReview(prev => prev.map(s => {
            if (s.studentId === studentId) {
                const updatedStudent = { ...s, [field]: value };
    
                if (field === 'direccion') {
                    updatedStudent.lugar = `${updatedStudent.institucion} - ${value}`;
                }
                if (field === 'horario' || field === 'periodo') {
                    updatedStudent.duracion = `Período: ${updatedStudent.periodo}. Horario: ${updatedStudent.horario}`;
                }
                
                return updatedStudent;
            }
            return s;
        }));
    };

    const handleRemoveStudent = (studentId: string) => {
        setStudentsForReview(prev => prev.filter(s => s.studentId !== studentId));
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
        <>
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800">Paso 1: Seleccionar Convocatorias</h3>
                <p className="text-slate-600 max-w-xl mt-1">Seleccione una o más de las últimas 5 convocatorias para generar los reportes.</p>
            </div>

            {isLoading && !loadingMessage.includes('convocatorias') ? null : (isLoading ? <Loader /> : null)}
            
            {!isLoading && convocatorias.length === 0 && (
                <EmptyState icon="event_busy" title="Sin Convocatorias" message="No se encontraron convocatorias con estudiantes seleccionados." />
            )}

            {!isLoading && convocatorias.length > 0 && (
                <div className="border rounded-lg overflow-x-auto border-slate-200/70 bg-white shadow-md">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-100/70 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4 w-16">
                                    <Checkbox id="select-all" name="select-all" checked={selectedConvocatorias.size > 0 && selectedConvocatorias.size === convocatorias.length} onChange={() => setSelectedConvocatorias(selectedConvocatorias.size === convocatorias.length ? new Set() : new Set(convocatorias.map(c => c.id)))} label="" />
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs">Institución</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-600 uppercase text-xs">Nº Estudiantes</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-600 uppercase text-xs">Período</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {convocatorias.map((convocatoria) => (
                                <tr key={convocatoria.id} className="transition-colors duration-200 odd:bg-white even:bg-slate-50/50 hover:!bg-blue-50/50">
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
                <button onClick={handleProceedToReview} disabled={isProceedDisabled} className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading ? (
                        <>
                            <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                            <span>{loadingMessage || 'Procesando...'}</span>
                        </>
                    ) : (
                        <>
                            <span>Ir a Revisión</span>
                            <span className="material-icons">arrow_forward</span>
                        </>
                    )}
                </button>
            </div>
        </>
    );

    const renderReviewStep = () => {
        const institutions = Array.from(new Set(studentsForReview.map(s => s.institucion))).join(', ');
        const mailToSubject = encodeURIComponent(`Reporte de Seguro - ${institutions}`);
        const mailToBody = encodeURIComponent(
            `Hola Sergio,

Te adjunto el seguro de la PPS.

Saludos!`
        );
        const mailToLink = `mailto:mesadeayuda.patagonia@uflouniversidad.edu.ar?subject=${mailToSubject}&body=${mailToBody}`;

        return (
        <>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Paso 2: Revisar y Corregir</h3>
                    <p className="text-slate-600 max-w-2xl mt-1">Verifica los datos. Todos los campos son editables. Puedes eliminar estudiantes antes de generar el reporte final.</p>
                </div>
                <button onClick={() => setStep('selection')} className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg text-sm border border-slate-300 transition-colors flex items-center gap-2">
                    <span className="material-icons">arrow_back</span>
                    <span>Volver</span>
                </button>
            </div>
            
            {studentsForReview.length === 0 ? (
                 <EmptyState icon="group_off" title="Sin Estudiantes para Revisar" message="No se encontraron estudiantes en las convocatorias seleccionadas." />
            ) : (
                <div className="border rounded-lg overflow-x-auto border-slate-200/70 bg-white shadow-md">
                    <table className="w-full min-w-[1400px]">
                        <thead className="bg-slate-100/70 border-b-2 border-slate-200 sticky top-0 z-20">
                            <tr>
                                <th className="sticky left-0 z-10 bg-inherit px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-40">Apellido</th>
                                <th className="sticky left-40 z-10 bg-inherit px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-40">Nombre</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-32">DNI</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-28">Legajo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-52">Correo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-40">Teléfono</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-64">Dirección</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase text-xs w-52">Horario</th>
                                <th className="p-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                           {studentsForReview.map((student, index) => (
                                <tr key={student.studentId} className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:!bg-blue-50/50`}>
                                    <td className="sticky left-0 z-[1] p-2 align-middle w-40 bg-inherit"><input type="text" value={student.apellido} onChange={(e) => handleUpdateStudentField(student.studentId, 'apellido', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="sticky left-40 z-[1] p-2 align-middle w-40 bg-inherit"><input type="text" value={student.nombre} onChange={(e) => handleUpdateStudentField(student.studentId, 'nombre', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-32"><input type="text" value={student.dni} onChange={(e) => handleUpdateStudentField(student.studentId, 'dni', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-28"><input type="text" value={student.legajo} onChange={(e) => handleUpdateStudentField(student.studentId, 'legajo', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-52"><input type="email" value={student.correo} onChange={(e) => handleUpdateStudentField(student.studentId, 'correo', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-40"><input type="tel" value={student.telefono} onChange={(e) => handleUpdateStudentField(student.studentId, 'telefono', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-64"><input type="text" value={student.direccion} onChange={(e) => handleUpdateStudentField(student.studentId, 'direccion', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle w-52"><input type="text" value={student.horario} onChange={(e) => handleUpdateStudentField(student.studentId, 'horario', e.target.value)} className="w-full bg-white text-slate-900 text-sm rounded-md border-slate-300 p-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"/></td>
                                    <td className="p-2 align-middle text-center">
                                        <button onClick={() => handleRemoveStudent(student.studentId)} className="p-2 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors" aria-label={`Quitar a ${student.nombre}`}>
                                            <span className="material-icons">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-4">
                <button 
                    onClick={handleGenerateSelectionExcel} 
                    disabled={isLoading || studentsForReview.length === 0} 
                    className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                     <span className="material-icons">list_alt</span>
                     <span>Generar Lista (Institución)</span>
                </button>
                <button 
                    onClick={handleGenerateExcel} 
                    disabled={isLoading || studentsForReview.length === 0} 
                    className="w-full sm:w-auto bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                     {isLoading && loadingMessage.includes('Excel') ? (
                        <>
                            <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                            <span>{loadingMessage}</span>
                        </>
                    ) : (
                        <>
                            <span className="material-icons">download</span>
                            <span>Generar Excel (Seguro)</span>
                        </>
                    )}
                </button>
                <a
                    href={mailToLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full sm:w-auto text-center bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center gap-2 ${
                        (isLoading || studentsForReview.length === 0) 
                        ? 'bg-slate-400 cursor-not-allowed opacity-50 pointer-events-none' 
                        : 'hover:bg-slate-800'
                    }`}
                    aria-disabled={isLoading || studentsForReview.length === 0}
                >
                    <span className="material-icons">email</span>
                    <span>Enviar Correo (Seguro)</span>
                </a>
            </div>
        </>
    );
    }

    return (
        <div className="animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mb-6">
                 <h2 className="text-2xl font-bold text-slate-800">Generador de Reportes para Seguro</h2>
            </div>
            
            {step === 'selection' ? renderSelectionStep() : renderReviewStep()}
        </div>
    );
};

export default SeguroGenerator;