import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import Card from './Card';
import Loader from './Loader';
import EmptyState from './EmptyState';
import {
    CONFERENCE_SHIFTS_BY_DAY,
    JORNADA_CAPACITIES,
    JORNADA_BLOCK_MAPPING,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields, AsistenciaJornadaFields, AirtableRecord } from '../types';

interface StudentInfo {
    id: string;
    nombre: string;
    legajo: string;
}

const JornadaDashboard: React.FC = () => {
    // Fetch all necessary data in parallel
    const { data, isLoading, error } = useQuery({
        queryKey: ['jornadaDashboardData'],
        queryFn: async () => {
            const [asistenciasRes, estudiantesRes] = await Promise.all([
                db.asistenciasJornada.getAll({ fields: [FIELD_ASISTENCIA_ESTUDIANTE, FIELD_ASISTENCIA_MODULO_ID] }),
                db.estudiantes.getAll({ fields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES] })
            ]);

            return {
                asistencias: asistenciasRes.map(r => ({ ...r.fields, id: r.id })),
                estudiantes: estudiantesRes
            };
        }
    });

    const processedData = useMemo(() => {
        if (!data) return null;

        const { asistencias, estudiantes } = data;

        const studentsMap = new Map<string, StudentInfo>();
        estudiantes.forEach(student => {
            studentsMap.set(student.id, {
                id: student.id,
                nombre: student.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Sin Nombre',
                legajo: student.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A'
            });
        });

        const enrollmentsByShift = new Map<string, Set<string>>(); // shift_id -> Set<student_id>

        asistencias.forEach(asistencia => {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            const studentId = (asistencia[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined)?.[0];
            
            if (moduleId && studentId) {
                const shiftId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
                if (shiftId) {
                    if (!enrollmentsByShift.has(shiftId)) {
                        enrollmentsByShift.set(shiftId, new Set());
                    }
                    enrollmentsByShift.get(shiftId)!.add(studentId);
                }
            }
        });

        return { studentsMap, enrollmentsByShift };
    }, [data]);


    if (isLoading) return <Loader />;
    if (error) return <EmptyState icon="error" title="Error" message={(error as Error).message} />;
    if (!processedData) return <EmptyState icon="data_usage" title="No hay datos" message="No se encontraron datos de inscripción para la jornada." />;

    const { studentsMap, enrollmentsByShift } = processedData;

    return (
        <Card
            icon="event_note"
            title="Seguimiento de Inscripciones a la Jornada"
            description="Visualiza en tiempo real los cupos disponibles y los estudiantes inscriptos por cada bloque del evento."
        >
            <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700 space-y-8">
                {CONFERENCE_SHIFTS_BY_DAY.map(dayGroup => (
                    <div key={dayGroup.day}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-4">{dayGroup.day}</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {dayGroup.shifts.map(shift => {
                                const capacity = JORNADA_CAPACITIES[shift.shift_id];
                                const enrolledStudentIds = enrollmentsByShift.get(shift.shift_id) || new Set();
                                const enrolledCount = enrolledStudentIds.size;
                                const available = capacity - enrolledCount;
                                const percentage = capacity > 0 ? (enrolledCount / capacity) * 100 : 0;
                                const enrolledStudents = Array.from(enrolledStudentIds).map(id => studentsMap.get(id)).filter(Boolean) as StudentInfo[];

                                let progressBarColor = 'bg-emerald-500';
                                if (percentage > 75) progressBarColor = 'bg-amber-500';
                                if (percentage >= 100) progressBarColor = 'bg-rose-500';

                                return (
                                    <div key={shift.shift_id} className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-blue-700 dark:text-blue-400">{shift.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{shift.timeRange}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{enrolledCount} / {capacity}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">{available < 0 ? 0 : available} disponibles</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-3">
                                            <div
                                                className={`${progressBarColor} h-2.5 rounded-full transition-all duration-500`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                        <details className="mt-4 group">
                                            <summary className="text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer list-none flex items-center gap-1">
                                                Ver Inscriptos ({enrolledCount})
                                                <span className="material-icons !text-base transition-transform duration-200 group-open:rotate-90">chevron_right</span>
                                            </summary>
                                            <ul className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {enrolledStudents.length > 0 ? enrolledStudents
                                                    .sort((a,b) => a.nombre.localeCompare(b.nombre))
                                                    .map(student => (
                                                    <li key={student.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-700 dark:text-slate-200">{student.nombre}</span>
                                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{student.legajo}</span>
                                                    </li>
                                                )) : (
                                                    <li className="text-sm text-slate-500 dark:text-slate-400 italic">No hay inscriptos en este bloque.</li>
                                                )}
                                            </ul>
                                        </details>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default JornadaDashboard;
