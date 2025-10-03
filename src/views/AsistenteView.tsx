import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../components/Card';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { db } from '../lib/db';
import {
    CONFERENCE_PPS_NAME,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    CONFERENCE_SHIFTS_BY_DAY,
    JORNADA_BLOCK_MAPPING,
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_FECHA,
} from '../constants';
import type { AirtableRecord, EstudianteFields, ConferenceActivity, AsistenciaJornadaFields, AsistenciaJornada } from '../types';
import Checkbox from '../components/Checkbox';
import SubTabs from '../components/SubTabs';
import { formatDate } from '../utils/formatters';

interface RecentlyRegistered {
    studentId: string;
    studentName: string;
    registeredShifts: { shift_id: string; name: string }[];
    asistenciaIds: string[];
    timestamp: number;
}


const fetchConferenceStudents = async () => {
    // 1. Fetch all attendance records for the conference
    const assistanceRecords = await db.asistenciasJornada.getAll({
        fields: [FIELD_ASISTENCIA_ESTUDIANTE]
    });

    // 2. Extract all unique student IDs from the attendance records
    const studentIds = [...new Set(assistanceRecords.flatMap(a => (a.fields[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || []))];
    
    if (studentIds.length === 0) {
        return [];
    }

    // 3. Fetch details for those students
    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const studentDetailsRecords = await db.estudiantes.getAll({
        filterByFormula: studentFormula,
        fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES],
    });

    return studentDetailsRecords.sort((a, b) => 
        (a.fields[FIELD_NOMBRE_ESTUDIANTES] || '').localeCompare(b.fields[FIELD_NOMBRE_ESTUDIANTES] || '')
    );
};

const AsistenteView: React.FC = () => {
    const [selectedStudent, setSelectedStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [activeDay, setActiveDay] = useState(CONFERENCE_SHIFTS_BY_DAY[0]?.day || '');
    const queryClient = useQueryClient();
    
    const [recentlyRegistered, setRecentlyRegistered] = useState<RecentlyRegistered[]>(() => {
        try {
            const item = window.localStorage.getItem('jornadaRecentlyRegistered');
            return item ? JSON.parse(item) : [];
        } catch (error) {
            console.error('Error reading from localStorage', error);
            return [];
        }
    });

    const { data: conferenceStudents, isLoading, error } = useQuery<AirtableRecord<EstudianteFields>[], Error>({
        queryKey: ['conferenceStudents'],
        queryFn: fetchConferenceStudents,
    });

     const { data: selectedStudentAttendances, isLoading: isLoadingAttendances } = useQuery({
        queryKey: ['studentAttendances', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const records = await db.asistenciasJornada.getAll({
                filterByFormula: `FIND('${selectedStudent.id}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}}))`
            });
            return records.map(r => ({ ...r.fields, id: r.id }));
        },
        enabled: !!selectedStudent,
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('jornadaRecentlyRegistered', JSON.stringify(recentlyRegistered));
        } catch (error) {
            console.error('Error writing to localStorage', error);
        }
    }, [recentlyRegistered]);

    const dayTabs = useMemo(() => CONFERENCE_SHIFTS_BY_DAY.map(dayGroup => ({
        id: dayGroup.day,
        label: dayGroup.day.split(' ')[0], // e.g., "Martes"
    })), []);

    const allConferenceActivities = useMemo(() => CONFERENCE_SHIFTS_BY_DAY.flatMap(day => day.shifts.flatMap(shift => shift.activities)), []);

    const registrationMutation = useMutation({
        mutationFn: async ({ student, activity }: { student: AirtableRecord<EstudianteFields>, activity: ConferenceActivity }) => {
            const existingAttendance = await db.asistenciasJornada.get({
                filterByFormula: `AND(FIND('${student.id}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}})), {${FIELD_ASISTENCIA_MODULO_ID}} = '${activity.id}')`,
                maxRecords: 1
            });

            if (existingAttendance.length > 0) {
                return { skipped: true, student, activity, message: `Asistencia para ${student.fields.Nombre} en "${activity.name}" ya existía.` };
            }

            const newAttendance = {
                estudianteLink: [student.id],
                moduloId: activity.id,
                moduloAsistido: activity.name,
                fecha: activity.date,
                orientacion: activity.orientation,
                horas: activity.hours,
                procesado: false,
            };

            const createdRecord = await db.asistenciasJornada.create(newAttendance);
            if (!createdRecord) throw new Error("No se pudo crear el registro de asistencia.");
            
            return { skipped: false, student, activity, asistenciaId: createdRecord.id };
        },
        onError: (error: Error) => {
            setToastInfo({ message: error.message, type: 'error' });
        }
    });

    const deleteRegistrationMutation = useMutation({
        mutationFn: (asistenciaId: string) => {
            return db.asistenciasJornada.delete(asistenciaId);
        },
        onSuccess: (_, asistenciaId) => {
            setToastInfo({ message: `Registro borrado.`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['conferenceStudents'] });
            if (selectedStudent) {
                queryClient.invalidateQueries({ queryKey: ['studentAttendances', selectedStudent.id] });
            }
            setRecentlyRegistered(prev => prev.filter(r => !r.asistenciaIds.includes(asistenciaId)));
        },
        onError: (error: Error) => {
            setToastInfo({ message: `No se pudo borrar el registro: ${error.message}`, type: 'error' });
        }
    });
    
    const handleRegisterSelected = async () => {
        if (!selectedStudent) {
            setToastInfo({ message: 'Error: Debes seleccionar un estudiante primero.', type: 'error' });
            return;
        }
        if (selectedActivities.size === 0) {
            setToastInfo({ message: 'Error: Debes seleccionar al menos una actividad.', type: 'error' });
            return;
        }
    
        const activitiesToRegister = Array.from(selectedActivities)
            .map(id => allConferenceActivities.find(act => act.id === id))
            .filter((act): act is ConferenceActivity => !!act);
    
        const promises = activitiesToRegister.map(activity =>
            registrationMutation.mutateAsync({ student: selectedStudent, activity })
        );
    
        const results = await Promise.allSettled(promises);
    
        const successfulRegistrationsData: { student: AirtableRecord<EstudianteFields>, activity: ConferenceActivity, asistenciaId: string }[] = [];
        let skippedCount = 0;
        let errorCount = 0;
    
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { skipped, asistenciaId, student, activity } = result.value;
                if (!skipped && asistenciaId) {
                    successfulRegistrationsData.push({ student, activity, asistenciaId });
                } else {
                    skippedCount++;
                }
            } else {
                errorCount++;
            }
        });
    
        if (successfulRegistrationsData.length > 0) {
            const registeredShiftIds = new Set<string>();
            successfulRegistrationsData.forEach(({ activity }) => {
                const shiftId = JORNADA_BLOCK_MAPPING[activity.id as keyof typeof JORNADA_BLOCK_MAPPING];
                if (shiftId) registeredShiftIds.add(shiftId);
            });
    
            const registeredShifts = CONFERENCE_SHIFTS_BY_DAY.flatMap(d => d.shifts)
                .filter(s => registeredShiftIds.has(s.shift_id))
                .map(s => ({ shift_id: s.shift_id, name: s.name }));
    
            const newRecentEntry: RecentlyRegistered = {
                studentId: selectedStudent.id,
                studentName: selectedStudent.fields.Nombre || 'N/A',
                registeredShifts,
                asistenciaIds: successfulRegistrationsData.map(r => r.asistenciaId),
                timestamp: Date.now(),
            };
            
            setRecentlyRegistered(prev => [newRecentEntry, ...prev].slice(0, 20));
        }
    
        let toastMessage = '';
        if (successfulRegistrationsData.length > 0) {
            toastMessage += `${successfulRegistrationsData.length} asistencia(s) registrada(s) para ${selectedStudent.fields.Nombre}. `;
            queryClient.invalidateQueries({ queryKey: ['studentAttendances', selectedStudent.id] });
            queryClient.invalidateQueries({ queryKey: ['conferenceStudents'] });
        }
        if (skippedCount > 0) {
            toastMessage += `${skippedCount} ya estaba(n) registrada(s). `;
        }
        if (errorCount > 0) {
            toastMessage += `${errorCount} registro(s) fallaron.`;
        }
    
        setToastInfo({
            message: toastMessage.trim(),
            type: errorCount > 0 ? 'error' : 'success'
        });
    
        setSelectedActivities(new Set());
    };

    const handleActivityToggle = (activityId: string) => {
        setSelectedActivities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(activityId)) {
                newSet.delete(activityId);
            } else {
                newSet.add(activityId);
            }
            return newSet;
        });
    };

    const filteredStudents = useMemo(() => {
        if (!conferenceStudents) return [];
        if (!searchTerm) return conferenceStudents;

        const lowercasedFilter = searchTerm.toLowerCase();
        return conferenceStudents.filter(student =>
            (student.fields[FIELD_NOMBRE_ESTUDIANTES] || '').toLowerCase().includes(lowercasedFilter) ||
            (student.fields[FIELD_LEGAJO_ESTUDIANTES] || '').toLowerCase().includes(lowercasedFilter)
        );
    }, [conferenceStudents, searchTerm]);
    
    const renderStudentList = () => {
        if (isLoading) return <div className="flex justify-center p-4"><Loader /></div>;
        if (error) return <EmptyState icon="error" title="Error al cargar estudiantes" message={error.message} />;
        if (!conferenceStudents || conferenceStudents.length === 0) {
            return <EmptyState icon="group_off" title="Sin Estudiantes" message={`No se encontraron estudiantes inscriptos en la convocatoria "${CONFERENCE_PPS_NAME}".`} />;
        }
        if (filteredStudents.length === 0 && searchTerm) {
            return <p className="text-center text-sm text-slate-500 pt-8">No se encontraron estudiantes que coincidan con "{searchTerm}".</p>;
        }

        return (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {filteredStudents.map(student => (
                    <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 border-2 ${selectedStudent?.id === student.id ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{student.fields[FIELD_NOMBRE_ESTUDIANTES]}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{student.fields[FIELD_LEGAJO_ESTUDIANTES]}</p>
                        </div>
                        {selectedStudent?.id === student.id && (
                             <span className="material-icons text-blue-600 dark:text-blue-400">check_circle</span>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda: Formulario de Actividades */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Registro de Asistencia a la Jornada">
                        <div className="mt-4">
                            <SubTabs tabs={dayTabs} activeTabId={activeDay} onTabChange={setActiveDay} />
                        </div>
                        <div className="space-y-4 mt-6">
                            {CONFERENCE_SHIFTS_BY_DAY
                                .find(dayGroup => dayGroup.day === activeDay)
                                ?.shifts.map(shift => (
                                    <div key={shift.shift_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80">
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{shift.name} <span className="font-normal text-slate-500 dark:text-slate-400">({shift.timeRange})</span></h3>
                                        <div className="mt-3 space-y-2">
                                            {shift.activities.map(activity => (
                                                <Checkbox
                                                    key={activity.id}
                                                    id={activity.id}
                                                    name={activity.id}
                                                    label={activity.name}
                                                    checked={selectedActivities.has(activity.id)}
                                                    onChange={() => handleActivityToggle(activity.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                            ))}
                        </div>
                    </Card>
                    <div className="flex items-center justify-end gap-4 sticky bottom-4">
                        <button
                            onClick={() => setSelectedActivities(new Set())}
                            className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-lg text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-md"
                        >
                            Limpiar Selección
                        </button>
                        <button
                            onClick={handleRegisterSelected}
                            disabled={registrationMutation.isPending || !selectedStudent || selectedActivities.size === 0}
                            className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-icons">how_to_reg</span>
                            <span>Acreditar Asistencias ({selectedActivities.size})</span>
                        </button>
                    </div>
                </div>

                {/* Columna Derecha: Lista de Estudiantes y Registros Recientes */}
                <div className="space-y-6">
                    <Card icon="groups" title="Lista de Inscriptos">
                        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700 space-y-4">
                            <div className="relative">
                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">search</span>
                                <input
                                    id="student-filter" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Filtrar por nombre o legajo..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                                />
                            </div>
                            {renderStudentList()}
                        </div>
                    </Card>

                    {selectedStudent && (
                        <Card icon="checklist" title="Asistencias Registradas">
                            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                                {isLoadingAttendances ? (
                                    <div className="flex justify-center p-4"><Loader /></div>
                                ) : !selectedStudentAttendances || selectedStudentAttendances.length === 0 ? (
                                    <p className="text-sm text-center text-slate-500 dark:text-slate-400">Este estudiante no tiene asistencias registradas.</p>
                                ) : (
                                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {selectedStudentAttendances.map((att: AsistenciaJornada & {id: string}) => (
                                            <li key={att.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{att[FIELD_ASISTENCIA_MODULO_NOMBRE]}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(att[FIELD_ASISTENCIA_FECHA] as string)}</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteRegistrationMutation.mutate(att.id)}
                                                    disabled={deleteRegistrationMutation.isPending && deleteRegistrationMutation.variables === att.id}
                                                    className="p-1.5 rounded-full text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50"
                                                    aria-label="Eliminar asistencia"
                                                >
                                                    {deleteRegistrationMutation.isPending && deleteRegistrationMutation.variables === att.id
                                                    ? <div className="w-4 h-4 border-2 border-rose-400/50 border-t-rose-500 rounded-full animate-spin"/>
                                                    : <span className="material-icons !text-base">delete_outline</span>
                                                    }
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card icon="history" title="Registros Recientes">
                        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                            {recentlyRegistered.length > 0 ? (
                                <ul className="space-y-3">
                                    {recentlyRegistered.map(item => (
                                        <li key={item.timestamp} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-slate-50">{item.studentName}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                                    Turnos: {item.registeredShifts.map(s => s.name).join(', ')}
                                                </p>
                                            </div>
                                            <button onClick={() => deleteRegistrationMutation.mutate(item.asistenciaIds[0])} disabled={deleteRegistrationMutation.isPending && item.asistenciaIds.includes(deleteRegistrationMutation.variables || '')} className="text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 disabled:opacity-50">
                                                Borrar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState icon="person_add_disabled" title="Sin Actividad" message="Los últimos estudiantes registrados aparecerán aquí." />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AsistenteView;