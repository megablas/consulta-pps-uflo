import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import {
    CONFERENCE_SHIFTS_BY_DAY,
    JORNADA_CAPACITIES,
    JORNADA_BLOCK_MAPPING,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
} from '../constants';
import type { AsistenciaJornada, EstudianteFields, AirtableRecord } from '../types';
import Loader from './Loader';
import EmptyState from './EmptyState';

// Fetch all data needed for the capacity control panel
const fetchAllJornadaData = async () => {
    // Fetch all attendance records first. We only need student links and module IDs.
    const asistenciasRes = await db.asistenciasJornada.getAll({
        fields: [FIELD_ASISTENCIA_MODULO_ID, FIELD_ASISTENCIA_ESTUDIANTE]
    });

    const studentIds = [...new Set(asistenciasRes.flatMap(a => (a.fields[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined) || []))];
    
    if (studentIds.length === 0) {
        return { asistencias: asistenciasRes.map(r => ({ ...r.fields, id: r.id })), estudiantes: [] };
    }

    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const estudiantesRes = await db.estudiantes.getAll({
        filterByFormula: studentFormula,
        fields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES]
    });

    return {
        asistencias: asistenciasRes.map(r => ({ ...r.fields, id: r.id })),
        estudiantes: estudiantesRes
    };
};

const ControlCuposJornada: React.FC = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['allJornadaDataForCupos'],
        queryFn: fetchAllJornadaData
    });

    const cuposData = useMemo(() => {
        if (!data) return [];
        
        const { asistencias, estudiantes } = data;
        const estudiantesMap = new Map<string, EstudianteFields>(estudiantes.map(e => [e.id, e.fields]));

        const studentSetsByBlock: { [key: string]: Set<string> } = {};

        // Group unique student IDs by block
        asistencias.forEach(asistencia => {
            const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
            const studentId = (asistencia[FIELD_ASISTENCIA_ESTUDIANTE] as string[] | undefined)?.[0];
            
            if (moduleId && studentId && JORNADA_BLOCK_MAPPING[moduleId]) {
                const blockId = JORNADA_BLOCK_MAPPING[moduleId];
                if (!studentSetsByBlock[blockId]) {
                    studentSetsByBlock[blockId] = new Set<string>();
                }
                studentSetsByBlock[blockId].add(studentId);
            }
        });
        
        return CONFERENCE_SHIFTS_BY_DAY.flatMap(day =>
            day.shifts.map(shift => {
                const blockId = shift.shift_id;
                const capacity = JORNADA_CAPACITIES[blockId];
                const studentSet = studentSetsByBlock[blockId] || new Set();
                const enrolled = studentSet.size;
                const students = Array.from(studentSet).map(studentId => {
                    const studentInfo = estudiantesMap.get(studentId);
                    return {
                        id: studentId,
                        name: studentInfo?.[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                        legajo: studentInfo?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A'
                    };
                }).sort((a,b) => a.name.localeCompare(b.name));

                return {
                    day: day.day,
                    shiftName: shift.name,
                    blockId,
                    capacity,
                    enrolled,
                    available: capacity - enrolled,
                    students: students
                };
            })
        );
    }, [data]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error al Cargar Datos de Cupos" message={(error as Error).message} />;

    return (
        <div className="space-y-6">
            {cuposData.map(block => (
                <details key={block.blockId} className="group bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-all duration-300 open:shadow-lg open:border-blue-200/60 dark:open:border-blue-700/60">
                    <summary className="list-none flex items-center justify-between cursor-pointer">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{block.shiftName}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{block.day}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="font-black text-2xl text-slate-700 dark:text-slate-200">{block.enrolled}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Inscriptos</p>
                            </div>
                             <div className="text-center">
                                <p className={`font-black text-2xl ${block.available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{block.available}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Disponibles</p>
                            </div>
                             <div className="text-center">
                                <p className="font-black text-2xl text-slate-700 dark:text-slate-200">{block.capacity}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Total</p>
                            </div>
                            <span className="material-icons text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open:rotate-180">expand_more</span>
                        </div>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
                         <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Lista de Inscriptos:</h4>
                         {block.students.length > 0 ? (
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 columns-1 md:columns-2 lg:columns-3">
                                {block.students.map(s => <li key={s.id}>{s.name} ({s.legajo})</li>)}
                            </ul>
                         ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay inscriptos en este turno.</p>
                         )}
                    </div>
                </details>
            ))}
        </div>
    );
};

export default ControlCuposJornada;
