import React, { useMemo, useState } from 'react';
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
import { parseToUTCDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';

const mockTimelineData: LanzamientoPPS[] = [
    { id: 'tl_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hospital de Simulación', [FIELD_FECHA_INICIO_LANZAMIENTOS]: `${new Date().getFullYear()}-03-10`, [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 10 },
    { id: 'tl_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Escuela de Prueba', [FIELD_FECHA_INICIO_LANZAMIENTOS]: `${new Date().getFullYear()}-03-20`, [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 5 },
    { id: 'tl_mock_3', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Empresa Ficticia', [FIELD_FECHA_INICIO_LANZAMIENTOS]: `${new Date().getFullYear()}-05-05`, [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 8 },
    { id: 'tl_mock_4', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hospital de Simulación - Tarde', [FIELD_FECHA_INICIO_LANZAMIENTOS]: `${new Date().getFullYear()}-03-12`, [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 8 },
];

const fetchTimelineData = async (): Promise<LanzamientoPPS[]> => {
  // FIX: Added zod schema and corrected argument order for fetchAllAirtableData
  const { records, error } = await fetchAllAirtableData<LanzamientoPPSFields>(
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    lanzamientoPPSArraySchema,
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

  // FIX: Cast r.fields to the correct type to allow spreading
  return validationResult.data.map(r => ({ ...(r.fields as LanzamientoPPSFields), id: r.id }));
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    // Splits by " - " and takes the first part. Handles cases where there's no hyphen.
    return name.split(' - ')[0].trim();
};

interface TimelineViewProps {
  isTestingMode?: boolean;
}

const TimelineView: React.FC<TimelineViewProps> = ({ isTestingMode = false }) => {
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());

    const { data: launches, isLoading, error } = useQuery({
        queryKey: ['timelineData', isTestingMode],
        // FIX: Corrected typo from MOCK_TIMELINE_DATA to mockTimelineData.
        queryFn: () => isTestingMode ? Promise.resolve(mockTimelineData) : fetchTimelineData(),
    });
    
    const availableYears = useMemo(() => {
        if (!launches) return [new Date().getFullYear()];
        const years = new Set(launches.map(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date ? date.getUTCFullYear() : null;
        }));
        return Array.from(years).filter((y): y is number => y !== null).sort((a, b) => b - a);
    }, [launches]);

    const { totalLaunchesForYear, totalCuposForYear, launchesByMonth } = useMemo(() => {
        if (!launches) {
            return { totalLaunchesForYear: 0, totalCuposForYear: 0, launchesByMonth: [] };
        }

        const launchesForYear = launches.filter(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date && date.getUTCFullYear() === targetYear;
        });
        
        const totalCupos = launchesForYear.reduce((sum, launch) => {
            return sum + Number(launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);
        }, 0);
        
        const monthlyData: { [key: number]: {
            cuposTotal: number;
            institutions: Map<string, { cupos: number; variants: string[] }>;
        } } = {};

        launchesForYear.forEach(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS])!;
            const monthIndex = date.getUTCMonth();
            
            if (!monthlyData[monthIndex]) {
                monthlyData[monthIndex] = {
                    cuposTotal: 0,
                    institutions: new Map(),
                };
            }
            
            const cupos = Number(launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);
            monthlyData[monthIndex].cuposTotal += cupos;
            
            const ppsName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (ppsName) {
                const groupName = getGroupName(ppsName);
                const institutionData = monthlyData[monthIndex].institutions.get(groupName) || { cupos: 0, variants: [] };
                institutionData.cupos += cupos;
                institutionData.variants.push(ppsName);
                monthlyData[monthIndex].institutions.set(groupName, institutionData);
            }
        });
        
        const finalLaunchesByMonth = MONTH_NAMES.map((monthName, index) => {
            const data = monthlyData[index];
            if (data) {
                return {
                    monthName,
                    ppsCount: data.institutions.size,
                    cuposTotal: data.cuposTotal,
                    institutions: Array.from(data.institutions.entries())
                        .map(([name, details]) => ({
                            name,
                            cupos: details.cupos,
                            variants: details.variants.sort(),
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                };
            }
            return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        const totalLaunchesForYearSet = new Set<string>();
        launchesForYear.forEach(launch => {
            const ppsName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (ppsName) {
                const groupName = getGroupName(ppsName);
                const monthIndex = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS])!.getUTCMonth();
                totalLaunchesForYearSet.add(`${groupName}::${monthIndex}`);
            }
        });

        return {
            totalLaunchesForYear: totalLaunchesForYearSet.size,
            totalCuposForYear: totalCupos,
            launchesByMonth: finalLaunchesByMonth,
        };
    }, [launches, targetYear]);


    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader /></div>;
    }

    if (error) {
        return <EmptyState icon="error" title="Error al Cargar la Línea de Tiempo" message={error.message} />;
    }
    
    if (launchesByMonth.length === 0) {
        return (
            <div className="animate-fade-in-up space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Línea de Tiempo {targetYear}</h2>
                     <div className="relative w-full sm:w-48">
                         <select 
                            value={targetYear} 
                            onChange={(e) => setTargetYear(Number(e.target.value))}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                            aria-label="Seleccionar año"
                         >
                             {availableYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
                         </select>
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 pointer-events-none">expand_more</span>
                     </div>
                </div>
                <EmptyState icon="calendar_today" title={`Sin Actividad en ${targetYear}`} message={`No se encontraron lanzamientos de PPS para el ciclo ${targetYear}.`} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-8">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                 <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Línea de Tiempo {targetYear}</h2>
                 <div className="relative w-full sm:w-48">
                     <select 
                        value={targetYear} 
                        onChange={e => setTargetYear(Number(e.target.value))}
                        className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                        aria-label="Seleccionar año"
                     >
                         {availableYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
                     </select>
                     <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 pointer-events-none">expand_more</span>
                 </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700 text-center">
                    <div className="pt-4 sm:pt-0">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de PPS Lanzadas ({targetYear})</p>
                        <p className="text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tighter mt-2">{totalLaunchesForYear}</p>
                    </div>
                    <div className="pt-4 sm:pt-0">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Cupos Lanzados ({targetYear})</p>
                        <p className="text-6xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter mt-2">{totalCuposForYear}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {launchesByMonth.map((monthData) => {
                    return (
                        <div key={monthData.monthName} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-lg shadow-slate-500/5 dark:shadow-black/20 transition-all duration-300 hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 hover:-translate-y-1">
                            {/* Month Header */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{monthData.monthName}</h3>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/50 px-3 py-1.5 rounded-full ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                                        <span className="material-icons !text-base">rocket_launch</span>
                                        <span>{monthData.ppsCount} PPS Lanzada{monthData.ppsCount > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full ring-1 ring-indigo-200/50 dark:ring-indigo-800/50">
                                        <span className="material-icons !text-base">groups</span>
                                        <span>{monthData.cuposTotal} Cupos</span>
                                    </div>
                                </div>
                            </div>

                            {/* Institutions List */}
                            {monthData.institutions.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Instituciones con convocatorias:</h4>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        {monthData.institutions.map(inst => {
                                            const hasVariants = inst.variants.length > 1 && inst.variants.some(v => v !== inst.name);
                                            return (
                                                <li key={inst.name}>
                                                    <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 text-sm">
                                                        <span className="text-blue-400 dark:text-blue-500 text-lg leading-none mt-0.5">&bull;</span>
                                                        <div className="flex-grow">
                                                            <span>
                                                                {inst.name}
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                                                                    ({inst.cupos} {inst.cupos === 1 ? 'Cupo' : 'Cupos'})
                                                                </span>
                                                            </span>
                                                            {hasVariants && (
                                                                <ul className="mt-1 pl-4 text-xs list-disc list-inside">
                                                                    {inst.variants.map(variant => (
                                                                        <li key={variant} className="text-slate-600 dark:text-slate-400">
                                                                            {variant.replace(`${inst.name} - `, '')}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
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