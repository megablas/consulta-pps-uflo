import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import Card from './Card';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { CONFERENCE_PPS_NAME, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES } from '../constants';
import { getEspecialidadClasses, formatDate, parseToUTCDate } from '../utils/formatters';
import type { PracticaFields } from '../types';

interface GroupedAttendance {
    totalHours: number;
    attendanceIds: string[];
    dates: string[];
}

interface StudentToAccredit {
    studentId: string;
    studentInfo: { legajo: string; nombre: string; };
    groupedByOrientation: Map<string, GroupedAttendance>;
}

// Data fetching and processing logic
const fetchPendingData = async () => {
    // 1. Fetch all unprocessed attendance records
    const asistencias = await db.asistenciasJornada.getAll({
        filterByFormula: `NOT({Procesado})`,
    });

    if (asistencias.length === 0) {
        return { studentsToAccredit: [], conferenceLaunchId: null, conferenceInstitutionId: null };
    }

    // 2. Fetch the master launch record for the conference
    const conferenceLaunchRecord = await db.lanzamientos.get({
        filterByFormula: `{Nombre PPS} = '${CONFERENCE_PPS_NAME}'`,
        maxRecords: 1,
    });
    const conferenceLaunchId = conferenceLaunchRecord.length > 0 ? conferenceLaunchRecord[0].id : null;
    
    // 3. Get all unique student IDs from attendance records
    const studentIds = [...new Set(asistencias.flatMap(a => a.fields.estudianteLink || []))];
    if (studentIds.length === 0) {
        return { studentsToAccredit: [], conferenceLaunchId, conferenceInstitutionId: null };
    }
    
    // 4. Fetch details for these students
    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const studentsRes = await db.estudiantes.getAll({
        filterByFormula: studentFormula,
        fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES],
    });
    const studentsMap = new Map(studentsRes.map(r => [r.id, { legajo: r.fields.legajo || 'N/A', nombre: r.fields.nombre || 'N/A' }]));

    // 5. Group attendance by student, then by orientation
    const studentsToAccreditMap = new Map<string, StudentToAccredit>();
    asistencias.forEach(asistencia => {
        const studentId = (asistencia.fields.estudianteLink || [])[0];
        if (!studentId || !studentsMap.has(studentId)) return;
        
        if (!studentsToAccreditMap.has(studentId)) {
            studentsToAccreditMap.set(studentId, {
                studentId,
                studentInfo: studentsMap.get(studentId)!,
                groupedByOrientation: new Map(),
            });
        }
        
        const studentData = studentsToAccreditMap.get(studentId)!;
        const orientation = asistencia.fields.orientacion || 'General';
        
        if (!studentData.groupedByOrientation.has(orientation)) {
            studentData.groupedByOrientation.set(orientation, { totalHours: 0, attendanceIds: [], dates: [] });
        }
        
        const orientationGroup = studentData.groupedByOrientation.get(orientation)!;
        orientationGroup.totalHours += asistencia.fields.horas || 0;
        orientationGroup.attendanceIds.push(asistencia.id);
        if (asistencia.fields.fecha) {
            orientationGroup.dates.push(formatDate(asistencia.fields.fecha));
        }
    });

    return {
        studentsToAccredit: Array.from(studentsToAccreditMap.values()),
        conferenceLaunchId,
    };
};


const StudentAccreditationCard: React.FC<{
    student: StudentToAccredit;
    onAccredit: (student: StudentToAccredit) => void;
    isAccrediting: boolean;
}> = ({ student, onAccredit, isAccrediting }) => {
    return (
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{student.studentInfo.nombre}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.studentInfo.legajo}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                    {Array.from(student.groupedByOrientation.entries()).map(([orientation, data]) => {
                        const visuals = getEspecialidadClasses(orientation);
                        return (
                            <span key={orientation} className={`${visuals.tag} shadow-sm`} title={`Fechas: ${[...new Set(data.dates)].join(', ')}`}>
                                {orientation}: {data.totalHours} hs
                            </span>
                        );
                    })}
                </div>
            </div>
            <button
                onClick={() => onAccredit(student)}
                disabled={isAccrediting}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
            >
                {isAccrediting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">add_task</span>}
                Acreditar
            </button>
        </div>
    );
};


const AcreditacionJornada: React.FC = () => {
    const queryClient = useQueryClient();
    const [accreditingStudentId, setAccreditingStudentId] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['pendingAccreditations'],
        queryFn: fetchPendingData,
    });
    
    const accreditationMutation = useMutation({
        mutationFn: async (student: StudentToAccredit) => {
            if (!data?.conferenceLaunchId) {
                throw new Error("No se encontró el ID del lanzamiento de la conferencia.");
            }

            const newPractices: Partial<PracticaFields>[] = [];
            let allAttendanceIdsToUpdate: string[] = [];

            for (const [orientation, groupData] of student.groupedByOrientation.entries()) {
                newPractices.push({
                    estudianteLink: [student.studentId],
                    lanzamientoVinculado: [data.conferenceLaunchId],
                    horasRealizadas: groupData.totalHours,
                    especialidad: orientation,
                    estado: 'Finalizada',
                    nota: 'Aprobado',
                    fechaInicio: parseToUTCDate(groupData.dates[0])?.toISOString().split('T')[0],
                    fechaFin: parseToUTCDate(groupData.dates[groupData.dates.length - 1])?.toISOString().split('T')[0],
                });
                allAttendanceIdsToUpdate = [...allAttendanceIdsToUpdate, ...groupData.attendanceIds];
            }

            // Batch create practices
            const practiceCreationPromises = newPractices.map(p => db.practicas.create(p));
            await Promise.all(practiceCreationPromises);

            // Batch update attendance records
            const attendanceRecordsToUpdate = allAttendanceIdsToUpdate.map(id => ({ id, fields: { procesado: true } }));
            await db.asistenciasJornada.updateMany(attendanceRecordsToUpdate);
        },
        onMutate: (student: StudentToAccredit) => {
            setAccreditingStudentId(student.studentId);
        },
        onSuccess: (_, student: StudentToAccredit) => {
            setToastInfo({ message: `Horas acreditadas para ${student.studentInfo.nombre}.`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pendingAccreditations'] });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setAccreditingStudentId(null);
        }
    });

    return (
        <Card title="Acreditación de Horas por Jornada" icon="military_tech">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                {isLoading && <Loader />}
                {error && <EmptyState icon="error" title="Error" message={error.message} />}
                
                {!isLoading && data && (
                    data.studentsToAccredit.length > 0 ? (
                        <div className="space-y-4">
                            {data.studentsToAccredit.map(student => (
                                <StudentAccreditationCard
                                    key={student.studentId}
                                    student={student}
                                    onAccredit={accreditationMutation.mutate}
                                    isAccrediting={accreditingStudentId === student.studentId}
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
            </div>
        </Card>
    );
};

export default AcreditacionJornada;