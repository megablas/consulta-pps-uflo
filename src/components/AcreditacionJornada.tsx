import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import Card from './Card';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { CONFERENCE_PPS_NAME, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES } from '../constants';
import { getEspecialidadClasses } from '../utils/formatters';

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

    // 2. Get the master conference launch and institution records
    const [conferenceLaunch, conferenceInstitution] = await Promise.all([
        db.lanzamientos.get({
            filterByFormula: `{Nombre PPS} = '${CONFERENCE_PPS_NAME}'`,
            maxRecords: 1,
        }),
        db.instituciones.get({
            filterByFormula: `{Nombre} = '${CONFERENCE_PPS_NAME}'`,
            maxRecords: 1,
        })
    ]);

    if (conferenceLaunch.length === 0) {
        throw new Error(`No se encontró el lanzamiento maestro para "${CONFERENCE_PPS_NAME}".`);
    }
    const conferenceLaunchId = conferenceLaunch[0].id;
    
    if (conferenceInstitution.length === 0) {
        throw new Error(`No se encontró la institución para "${CONFERENCE_PPS_NAME}". Asegúrese de que exista en la tabla 'Instituciones'.`);
    }
    const conferenceInstitutionId = conferenceInstitution[0].id;

    // 3. Get unique student IDs and fetch their details
    const studentIds = [...new Set(asistencias.map(a => a.fields.Estudiante?.[0]).filter(Boolean))];
    const studentDetails = await db.estudiantes.getAll({
        filterByFormula: `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`,
        fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES]
    });
    const studentMap = new Map(studentDetails.map(s => [s.id, s.fields]));

    // 4. Group attendances by student, then by orientation
    const groupedByStudent = new Map<string, StudentToAccredit>();

    asistencias.forEach(asistencia => {
        const studentId = asistencia.fields.Estudiante?.[0];
        if (!studentId || !studentMap.has(studentId)) return;

        if (!groupedByStudent.has(studentId)) {
            const studentInfo = studentMap.get(studentId)!;
            groupedByStudent.set(studentId, {
                studentId,
                studentInfo: {
                    legajo: studentInfo.Legajo || 'N/A',
                    nombre: studentInfo.Nombre || 'N/A'
                },
                groupedByOrientation: new Map<string, GroupedAttendance>(),
            });
        }

        const studentData = groupedByStudent.get(studentId)!;
        const orientation = asistencia.fields.Orientacion || 'General';

        if (!studentData.groupedByOrientation.has(orientation)) {
            studentData.groupedByOrientation.set(orientation, { totalHours: 0, attendanceIds: [], dates: [] });
        }

        const orientationGroup = studentData.groupedByOrientation.get(orientation)!;
        orientationGroup.totalHours += asistencia.fields.Horas || 0;
        orientationGroup.attendanceIds.push(asistencia.id);
        if (asistencia.fields.Fecha) {
            orientationGroup.dates.push(asistencia.fields.Fecha);
        }
    });

    const sortedStudents = Array.from(groupedByStudent.values()).sort((a,b) => a.studentInfo.nombre.localeCompare(b.studentInfo.nombre));

    return {
        studentsToAccredit: sortedStudents,
        conferenceLaunchId,
        conferenceInstitutionId
    };
};

