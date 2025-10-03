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
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_FECHA,
    CONFERENCE_SHIFTS_BY_DAY,
    Orientacion,
    JORNADA_BLOCK_MAPPING,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_INSTITUCION_LINK_PRACTICAS,
    FIELD_ASISTENCIA_CONFIRMADA_JORNADA,
} from '../constants';
import { formatDate } from '../utils/formatters';
import type { PracticaFields, EstudianteFields, AsistenciaJornadaFields, AsistenciaJornada } from '../types';

interface StudentToAccredit {
    studentId: string;
    studentInfo: { legajo: string; nombre: string; };
    totalAttendances: number;
    totalHours: number; // The hours to be credited
    asistenciaIds: string[];
    isEligible: boolean;
    hasFullAttendance: boolean;
    attendedActivities: { name: string; id: string; date?: string; }[];
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
        // Fetch all attendances; filtering for pending vs accredited will happen client-side.
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

        const confirmedAttendances = studentAsistencias.filter(a => a[FIELD_ASISTENCIA_CONFIRMADA_JORNADA] === true);

        const shiftAttendance: { [key: string]: { required: number, attendedUniqueIds: Set<string> } } = {};
        CONFERENCE_SHIFTS_BY_DAY.forEach(d => d.shifts.forEach(s => {
            shiftAttendance[s.shift_id] = { required: s.activities.length, attendedUniqueIds: new Set() };
        }));

        confirmedAttendances.forEach(asistencia => {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            if (!moduleId) return;

            const shiftId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
            if (shiftId && shiftAttendance[shiftId]) {
                shiftAttendance[shiftId].attendedUniqueIds.add(moduleId);
            }
        });

        let completedShiftCount = 0;
        for (const shiftId in shiftAttendance) {
            const shift = shiftAttendance[shiftId];
            const attendedCount = shift.attendedUniqueIds.size;
            if (attendedCount > 0 && attendedCount >= shift.required) {
                completedShiftCount++;
            }
        }

        const totalHours = completedShiftCount * 5;
        const isEligible = completedShiftCount > 0;
        const hasFullAttendance = completedShiftCount === totalConferenceShifts;
        
        // Only include students who have at least one confirmed attendance.
        if (confirmedAttendances.length > 0) {
            finalStudentList.push({
                studentId,
                studentInfo,
                totalAttendances: confirmedAttendances.length,
                totalHours,
                asistenciaIds: studentAsistencias.map(a => a.id),
                isEligible,
                hasFullAttendance,
                attendedActivities: studentAsistencias.map(a => ({
                    id: a.id,
                    name: (a[FIELD_ASISTENCIA_MODULO_NOMBRE] as string || 'Actividad') + (a[FIELD_ASISTENCIA_CONFIRMADA_JORNADA] ? ' ✓' : ''),
                    date: a[FIELD_ASISTENCIA_FECHA] as string | undefined,
                })),
            });
        }
    }

    return {
        students: finalStudentList.sort((a, b) => a.studentInfo.nombre.localeCompare(b.studentInfo.nombre)),
        conferenceLaunchId,
        conferenceInstitutionId,
    };
};

