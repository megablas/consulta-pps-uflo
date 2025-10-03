import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { EstudianteFields, AsistenciaJornada, AirtableRecord } from '../types';
import {
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_CONFIRMADA_JORNADA
} from '../constants';
import AdminSearch from './AdminSearch';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import Checkbox from './Checkbox';

const ConfirmarAsistenciaJornada: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();

    const { data: studentAttendances, isLoading } = useQuery({
        queryKey: ['studentAttendancesForConfirmation', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const records = await db.asistenciasJornada.getAll({
                filterByFormula: `FIND('${selectedStudent.id}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}}))`,
                fields: [FIELD_ASISTENCIA_MODULO_NOMBRE, FIELD_ASISTENCIA_CONFIRMADA_JORNADA]
            });
            return records.map(r => ({ ...r.fields, id: r.id }));
        },
        enabled: !!selectedStudent,
    });
    
    const updateAttendanceMutation = useMutation({
        mutationFn: ({ asistenciaId, isConfirmed }: { asistenciaId: string, isConfirmed: boolean }) => {
            return db.asistenciasJornada.update(asistenciaId, {
                asistenciaConfirmada: isConfirmed
            });
        },
        onSuccess: (data, variables) => {
            const activityName = studentAttendances?.find(a => a.id === variables.asistenciaId)?.[FIELD_ASISTENCIA_MODULO_NOMBRE];
            setToastInfo({
                message: `Asistencia para "${activityName}" ${variables.isConfirmed ? 'confirmada' : 'desmarcada'}.`,
                type: 'success'
            });
            queryClient.invalidateQueries({ queryKey: ['studentAttendancesForConfirmation', selectedStudent?.id] });
            // Invalidate the main accreditation query so the admin panel updates
            queryClient.invalidateQueries({ queryKey: ['pendingJornadaAccreditation'] });
        },
        onError: (error: Error) => {
             setToastInfo({ message: `Error al actualizar: ${error.message}`, type: 'error' });
        }
    });

    const handleStudentSelect = useCallback((student: AirtableRecord<EstudianteFields>) => {
        setSelectedStudent(student);
    }, []);

    const handleAttendanceChange = (asistenciaId: string, isChecked: boolean) => {
        updateAttendanceMutation.mutate({ asistenciaId, isConfirmed: isChecked });
    };

    return (
        <div className="space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <AdminSearch onStudentSelect={handleStudentSelect} />
            
            {selectedStudent && (
                 <div className="mt-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Registrar asistencia para: <span className="text-blue-600 dark:text-blue-400">{selectedStudent.fields[FIELD_NOMBRE_ESTUDIANTES]}</span>
                    </h3>
                    
                    {isLoading ? <div className="flex justify-center p-8"><Loader /></div> : (
                        <div className="mt-4 space-y-3">
                            {studentAttendances && studentAttendances.length > 0 ? (
                                studentAttendances.map(att => (
                                    <Checkbox
                                        key={att.id}
                                        id={att.id}
                                        name={att.id}
                                        label={att[FIELD_ASISTENCIA_MODULO_NOMBRE] as string}
                                        checked={!!att[FIELD_ASISTENCIA_CONFIRMADA_JORNADA]}
                                        onChange={(e) => handleAttendanceChange(att.id, e.target.checked)}
                                        disabled={updateAttendanceMutation.isPending && updateAttendanceMutation.variables?.asistenciaId === att.id}
                                    />
                                ))
                            ) : (
                                <EmptyState
                                    icon="playlist_add_check"
                                    title="Sin Actividades"
                                    message="Este estudiante no está inscripto en ninguna actividad de la jornada."
                                />
                            )}
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default ConfirmarAsistenciaJornada;