// Component
const AcreditacionJornada: React.FC = () => {
    const queryClient = useQueryClient();
    const [processingState, setProcessingState] = useState<{ studentId: string | null, isAll: boolean }>({ studentId: null, isAll: false });
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['pendingJornadaAccreditations'],
        queryFn: fetchPendingData
    });

    const accreditationMutation = useMutation({
        mutationFn: async ({ student, conferenceLaunchId, conferenceInstitutionId }: { student: StudentToAccredit, conferenceLaunchId: string, conferenceInstitutionId: string }) => {
            const practicaCreationPromises = [];
            let allAttendanceIdsToUpdate: string[] = [];

            for (const [orientation, group] of student.groupedByOrientation.entries()) {
                if (group.totalHours <= 0) continue;
                
                allAttendanceIdsToUpdate = [...allAttendanceIdsToUpdate, ...group.attendanceIds];

                const sortedDates = group.dates.sort();
                const fechaInicio = sortedDates[0];
                const fechaFin = sortedDates[sortedDates.length - 1];

                const newPractica = {
                    estudianteLink: [student.studentId],
                    lanzamientoVinculado: [conferenceLaunchId],
                    institucionLink: [conferenceInstitutionId],
                    especialidad: orientation,
                    horasRealizadas: group.totalHours,
                    fechaInicio,
                    fechaFin,
                    estado: 'Finalizada',
                    nota: null
                };
                practicaCreationPromises.push(db.practicas.create(newPractica));
            }
            
            // Wait for all new Practicas to be created for this student
            await Promise.all(practicaCreationPromises);
            
            // Then, mark all their attendance records as processed
            const recordsToUpdate = allAttendanceIdsToUpdate.map(id => ({
                id,
                fields: { procesado: true }
            }));
            
            if(recordsToUpdate.length > 0) {
                await db.asistenciasJornada.updateMany(recordsToUpdate);
            }
        },
        onSuccess: (_, { student }) => {
            setToastInfo({ message: `Horas de ${student.studentInfo.nombre} acreditadas.`, type: 'success' });
        },
        onError: (error: Error, { student }) => {
            setToastInfo({ message: `Error al acreditar a ${student.studentInfo.nombre}: ${error.message}`, type: 'error' });
            throw error; // Re-throw to stop "Acreditar Todos"
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditations'] });
        }
    });

    const handleAcreditar = async (student: StudentToAccredit) => {
        if (!data?.conferenceLaunchId || !data?.conferenceInstitutionId) return;
        setProcessingState({ studentId: student.studentId, isAll: false });
        await accreditationMutation.mutateAsync({ student, conferenceLaunchId: data.conferenceLaunchId, conferenceInstitutionId: data.conferenceInstitutionId });
        setProcessingState({ studentId: null, isAll: false });
    };

    const handleAcreditarTodos = async () => {
        if (!data?.studentsToAccredit || data.studentsToAccredit.length === 0 || !data?.conferenceLaunchId || !data?.conferenceInstitutionId) return;
        
        setProcessingState({ studentId: null, isAll: true });
        let successCount = 0;
        
        for (const student of data.studentsToAccredit) {
            try {
                await accreditationMutation.mutateAsync({ student, conferenceLaunchId: data.conferenceLaunchId, conferenceInstitutionId: data.conferenceInstitutionId });
                successCount++;
            } catch (e) {
                // Error toast is handled in the mutation's onError
                break; // Stop on the first error
            }
        }

        if (successCount > 0) {
             setToastInfo({ message: `Proceso finalizado. Se acreditaron ${successCount} estudiantes.`, type: 'success' });
        }

        setProcessingState({ studentId: null, isAll: false });
    };

    if (isLoading) return <Loader />;
    if (error) return <EmptyState icon="error" title="Error al Cargar Datos" message={error.message} />;

    const students = data?.studentsToAccredit || [];

    return (
        <div className="space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <Card icon="military_tech" title="Acreditar Horas de Jornada" description={`Se encontraron ${students.length} estudiantes con asistencias pendientes de acreditar.`}>
                <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700">
                    {students.length > 0 && (
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={handleAcreditarTodos}
                                disabled={processingState.isAll || accreditationMutation.isPending}
                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow hover:bg-blue-700 disabled:bg-slate-400"
                            >
                                {processingState.isAll ? 'Procesando...' : 'Acreditar a Todos'}
                            </button>
                        </div>
                    )}
                    {students.length > 0 ? (
                        <div className="space-y-3">
                            {students.map(student => {
                                const isProcessingThis = processingState.studentId === student.studentId;
                                return (
                                <div key={student.studentId} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">{student.studentInfo.nombre}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.studentInfo.legajo}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Array.from(student.groupedByOrientation.entries()).map(([orientation, group]) => {
                                                const classes = getEspecialidadClasses(orientation);
                                                return (
                                                    <span key={orientation} className={`${classes.tag} shadow-sm`}>
                                                        {orientation}: {group.totalHours} hs
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAcreditar(student)}
                                        disabled={isProcessingThis || processingState.isAll}
                                        className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow hover:bg-emerald-700 disabled:bg-slate-400 flex-shrink-0"
                                    >
                                        {isProcessingThis ? 'Acreditando...' : 'Acreditar'}
                                    </button>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <EmptyState icon="check_all" title="Todo al Día" message="No hay asistencias pendientes de acreditar." />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AcreditacionJornada;