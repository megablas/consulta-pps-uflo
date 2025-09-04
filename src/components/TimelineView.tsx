import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllAirtableData } from '../services/airtableService';
import type { LanzamientoPPS, LanzamientoPPSFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';

const fetchTimelineData = async (): Promise<LanzamientoPPS[]> => {
  const { records, error } = await fetchAllAirtableData<LanzamientoPPSFields>(
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    [
      FIELD_NOMBRE_PPS_LANZAMIENTOS,
      FIELD_ORIENTACION_LANZAMIENTOS,
      FIELD_FECHA_INICIO_LANZAMIENTOS,
      FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    ],
    undefined,
    [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'asc' }]
  );

  if (error) {
    const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
    throw new Error(`Error fetching timeline data: ${errorMsg}`);
  }

  const validationResult = lanzamientoPPSArraySchema.safeParse(records);
  if (!validationResult.success) {
      console.error('[Zod Validation Error in Timeline Lanzamientos]:', validationResult.error.issues);
      throw new Error('Error de validación de datos para la línea de tiempo.');
  }

  return validationResult.data.map(r => ({ ...r.fields, id: r.id }));
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TimelineView: React.FC = () => {
    const { data: launches, isLoading, error } = useQuery({
        queryKey: ['timelineData2025'],
        queryFn: fetchTimelineData,
    });
    
    const totalLaunches2025 = useMemo(() => {
        if (!launches) return 0;
        return launches.filter(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date && date.getUTCFullYear() === 2025;
        }).length;
    }, [launches]);


    const launches2025ByMonth = useMemo(() => {
        if (!launches) return [];

        const launches2025 = launches.filter(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date && date.getUTCFullYear() === 2025;
        });

        const monthlyData: { [key: number]: { ppsCount: number; cuposTotal: number; cuposSinRelevamiento: number; institutions: Set<string> } } = {};

        launches2025.forEach(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            if (!date) return;

            const monthIndex = date.getUTCMonth();
            
            if (!monthlyData[monthIndex]) {
                monthlyData[monthIndex] = {
                    ppsCount: 0,
                    cuposTotal: 0,
                    cuposSinRelevamiento: 0,
                    institutions: new Set<string>(),
                };
            }
            
            const cupos = launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
            monthlyData[monthIndex].ppsCount += 1;
            monthlyData[monthIndex].cuposTotal += cupos;
            
            const ppsName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (ppsName) {
                monthlyData[monthIndex].institutions.add(ppsName);
                if (!normalizeStringForComparison(ppsName).includes('relevamiento')) {
                    monthlyData[monthIndex].cuposSinRelevamiento += cupos;
                }
            } else {
                 monthlyData[monthIndex].cuposSinRelevamiento += cupos;
            }
        });
        
        return MONTH_NAMES.map((monthName, index) => {
            if (monthlyData[index]) {
                return {
                    monthName,
                    ...monthlyData[index],
                    institutions: Array.from(monthlyData[index].institutions).sort(),
                };
            }
            return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);

    }, [launches]);


    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader /></div>;
    }

    if (error) {
        return <EmptyState icon="error" title="Error al Cargar la Línea de Tiempo" message={error.message} />;
    }
    
    if (launches2025ByMonth.length === 0) {
        return <EmptyState icon="calendar_today" title="Sin Actividad en 2025" message="No se encontraron lanzamientos de PPS para el ciclo 2025." />;
    }

    return (
        <div className="animate-fade-in-up space-y-8">
             <div className="text-center">
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Línea de Tiempo 2025</h2>
                 <p className="text-slate-600 mt-2 max-w-2xl mx-auto">Resumen mensual de las convocatorias y cupos ofrecidos durante el ciclo lectivo.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-lg text-center">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total de PPS Lanzadas en 2025</p>
                <p className="text-6xl font-black text-blue-600 tracking-tighter mt-2">{totalLaunches2025}</p>
            </div>

            <div className="space-y-6">
                {launches2025ByMonth.map((monthData) => {
                    const isAugust = monthData.monthName === "Agosto";
                    return (
                        <div key={monthData.monthName} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-500/5 transition-all duration-300 hover:shadow-blue-500/10 hover:-translate-y-1">
                            {/* Month Header */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{monthData.monthName}</h3>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full ring-1 ring-blue-200/50">
                                        <span className="material-icons !text-base">rocket_launch</span>
                                        <span>{monthData.ppsCount} PPS Lanzada{monthData.ppsCount > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full ring-1 ring-indigo-200/50">
                                        <span className="material-icons !text-base">groups</span>
                                        <span>{monthData.cuposTotal} Cupos</span>
                                    </div>
                                    {isAugust && (
                                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full ring-1 ring-emerald-200/50">
                                            <span className="material-icons !text-base">person_remove</span>
                                            <span>{monthData.cuposSinRelevamiento} Cupos (sin Relev.)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Institutions List */}
                            {monthData.institutions.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-500 mb-3">Instituciones con convocatorias:</h4>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                                        {monthData.institutions.map(inst => (
                                            <li key={inst} className="flex items-center gap-2.5 text-slate-700 text-sm">
                                                <span className="text-blue-400 text-lg leading-none">&bull;</span>
                                                <span>{inst}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineView;