const StudentAccreditationCard: React.FC<{
    student: StudentToAccredit;
    onAccredit: (student: StudentToAccredit) => void;
    isAccrediting: boolean;
    onDeleteAll: (asistenciaIds: string[]) => void;
    isDeleting: boolean;
}> = ({ student, onAccredit, isAccrediting, onDeleteAll, isDeleting }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { isEligible, hasFullAttendance, totalAttendances, totalHours } = student;

    return (
        <Card className={`bg-white dark:bg-slate-800/80 transition-all ${!isEligible ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{student.studentInfo.nombre}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.studentInfo.legajo}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
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
                        <p className="font-black text-2xl text-blue-600 dark:text-blue-400">{totalHours}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Horas a acreditar</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2">
                        {isExpanded ? 'Ocultar' : 'Detalle'}
                    </button>
                    <button
                        onClick={() => onDeleteAll(student.asistenciaIds)}
                        disabled={isAccrediting || isDeleting}
                        className="bg-rose-100 text-rose-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50 hover:bg-rose-200 dark:hover:bg-rose-800/50 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                         {isDeleting ? <div className="w-4 h-4 border-2 border-rose-400/50 border-t-rose-500 rounded-full animate-spin"/> : <span className="material-icons !text-base">delete</span>}
                         {isDeleting ? 'Eliminando' : 'Eliminar Asistencias'}
                    </button>
                    <div className="relative group/tooltip">
                        <button
                            onClick={() => onAccredit(student)}
                            disabled={isAccrediting || !isEligible || isDeleting}
                            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                        >
                            {isAccrediting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">add_task</span>}
                            {isAccrediting ? 'Acreditando' : 'Acreditar'}
                        </button>
                        {!isEligible && (
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none" role="tooltip">
                                No completó ningún turno
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {!isEligible && (
                 <div className="mt-4 p-2 text-center text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-md border border-amber-200 dark:border-amber-700/50">
                    Este estudiante no completó ningún turno de forma íntegra para acreditar horas.
                </div>
            )}

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/80 animate-fade-in-up" style={{ animationDuration: '300ms' }}>
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Actividades Registradas (✓ = Confirmada):</h4>
                     <ul className="list-disc list-inside pl-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {student.attendedActivities.map(asistencia => (
                            <li key={asistencia.id}>{asistencia.name}</li>
                        ))}
                    </ul>
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
             const studentsMap = new Map(studentsRes.map(r => [r.id, r.fields]));

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
                    studentInfo: studentInfo as { legajo: string, nombre: string },
                    accreditedHours: practice.fields.horasRealizadas || 0,
                    asistenciaIds: studentAsistenciaIds,
                };
            }).filter((s): s is AccreditedStudent => s !== null).sort((a,b) => a!.studentInfo.nombre.localeCompare(b!.studentInfo.nombre));

            return accreditedStudentsResult;
        },
        enabled: !!pendingData?.conferenceLaunchId
    });

    const trulyPendingStudents = useMemo(() => {
        if (!pendingData?.students || !accreditedData) return [];
        const accreditedStudentIds = new Set(accreditedData.map(s => s.studentId));
        return pendingData.students.filter(s => !accreditedStudentIds.has(s.studentId));
    }, [pendingData, accreditedData]);

    const accreditationMutation = useMutation({
        mutationFn: async (studentToAccredit: StudentToAccredit) => {
            const { conferenceLaunchId, conferenceInstitutionId } = pendingData!;
            if (!conferenceLaunchId || !conferenceInstitutionId) throw new Error("ID del lanzamiento o institución maestro no disponible.");
            if (!studentToAccredit.isEligible) throw new Error("El estudiante no cumple los requisitos para la acreditación.");
            
            const practiceStartDate = '2025-10-07';
            const practiceEndDate = '2025-10-09';
            
            const newPracticeData = {
                estudianteLink: [studentToAccredit.studentId],
                lanzamientoVinculado: [conferenceLaunchId],
                institucionLink: [conferenceInstitutionId],
                horasRealizadas: studentToAccredit.totalHours,
                especialidad: Orientacion.COMUNITARIA,
                estado: 'Finalizada',
                fechaInicio: practiceStartDate,
                fechaFin: practiceEndDate,
            };
            await db.practicas.create(newPracticeData);
        },
        onMutate: (studentToAccredit: StudentToAccredit) => {
            setAccreditingStudentId(studentToAccredit.studentId);
        },
        onSuccess: (_, studentToAccredit: StudentToAccredit) => {
            setToastInfo({ message: `Asistencia de ${studentToAccredit.studentInfo.nombre} acreditada con éxito.`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditation'] });
             queryClient.invalidateQueries({ queryKey: ['accreditedJornadaStudents'] });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error al acreditar: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setAccreditingStudentId(null);
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
        { id: 'pending', label: `Pendientes (${trulyPendingStudents?.length ?? 0})` },
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
                    trulyPendingStudents && trulyPendingStudents.length > 0 ? (
                        <div className="space-y-4">
                            {trulyPendingStudents.map(student => (
                                <StudentAccreditationCard
                                    key={student.studentId}
                                    student={student}
                                    onAccredit={accreditationMutation.mutate}
                                    isAccrediting={accreditingStudentId === student.studentId}
                                    onDeleteAll={deletePendingMutation.mutate}
                                    isDeleting={deletingPendingId === student.studentId}
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