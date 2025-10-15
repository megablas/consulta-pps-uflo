import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../components/Card';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import Checkbox from '../components/Checkbox';
import { db } from '../lib/db';
import {
    CONFERENCE_PPS_NAME,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_FECHA,
    FIELD_ASISTENCIA_CONFIRMADA_JORNADA,
    CONFERENCE_SHIFTS_BY_DAY
} from '../constants';
import type { AirtableRecord, EstudianteFields, AsistenciaJornada } from '../types';

// Main component for the Assistant view
const AsistenteView: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();

    // 1. Fetch all attendances for the conference
    const { data: allAttendances, isLoading: isLoadingAttendances, error: attendancesError } = useQuery({
        queryKey: ['allConferenceAttendances'],
        queryFn: async (): Promise<(AsistenciaJornada & { id: string })[]> => {
            const records = await db.asistenciasJornada.getAll();
            return records.map(r => ({ ...r.fields, id: r.id }));
        }
    });

    // 2. Fetch all students (needed to map IDs to names for the search list)
    const { data: allStudents, isLoading: isLoadingStudents, error: studentsError } = useQuery({
        queryKey: ['allStudentsForConference'],
        queryFn: async (): Promise<AirtableRecord<EstudianteFields>[]> => {
            const records = await db.estudiantes.getAll({
                fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES]
            });
            return records;
        }
    });

    // 3. Derive the list of students who are enrolled in the conference for the search functionality
    const conferenceStudents = useMemo(() => {
        if (!allAttendances || !allStudents) return [];
        const studentIdsWithAttendance = new Set(allAttendances.flatMap(a => (a[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || []));
        
        return allStudents
            .filter(student => studentIdsWithAttendance.has(student.id))
            .sort((a, b) => 
                (a.fields[FIELD_NOMBRE_ESTUDIANTES] || '').localeCompare(b.fields[FIELD_NOMBRE_ESTUDIANTES] || '')
            );
    }, [allAttendances, allStudents]);

    // 4. When a student is selected, filter the already-fetched `allAttendances` data
    const studentAttendances = useMemo(() => {
        if (!selectedStudent || !allAttendances) return [];
        return allAttendances.filter(att => {
            const studentIdArray = (att[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || [];
            return studentIdArray.includes(selectedStudent.id);
        });
    }, [selectedStudent, allAttendances]);

    const updateAttendanceMutation = useMutation({
        mutationFn: ({ asistenciaId, isConfirmed }: { asistenciaId: string, isConfirmed: boolean }) => {
            return db.asistenciasJornada.update(asistenciaId, { asistenciaConfirmada: isConfirmed });
        },
        onSuccess: () => {
            setToastInfo({ message: 'Asistencia actualizada.', type: 'success' });
            // Invalidate the single source of truth for attendances
            queryClient.invalidateQueries({ queryKey: ['allConferenceAttendances'] });
        },
        onError: (e: Error) => {
            setToastInfo({ message: `Error al actualizar: ${e.message}`, type: 'error' });
        }
    });

    const filteredStudents = useMemo(() => {
        if (!conferenceStudents) return [];
        if (!searchTerm) return []; // Only show results when searching
        const lowercasedFilter = searchTerm.toLowerCase();
        return conferenceStudents.filter(student =>
            (student.fields[FIELD_NOMBRE_ESTUDIANTES] || '').toLowerCase().includes(lowercasedFilter) ||
            String(student.fields[FIELD_LEGAJO_ESTUDIANTES] || '').toLowerCase().includes(lowercasedFilter)
        );
    }, [conferenceStudents, searchTerm]);
    
    const handleStudentSelect = (student: AirtableRecord<EstudianteFields>) => {
        setSelectedStudent(student);
        setSearchTerm(''); // Clear search after selection
    };

    const handleBackToSearch = () => {
        setSelectedStudent(null);
    };
    
    const groupedAttendances = useMemo(() => {
        if (!studentAttendances) return [];
        const groups: { day: string, activities: (AsistenciaJornada & { id: string })[] }[] = [];
        
        CONFERENCE_SHIFTS_BY_DAY.forEach(dayGroup => {
            const activitiesForDay = studentAttendances.filter(att => 
                dayGroup.shifts.some(shift => shift.activities.some(act => act.id === att[FIELD_ASISTENCIA_MODULO_ID]))
            );
            if (activitiesForDay.length > 0) {
                groups.push({ day: dayGroup.day, activities: activitiesForDay.sort((a,b) => String(a[FIELD_ASISTENCIA_MODULO_NOMBRE]).localeCompare(String(b[FIELD_ASISTENCIA_MODULO_NOMBRE]))) });
            }
        });
        return groups;
    }, [studentAttendances]);

    const isLoading = isLoadingAttendances || isLoadingStudents;
    const error = attendancesError || studentsError;

    if (isLoading) {
        return (
            <Card>
                <div className="flex justify-center p-8"><Loader /></div>
            </Card>
        );
    }

    if (error) {
        return <EmptyState icon="error" title="Error de Carga" message={error.message} />;
    }

    if (selectedStudent) {
        return (
            <Card>
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={handleBackToSearch} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50">
                        <span className="material-icons">arrow_back</span>
                        Volver a la búsqueda
                    </button>
                    <div className="flex-grow text-right">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedStudent.fields.Nombre}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Legajo: {selectedStudent.fields.Legajo}</p>
                    </div>
                </div>
                {isLoadingAttendances ? <Loader /> : ( // Re-using isLoadingAttendances is fine here as it's part of the main isLoading flag
                    groupedAttendances.length > 0 ? (
                        <div className="space-y-6">
                            {groupedAttendances.map(group => (
                                <div key={group.day}>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{group.day}</h3>
                                    <div className="mt-2 space-y-2">
                                        {group.activities.map(att => (
                                             <div key={att.id} className={`p-0.5 rounded-lg border-2 transition-colors ${att[FIELD_ASISTENCIA_CONFIRMADA_JORNADA] ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' : 'bg-transparent border-transparent'}`}>
                                                <Checkbox
                                                    id={att.id}
                                                    name={att.id}
                                                    label={`${att[FIELD_ASISTENCIA_MODULO_NOMBRE]}`}
                                                    checked={!!att[FIELD_ASISTENCIA_CONFIRMADA_JORNADA]}
                                                    onChange={(e) => updateAttendanceMutation.mutate({ asistenciaId: att.id, isConfirmed: e.target.checked })}
                                                    disabled={updateAttendanceMutation.isPending}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <EmptyState icon="event_busy" title="Sin Actividades" message="Este estudiante no está inscripto en ninguna actividad." />
                )}
            </Card>
        );
    }

    return (
        <Card icon="how_to_reg" title="Control de Asistencia" description={`Busca un estudiante inscripto en "${CONFERENCE_PPS_NAME}" para confirmar su asistencia.`}>
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700">
                 <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">search</span>
                    <input
                        id="student-filter" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o legajo..." autoFocus
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                    />
                </div>
                <div className="mt-4">
                    {searchTerm ? (
                        filteredStudents.length > 0 ? (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                {filteredStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => handleStudentSelect(student)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 border-2 bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-blue-400 dark:hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-50">{student.fields[FIELD_NOMBRE_ESTUDIANTES]}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.fields[FIELD_LEGAJO_ESTUDIANTES]}</p>
                                        </div>
                                         <span className="material-icons text-slate-400 dark:text-slate-500">arrow_forward_ios</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-8">No se encontraron estudiantes que coincidan con "{searchTerm}".</p>
                        )
                    ) : (
                        <div className="text-center pt-8">
                            <p className="text-slate-500 dark:text-slate-400">Comienza a escribir para buscar un estudiante.</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default AsistenteView;