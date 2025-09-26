import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import Card from './Card';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { CONFERENCE_PPS_NAME, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES } from '../constants';
import { getEspecialidadClasses, formatDate, parseToUTCDate } from '../utils/formatters';

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

            for (const [orientation, groupData] of student.groupedByOrientation.entries()) {
                const sortedDates = [...groupData.dates].sort();
                const startDate = sortedDates[0];
                const endDate = sortedDates[sortedDates.length - 1];

                const newPracticaData = {
                    estudianteLink: [student.studentId],
                    lanzamientoVinculado: [conferenceLaunchId],
                    institucionLink: [conferenceInstitutionId],
                    especialidad: orientation,
                    horasRealizadas: groupData.totalHours,
                    estado: 'Finalizada',
                    fechaInicio: startDate,
                    fechaFin: endDate,
                    nota: 'Aprobado',
                };
                practicaCreationPromises.push(db.practicas.create(newPracticaData));
                allAttendanceIdsToUpdate = allAttendanceIdsToUpdate.concat(groupData.attendanceIds);
            }

            await Promise.all(practicaCreationPromises);

            // Mark attendance records as processed
            const attendanceRecordsToUpdate = allAttendanceIdsToUpdate.map(id => ({ id, fields: { procesado: true } }));
            if (attendanceRecordsToUpdate.length > 0) {
                await db.asistenciasJornada.updateMany(attendanceRecordsToUpdate);
            }
        },
        onSuccess: (_, { student }) => {
            setToastInfo({ message: `Acreditación exitosa para ${student.studentInfo.nombre}.`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditations'] });
        },
        onError: (error: Error, { student }) => {
            setToastInfo({ message: `Error acreditando a ${student.studentInfo.nombre}: ${error.message}`, type: 'error' });
        },
        // FIX: The onSettled callback in useMutation takes four arguments. The original code was missing the 'error' parameter,
        // which caused a type inference failure and led to the component being incorrectly typed as returning 'void'.
        onSettled: (_, error, { student }) => {
            setProcessingState(prev => ({ ...prev, studentId: null }));
        }
    });

    const handleAccreditStudent = (student: StudentToAccredit) => {
        if (!data?.conferenceLaunchId || !data?.conferenceInstitutionId) {
            setToastInfo({ message: 'Error: Faltan datos de configuración de la jornada.', type: 'error' });
            return;
        }
        setProcessingState({ studentId: student.studentId, isAll: false });
        accreditationMutation.mutate({
            student,
            conferenceLaunchId: data.conferenceLaunchId,
            conferenceInstitutionId: data.conferenceInstitutionId,
        });
    };

    const handleAccreditAll = () => {
        if (!data?.studentsToAccredit || data.studentsToAccredit.length === 0 || !data.conferenceLaunchId || !data.conferenceInstitutionId) {
            setToastInfo({ message: 'No hay estudiantes para acreditar.', type: 'error' });
            return;
        }

        setProcessingState({ studentId: null, isAll: true });
        
        // Using a promise chain to process one by one
        const accreditSequentially = async () => {
            for (const student of data.studentsToAccredit) {
                try {
                    await accreditationMutation.mutateAsync({
                        student,
                        conferenceLaunchId: data.conferenceLaunchId!,
                        conferenceInstitutionId: data.conferenceInstitutionId!,
                    });
                } catch (e) {
                    console.error(`Failed to accredit ${student.studentInfo.nombre}, stopping process.`, e);
                    // The onError in the mutation will handle the toast for the specific student
                    break; // Stop on first error
                }
            }
            setProcessingState({ studentId: null, isAll: false });
        };

        accreditSequentially();
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error al Cargar Datos" message={error.message} />;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <Card 
                icon="military_tech" 
                title="Acreditación de Asistencia a Jornada" 
                description={`Se encontraron ${data?.studentsToAccredit.length || 0} estudiantes con asistencias pendientes de procesar.`}
                actions={
                    <button
                        onClick={handleAccreditAll}
                        disabled={!data || data.studentsToAccredit.length === 0 || processingState.isAll || processingState.studentId !== null}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 flex items-center gap-2"
                    >
                        {processingState.isAll ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-icons !text-base">auto_awesome</span>
                                <span>Acreditar Todo</span>
                            </>
                        )}
                    </button>
                }
            >
               {data && data.studentsToAccredit.length > 0 ? (
                <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700">
                    <div className="space-y-4">
                        {data.studentsToAccredit.map(student => (
                            <div key={student.studentId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{student.studentInfo.nombre}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Legajo: {student.studentInfo.legajo}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {Array.from(student.groupedByOrientation.entries()).map(([orientation, groupData]) => {
                                            const visuals = getEspecialidadClasses(orientation);
                                            return (
                                                <span key={orientation} className={`${visuals.tag} text-xs`}>
                                                    {orientation}: {groupData.totalHours} hs
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleAccreditStudent(student)}
                                    disabled={processingState.isAll || processingState.studentId === student.studentId}
                                    className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow hover:bg-emerald-700 disabled:bg-slate-400"
                                >
                                    {processingState.studentId === student.studentId ? 'Procesando...' : 'Acreditar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
               ) : (
                 <EmptyState icon="task_alt" title="Todo Acreditado" message="No hay asistencias pendientes de procesar."/>
               )}
            </Card>
        </div>
    );
};

export default AcreditacionJornada;