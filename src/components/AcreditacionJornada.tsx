import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import Card from './Card';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import SubTabs from './SubTabs';
import { 
    CONFERENCE_PPS_NAME, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_FECHA,
    FIELD_ASISTENCIA_CONFIRMADA_JORNADA,
    CONFERENCE_SHIFTS_BY_DAY,
    JORNADA_BLOCK_MAPPING,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_INSTITUCION_LINK_PRACTICAS,
} from '../constants';
import { formatDate } from '../utils/formatters';
import type { PracticaFields, EstudianteFields, AsistenciaJornadaFields, AsistenciaJornada, AirtableRecord } from '../types';
// FIX: Import Orientacion enum from types.ts as it is used as a value, not just a type.
import { Orientacion } from '../types';

interface StudentToAccredit {
    studentId: string;
    studentInfo: { legajo: string; nombre: string; };
    totalAttendances: number;
    totalHours: number; // The hours to be credited from ATTENDANCE
    inscriptionHours: number; // The hours to be credited from INSCRIPTION
    asistenciaIds: string[];
    isEligible: boolean;
    hasFullAttendance: boolean;
    attendedActivities: (AsistenciaJornada & { id: string })[];
}

interface AccreditedStudent {
    practicaId: string;
    studentId: string;
    studentInfo: { legajo: string; nombre: string; };
    accreditedHours: number;
    asistenciaIds: string[];
}

const fetchPendingDataForAccreditation = async (): Promise<{ students: StudentToAccredit[], conferenceLaunchId: string | null, conferenceInstitutionId: string | null }> => {
    const totalConferenceShifts = CONFERENCE_SHIFTS_BY_DAY.flatMap(d => d.shifts).length;
    
    const [conferenceLaunchRecord, conferenceInstitutionRecord] = await Promise.all([
        db.lanzamientos.get({
            filterByFormula: `{Nombre PPS} = '${CONFERENCE_PPS_NAME}'`,
            maxRecords: 1,
        }),
        db.instituciones.get({
            filterByFormula: `{Nombre} = '${CONFERENCE_PPS_NAME}'`,
            maxRecords: 1,
        })
    ]);
    
    const conferenceLaunchId = conferenceLaunchRecord[0]?.id || null;
    const conferenceInstitutionId = conferenceInstitutionRecord[0]?.id || null;
    
    if (!conferenceLaunchId) throw new Error(`Registro maestro de LANZAMIENTO para "${CONFERENCE_PPS_NAME}" no encontrado. Asegúrese de que exista en la tabla 'Lanzamientos de PPS'.`);
    if (!conferenceInstitutionId) throw new Error(`Registro maestro de INSTITUCIÓN para "${CONFERENCE_PPS_NAME}" no encontrado. Asegúrese de que exista en la tabla 'Instituciones'.`);

    const asistenciasRes = await db.asistenciasJornada.getAll({
        fields: [
            FIELD_ASISTENCIA_ESTUDIANTE,
            FIELD_ASISTENCIA_MODULO_ID,
            FIELD_ASISTENCIA_MODULO_NOMBRE,
            FIELD_ASISTENCIA_FECHA,
            FIELD_ASISTENCIA_CONFIRMADA_JORNADA,
        ],
    });
    const asistencias = asistenciasRes.map(a => ({...a.fields, id: a.id}));

    if (asistencias.length === 0) {
        return { students: [], conferenceLaunchId, conferenceInstitutionId };
    }
    
    const studentIds = [...new Set(asistencias.flatMap(a => (a[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || []))];
    if (studentIds.length === 0) {
        return { students: [], conferenceLaunchId, conferenceInstitutionId };
    }
    
    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const studentsRes = await db.estudiantes.getAll({
        filterByFormula: studentFormula,
        fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES],
    });
    const studentsMap = new Map(studentsRes.map(r => [r.id, { legajo: r.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: r.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A' }]));

    const studentAttendancesMap = new Map<string, (AsistenciaJornadaFields & { id: string })[]>();
    for (const asistencia of asistencias) {
        const studentId = ((asistencia[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || [])[0];
        if (!studentId) continue;
        if (!studentAttendancesMap.has(studentId)) {
            studentAttendancesMap.set(studentId, []);
        }
        studentAttendancesMap.get(studentId)!.push(asistencia);
    }
    
    const finalStudentList: StudentToAccredit[] = [];
    for (const [studentId, studentAsistencias] of studentAttendancesMap.entries()) {
        const studentInfo = studentsMap.get(studentId);
        if (!studentInfo) continue;
        
        // Deduplicate activities based on module ID, prioritizing confirmed ones
        const uniqueActivities = new Map<string, (AsistenciaJornadaFields & { id: string })>();
        for (const asistencia of studentAsistencias) {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            if (!moduleId) continue;

            const existing = uniqueActivities.get(moduleId);
            // If there's no existing entry, or if the current one is confirmed and the existing isn't, replace it.
            if (!existing || (asistencia[FIELD_ASISTENCIA_CONFIRMADA_JORNADA] && !existing[FIELD_ASISTENCIA_CONFIRMADA_JORNADA])) {
                uniqueActivities.set(moduleId, asistencia);
            }
        }
        const deduplicatedAsistencias = Array.from(uniqueActivities.values());

        const confirmedAttendances = deduplicatedAsistencias.filter(a => a[FIELD_ASISTENCIA_CONFIRMADA_JORNADA] === true);

        if (confirmedAttendances.length === 0) {
            continue;
        }

        const attendanceShiftCounter: { [key: string]: { required: number, attendedUniqueIds: Set<string> } } = {};
        CONFERENCE_SHIFTS_BY_DAY.forEach(d => d.shifts.forEach(s => {
            attendanceShiftCounter[s.shift_id] = { required: s.activities.length, attendedUniqueIds: new Set() };
        }));

        confirmedAttendances.forEach(asistencia => {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            if (!moduleId) return;

            const shiftId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
            if (shiftId && attendanceShiftCounter[shiftId]) {
                attendanceShiftCounter[shiftId].attendedUniqueIds.add(moduleId);
            }
        });

        let completedAttendanceShifts = 0;
        for (const shiftId in attendanceShiftCounter) {
            const shift = attendanceShiftCounter[shiftId];
            if (shift.attendedUniqueIds.size > 0 && shift.attendedUniqueIds.size >= shift.required) {
                completedAttendanceShifts++;
            }
        }
        
        let attendanceHours = completedAttendanceShifts * 5;
        if (attendanceHours === 0 && confirmedAttendances.length > 0) {
            attendanceHours = 5;
        }
        
        const inscriptionShiftCounter: { [key: string]: { required: number, attendedUniqueIds: Set<string> } } = {};
        CONFERENCE_SHIFTS_BY_DAY.forEach(d => d.shifts.forEach(s => {
            inscriptionShiftCounter[s.shift_id] = { required: s.activities.length, attendedUniqueIds: new Set() };
        }));

        deduplicatedAsistencias.forEach(asistencia => {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            if (!moduleId) return;
            const shiftId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
            if (shiftId && inscriptionShiftCounter[shiftId]) {
                inscriptionShiftCounter[shiftId].attendedUniqueIds.add(moduleId);
            }
        });

        let completedInscriptionShifts = 0;
        for (const shiftId in inscriptionShiftCounter) {
            const shift = inscriptionShiftCounter[shiftId];
            if (shift.attendedUniqueIds.size > 0 && shift.attendedUniqueIds.size >= shift.required) {
                completedInscriptionShifts++;
            }
        }
        const inscriptionHours = completedInscriptionShifts * 5;

        const isEligible = attendanceHours > 0;
        const hasFullAttendance = completedAttendanceShifts === totalConferenceShifts;
        
        finalStudentList.push({
            studentId,
            studentInfo,
            totalAttendances: confirmedAttendances.length,
            totalHours: attendanceHours,
            inscriptionHours: inscriptionHours,
            asistenciaIds: studentAsistencias.map(a => a.id),
            isEligible,
            hasFullAttendance,
            attendedActivities: deduplicatedAsistencias,
        });
    }

    return {
        students: finalStudentList.sort((a, b) => a.studentInfo.nombre.localeCompare(b.studentInfo.nombre)),
        conferenceLaunchId,
        conferenceInstitutionId,
    };
};

interface StudentAccreditationCardProps {
    student: StudentToAccredit;
    onAccredit: (student: StudentToAccredit, hours: number) => void;
    isAccrediting: boolean;
    onDeleteAll: (asistenciaIds: string[]) => void;
    isDeleting: boolean;
    isAccredited: boolean;
    accreditedHours?: number;
    setToastInfo: (info: { message: string, type: 'success' | 'error' } | null) => void;
}


const StudentAccreditationCard: React.FC<StudentAccreditationCardProps> = ({ student, onAccredit, isAccrediting, onDeleteAll, isDeleting, isAccredited, accreditedHours, setToastInfo }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { hasFullAttendance, totalAttendances, totalHours, inscriptionHours } = student;

    const detailedBlocks = useMemo(() => {
        const studentRegisteredModuleIds = new Set(student.attendedActivities.map(a => a[FIELD_ASISTENCIA_MODULO_ID]));
        const studentConfirmedModuleIds = new Set(student.attendedActivities.filter(a => a[FIELD_ASISTENCIA_CONFIRMADA_JORNADA]).map(a => a[FIELD_ASISTENCIA_MODULO_ID]));

        return CONFERENCE_SHIFTS_BY_DAY.map(dayGroup => ({
            day: dayGroup.day,
            shifts: dayGroup.shifts.map(shift => {
                const requiredCount = shift.activities.length;
                let attendedCount = 0;
                let isRegisteredForShift = false;

                const activities = shift.activities.map(activity => {
                    const isRegistered = studentRegisteredModuleIds.has(activity.id);
                    const isAttended = studentConfirmedModuleIds.has(activity.id);
                    if (isRegistered) isRegisteredForShift = true;
                    if (isAttended) attendedCount++;
                    return { name: activity.name, isAttended, isRegistered };
                });

                let status: 'COMPLETADO' | 'INCOMPLETO' | 'AUSENTE' | 'NO INSCRIPTO';
                let statusClasses: string;

                if (!isRegisteredForShift) {
                    status = 'NO INSCRIPTO';
                    statusClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
                } else if (attendedCount >= requiredCount) {
                    status = 'COMPLETADO';
                    statusClasses = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
                } else if (attendedCount > 0) {
                    status = 'INCOMPLETO';
                    statusClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
                } else {
                    status = 'AUSENTE';
                    statusClasses = 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300';
                }

                return {
                    name: shift.name,
                    requiredCount,
                    attendedCount,
                    status,
                    statusClasses,
                    activities
                };
            })
        }));
    }, [student.attendedActivities]);
    
    const handleExport = () => {
        let report = `*Resumen de Asistencia - ${student.studentInfo.nombre} (${student.studentInfo.legajo})*\n\n`;
        report += `*Total de Asistencias Confirmadas:* ${totalAttendances}\n`;
        report += `*Horas por Inscripción (potencial):* ${inscriptionHours} hs\n`;
        report += `*Horas por Asistencia Efectiva:* ${totalHours} hs\n\n`;
        report += `*Detalle de Asistencia por Turno:*\n`;
    
        detailedBlocks.forEach(dayGroup => {
            report += `\n*${dayGroup.day}*\n`;
            dayGroup.shifts.forEach(shift => {
                if (shift.status !== 'NO INSCRIPTO') {
                    report += `- *${shift.name}:* ${shift.status} (Asistió a ${shift.attendedCount}/${shift.requiredCount})\n`;
                    shift.activities.forEach(activity => {
                        if (activity.isRegistered) {
                             report += `  - ${activity.name}: ${activity.isAttended ? 'Presente' : 'Ausente'}\n`;
                        }
                    });
                }
            });
        });
    
        navigator.clipboard.writeText(report).then(() => {
            setToastInfo({ message: 'Resumen de asistencia copiado.', type: 'success' });
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setToastInfo({ message: 'Error al copiar el resumen.', type: 'error' });
        });
    };

    return (
        <Card className={`bg-white dark:bg-slate-800/80 transition-all ${isAccredited ? 'border-emerald-300 dark:border-emerald-700' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{student.studentInfo.nombre}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.studentInfo.legajo}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                     {hasFullAttendance && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-300 ring-1 ring-yellow-200 dark:ring-yellow-500/30 inline-flex items-center gap-1.5">
                            <span className="material-icons !text-sm">star</span>
                            Asistencia Perfecta
                        </span>
                    )}
                    <div className="text-center">
                        <p className="font-black text-2xl text-slate-700 dark:text-slate-200">{totalAttendances}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Asistencias</p>
                    </div>
                    <div className="text-center">
                        <p className="font-black text-2xl text-purple-600 dark:text-purple-400">{inscriptionHours}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Horas por Inscripción</p>
                    </div>
                     <div className="text-center">
                        <p className="font-black text-2xl text-blue-600 dark:text-blue-400">{totalHours}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Horas por Asistencia</p>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2">
                        {isExpanded ? 'Ocultar' : 'Detalle'}
                    </button>
                    
                    {isAccredited ? (
                         <div className="bg-emerald-100 text-emerald-800 font-bold py-2 px-4 rounded-lg text-sm border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700/50 flex items-center gap-2">
                            <span className="material-icons !text-base">check_circle</span>
                            Acreditado con {accreditedHours}hs
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => onDeleteAll(student.asistenciaIds)}
                                disabled={isAccrediting || isDeleting}
                                className="bg-rose-100 text-rose-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50 hover:bg-rose-200 dark:hover:bg-rose-800/50 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <div className="w-4 h-4 border-2 border-rose-400/50 border-t-rose-500 rounded-full animate-spin"/> : <span className="material-icons !text-base">delete</span>}
                                {isDeleting ? 'Eliminando' : 'Eliminar Asistencias'}
                            </button>
                            
                            <button
                                onClick={() => onAccredit(student, inscriptionHours)}
                                disabled={isAccrediting || inscriptionHours === 0 || isDeleting}
                                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAccrediting ? '...' : `Acreditar Inscripción (${inscriptionHours}hs)`}
                            </button>
                            <button
                                onClick={() => onAccredit(student, totalHours)}
                                disabled={isAccrediting || totalHours === 0 || isDeleting}
                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                            >
                                {isAccrediting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">add_task</span>}
                                {isAccrediting ? 'Acreditando...' : `Acreditar Asistencia (${totalHours}hs)`}
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/80 animate-fade-in-up" style={{ animationDuration: '300ms' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {detailedBlocks.map(dayGroup => (
                            <div key={dayGroup.day} className="space-y-4">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{dayGroup.day}</h4>
                                {dayGroup.shifts.map(shift => (
                                    <div key={shift.name} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-slate-100">{shift.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Asistió a {shift.attendedCount} de {shift.requiredCount} actividades</p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${shift.statusClasses}`}>{shift.status}</span>
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                            {shift.activities.map((activity, i) => (
                                                <li key={i} className={`flex items-center gap-2 text-sm ${activity.isAttended ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    <span className={`material-icons !text-base ${activity.isAttended ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                        {activity.isAttended ? 'check_box' : 'check_box_outline_blank'}
                                                    </span>
                                                    <span className={!activity.isRegistered && !activity.isAttended ? 'line-through opacity-70' : ''}>
                                                        {activity.name}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <span className="material-icons !text-base">content_copy</span>
                            Copiar Resumen para Email
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}

const AccreditedStudentCard: React.FC<{
    student: AccreditedStudent;
    onDelete: (data: { practicaId: string; asistenciaIds: string[] }) => void;
    isDeleting: boolean;
}> = ({ student, onDelete, isDeleting }) => {
    return (
        <Card className="bg-white dark:bg-slate-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{student.studentInfo.nombre}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.studentInfo.legajo}</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-center">
                        <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400">{student.accreditedHours}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Horas acreditadas</p>
                    </div>
                    <button
                        onClick={() => onDelete({ practicaId: student.practicaId, asistenciaIds: student.asistenciaIds })}
                        disabled={isDeleting}
                        className="bg-rose-100 text-rose-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50 hover:bg-rose-200 dark:hover:bg-rose-800/50 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                    >
                        {isDeleting ? <div className="w-4 h-4 border-2 border-rose-400/50 border-t-rose-500 rounded-full animate-spin"/> : <span className="material-icons !text-base">delete_forever</span>}
                        {isDeleting ? 'Procesando' : 'Eliminar Acreditación'}
                    </button>
                </div>
            </div>
        </Card>
    )
};


const AcreditacionJornada: React.FC = () => {
    const queryClient = useQueryClient();
    const [accreditingStudentId, setAccreditingStudentId] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [deletingPracticaId, setDeletingPracticaId] = useState<string | null>(null);
    const [deletingPendingId, setDeletingPendingId] = useState<string | null>(null);

    const { data: pendingData, isLoading: isLoadingPending, error: pendingError } = useQuery({
        queryKey: ['pendingJornadaAccreditation'],
        queryFn: fetchPendingDataForAccreditation,
    });

    const { data: accreditedData, isLoading: isLoadingAccredited, error: accreditedError } = useQuery({
        queryKey: ['accreditedJornadaStudents', pendingData?.conferenceLaunchId],
        queryFn: async () => {
             const launchId = pendingData?.conferenceLaunchId;
             if (!launchId) return [];

             const practicesRes = await db.practicas.getAll({
                filterByFormula: `FIND('${launchId}', ARRAYJOIN({${FIELD_LANZAMIENTO_VINCULADO_PRACTICAS}}))`
             });

             const studentIds = practicesRes.map(p => (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0]).filter(Boolean);
             if (studentIds.length === 0) return [];
            
             const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
             const studentsRes = await db.estudiantes.getAll({
                filterByFormula: studentFormula,
                fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES],
             });
             // FIX: Correctly map students to ensure `studentInfo` has the required shape.
             const studentsMap = new Map(studentsRes.map(r => [r.id, {
                legajo: r.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                nombre: r.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Sin Nombre'
             }]));

             const asistenciasFormula = `OR(${studentIds.map(id => `FIND('${id}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}}))`).join(',')})`;
             const asistenciasRes = await db.asistenciasJornada.getAll({
                filterByFormula: asistenciasFormula
             });
            
             const accreditedStudentsResult = practicesRes.map(practice => {
                const studentId = (practice.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
                const studentInfo = studentId ? studentsMap.get(studentId) : null;
                if (!studentInfo) return null;

                const studentAsistenciaIds = asistenciasRes
                    .filter(a => ((a.fields[FIELD_ASISTENCIA_ESTUDIANTE] as string[] || [])[0]) === studentId)
                    .map(a => a.id);

                return {
                    practicaId: practice.id,
                    studentId: studentId,
                    studentInfo: studentInfo,
                    accreditedHours: practice.fields.horasRealizadas || 0,
                    asistenciaIds: studentAsistenciaIds,
                };
            }).filter((s): s is AccreditedStudent => s !== null).sort((a,b) => a!.studentInfo.nombre.localeCompare(b!.studentInfo.nombre));

            return accreditedStudentsResult;
        },
        enabled: !!pendingData?.conferenceLaunchId
    });

    const accreditedStudentIds = useMemo(() => {
        return new Set(accreditedData?.map(s => s.studentId) || []);
    }, [accreditedData]);
    
    const pendingStudentsToDisplay = useMemo(() => {
        if (!pendingData?.students) return [];
        return pendingData.students.filter(student => !accreditedStudentIds.has(student.studentId));
    }, [pendingData, accreditedStudentIds]);

    const accreditationMutation = useMutation({
        mutationFn: async ({ student, hours }: { student: StudentToAccredit, hours: number }) => {
            const { conferenceLaunchId, conferenceInstitutionId } = pendingData!;
            if (!conferenceLaunchId || !conferenceInstitutionId) throw new Error("ID del lanzamiento o institución maestro no disponible.");
            if (hours === 0) throw new Error("No se pueden acreditar 0 horas.");
            
            const practiceStartDate = '2025-10-07';
            const practiceEndDate = '2025-10-09';
            
            const newPracticeData = {
                estudianteLink: [student.studentId],
                lanzamientoVinculado: [conferenceLaunchId],
                institucionLink: [conferenceInstitutionId],
                horasRealizadas: hours,
                especialidad: Orientacion.COMUNITARIA,
                estado: 'Finalizada',
                fechaInicio: practiceStartDate,
                fechaFin: practiceEndDate,
            };
            await db.practicas.create(newPracticeData);
        },
        onMutate: async ({ student, hours }: { student: StudentToAccredit, hours: number }) => {
            setAccreditingStudentId(student.studentId);
        },
        onSuccess: (_, { student, hours }) => {
            setToastInfo({ message: `${hours}hs acreditadas a ${student.studentInfo.nombre} con éxito.`, type: 'success' });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error al acreditar: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setAccreditingStudentId(null);
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditation'] });
            queryClient.invalidateQueries({ queryKey: ['accreditedJornadaStudents'] });
        }
    });

    const revertAccreditationMutation = useMutation({
        mutationFn: async ({ practicaId, asistenciaIds }: { practicaId: string, asistenciaIds: string[] }) => {
            await db.practicas.delete(practicaId);
        },
        onMutate: ({ practicaId }) => {
            setDeletingPracticaId(practicaId);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Acreditación revertida con éxito.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditation'] });
            queryClient.invalidateQueries({ queryKey: ['accreditedJornadaStudents'] });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error al revertir: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setDeletingPracticaId(null);
        }
    });

    const deletePendingMutation = useMutation({
        mutationFn: async (asistenciaIds: string[]) => {
            const deletePromises = asistenciaIds.map(id => db.asistenciasJornada.delete(id));
            await Promise.all(deletePromises);
        },
        onMutate: (asistenciaIds: string[]) => {
            const student = pendingData?.students.find(s => s.asistenciaIds.includes(asistenciaIds[0]));
            if (student) setDeletingPendingId(student.studentId);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Asistencias pendientes eliminadas.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditation'] });
            queryClient.invalidateQueries({ queryKey: ['allAsistenciasJornada'] });
            queryClient.invalidateQueries({ queryKey: ['conferenceStudents'] });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error al eliminar: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setDeletingPendingId(null);
        }
    });

    const isLoading = isLoadingPending || isLoadingAccredited;
    const error = pendingError || accreditedError;

    const tabs = [
        { id: 'pending', label: `Gestión de Acreditación (${pendingStudentsToDisplay?.length ?? 0})` },
        { id: 'accredited', label: `Acreditados (${accreditedData?.length ?? 0})` },
    ];

    return (
        <Card 
            title="Acreditación de Asistencia de Jornada" 
            icon="military_tech"
            description="Revisa las asistencias agrupadas por estudiante y acredita sus horas de la jornada o revierte acreditaciones existentes."
        >
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                <div className="mb-6">
                    <SubTabs
                        tabs={tabs}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>
                
                {isLoading && <div className="p-8 flex justify-center"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error" message={error.message} />}
                
                {!isLoading && activeTab === 'pending' && (
                    pendingStudentsToDisplay && pendingStudentsToDisplay.length > 0 ? (
                        <div className="space-y-4">
                            {pendingStudentsToDisplay.map(student => (
                                <StudentAccreditationCard
                                    key={student.studentId}
                                    student={student}
                                    onAccredit={(s, h) => accreditationMutation.mutate({ student: s, hours: h })}
                                    isAccrediting={accreditingStudentId === student.studentId}
                                    onDeleteAll={deletePendingMutation.mutate}
                                    isDeleting={deletingPendingId === student.studentId}
                                    isAccredited={false}
                                    setToastInfo={setToastInfo}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState 
                            icon="task_alt"
                            title="Todo al día"
                            message="No hay asistencias pendientes de acreditar en este momento."
                        />
                    )
                )}

                {!isLoading && activeTab === 'accredited' && (
                     accreditedData && accreditedData.length > 0 ? (
                        <div className="space-y-4">
                            {accreditedData.map(student => (
                                <AccreditedStudentCard
                                    key={student.studentId}
                                    student={student}
                                    onDelete={revertAccreditationMutation.mutate}
                                    isDeleting={deletingPracticaId === student.practicaId}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState 
                            icon="history_off"
                            title="Sin Acreditaciones"
                            message="Aún no se ha acreditado la asistencia de ningún estudiante para esta jornada."
                        />
                    )
                )}
            </div>
        </Card>
    );
};

export default AcreditacionJornada;