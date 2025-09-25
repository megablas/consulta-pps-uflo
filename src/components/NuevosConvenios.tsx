import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllAirtableData, updateAirtableRecords } from '../services/airtableService';
import type { LanzamientoPPS, InstitucionFields, LanzamientoPPSFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';
import Card from './Card';
import Toast from './Toast';

// Fetches all PPS launches and institutions from Airtable
const fetchConveniosData = async (): Promise<{ launches: LanzamientoPPS[], institutions: (InstitucionFields & { id: string })[] }> => {
    const [launchesRes, institutionsRes] = await Promise.all([
        fetchAllAirtableData<LanzamientoPPSFields>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [
                FIELD_NOMBRE_PPS_LANZAMIENTOS,
                FIELD_FECHA_INICIO_LANZAMIENTOS,
                FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
            ],
        ),
        fetchAllAirtableData<InstitucionFields>(
            AIRTABLE_TABLE_NAME_INSTITUCIONES,
            [FIELD_NOMBRE_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES]
        )
    ]);

    if (launchesRes.error || institutionsRes.error) {
        const errorObj = (launchesRes.error || institutionsRes.error)?.error;
        const errorMsg = typeof errorObj === 'string'
            ? errorObj
            : (errorObj && typeof errorObj === 'object' && 'message' in errorObj)
                ? String((errorObj as { message: unknown }).message)
                : 'Error al obtener los datos';
        throw new Error(`Error al cargar datos de convenios: ${errorMsg}`);
    }
  
    const launchesValidation = lanzamientoPPSArraySchema.safeParse(launchesRes.records);
    if (!launchesValidation.success) {
        console.error('[Zod Validation Error in NuevosConvenios Launches]:', launchesValidation.error.issues);
        throw new Error('Error de validación de datos para los lanzamientos.');
    }

    return {
        launches: launchesValidation.data.map(r => ({ ...r.fields, id: r.id })),
        institutions: institutionsRes.records.map(r => ({...r.fields, id: r.id}))
    };
};

interface GroupedInstitutionInfo {
    id: string; 
    groupName: string;
    totalCupos: number;
    subPps: { name: string; cupos: number }[];
}

const NuevosConvenios: React.FC = () => {
    const queryClient = useQueryClient();
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());
    const { data, isLoading, error } = useQuery({
        queryKey: ['nuevosConveniosData'],
        queryFn: fetchConveniosData,
    });
    
    const [selection, setSelection] = useState<Map<string, boolean>>(new Map());
    const [initialStatus, setInitialStatus] = useState<Map<string, { isNew: boolean }>>(new Map());
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleExpanded = (groupName: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupName)) {
                newSet.delete(groupName);
            } else {
                newSet.add(groupName);
            }
            return newSet;
        });
    };

    const availableYears = useMemo(() => {
        if (!data?.launches) return [new Date().getFullYear()];
        const years = new Set(data.launches.map(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date ? date.getUTCFullYear() : null;
        }).filter((y): y is number => y !== null));
        return Array.from(years).sort((a, b) => b - a);
    }, [data]);

    const { confirmedNewConvenios, suggestedNewConvenios } = useMemo((): {
        confirmedNewConvenios: GroupedInstitutionInfo[],
        suggestedNewConvenios: GroupedInstitutionInfo[]
    } => {
        if (!data) return { confirmedNewConvenios: [], suggestedNewConvenios: [] };
        
        const previousYear = targetYear - 1;

        const getGroupName = (name: string | undefined): string => {
            if (!name) return 'Sin Nombre';
            return name.split(' - ')[0].trim();
        };

        const institutionMap = new Map<string, { id: string; originalName: string; isNew: boolean; }>();
        data.institutions.forEach(inst => {
            if (inst[FIELD_NOMBRE_INSTITUCIONES]) {
                const normName = normalizeStringForComparison(inst[FIELD_NOMBRE_INSTITUCIONES]);
                institutionMap.set(normName, {
                    id: inst.id,
                    originalName: inst[FIELD_NOMBRE_INSTITUCIONES],
                    isNew: !!inst[FIELD_CONVENIO_NUEVO_INSTITUCIONES],
                });
            }
        });

        const institutionsPreviousYearGroupNames = new Set<string>();
        data.launches.forEach(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            if (date?.getUTCFullYear() === previousYear && launch[FIELD_NOMBRE_PPS_LANZAMIENTOS]) {
                institutionsPreviousYearGroupNames.add(normalizeStringForComparison(getGroupName(launch[FIELD_NOMBRE_PPS_LANZAMIENTOS])));
            }
        });

        const groupsTargetYear = new Map<string, { totalCupos: number; subPps: { name: string; cupos: number }[]; }>();
        data.launches.forEach(launch => {
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            const originalName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (date?.getUTCFullYear() === targetYear && originalName) {
                const groupName = getGroupName(originalName);
                const normGroupName = normalizeStringForComparison(groupName);
                
                if (!groupsTargetYear.has(normGroupName)) {
                    groupsTargetYear.set(normGroupName, { totalCupos: 0, subPps: [] });
                }
                
                const group = groupsTargetYear.get(normGroupName)!;
                const cupos = Number(launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);
                group.totalCupos += cupos;
                group.subPps.push({ name: originalName, cupos });
            }
        });

        const confirmed: GroupedInstitutionInfo[] = [];
        const suggested: GroupedInstitutionInfo[] = [];

        for (const [normGroupName, groupData] of groupsTargetYear.entries()) {
            const groupName = getGroupName(groupData.subPps[0].name);
            let representativeInst = institutionMap.get(normGroupName);
            if (!representativeInst) {
                for (const sub of groupData.subPps) {
                    representativeInst = institutionMap.get(normalizeStringForComparison(sub.name));
                    if (representativeInst) break;
                }
            }
            if (!representativeInst) continue;

            const finalGroupData: GroupedInstitutionInfo = {
                id: representativeInst.id,
                groupName,
                totalCupos: groupData.totalCupos,
                subPps: groupData.subPps.sort((a, b) => a.name.localeCompare(b.name)),
            };

            if (representativeInst.isNew) {
                confirmed.push(finalGroupData);
            } else if (!institutionsPreviousYearGroupNames.has(normGroupName)) {
                suggested.push(finalGroupData);
            }
        }
        
        return {
            confirmedNewConvenios: confirmed.sort((a,b) => a.groupName.localeCompare(b.groupName)),
            suggestedNewConvenios: suggested.sort((a,b) => a.groupName.localeCompare(b.groupName)),
        };
    }, [data, targetYear]);
    
    useEffect(() => {
        if (data?.institutions) {
            const initialStatusMap = new Map<string, { isNew: boolean }>();
            data.institutions.forEach(inst => {
                initialStatusMap.set(inst.id, {
                    isNew: !!inst[FIELD_CONVENIO_NUEVO_INSTITUCIONES],
                });
            });
            setInitialStatus(initialStatusMap);

            const newSelection = new Map<string, boolean>();
            confirmedNewConvenios.forEach(group => newSelection.set(group.id, true));
            suggestedNewConvenios.forEach(group => newSelection.set(group.id, false));
            setSelection(newSelection);
        }
    }, [data, confirmedNewConvenios, suggestedNewConvenios]);
    
    const mutation = useMutation({
        mutationFn: (recordsToUpdate: { id: string; fields: Partial<InstitucionFields> }[]) => 
            updateAirtableRecords(AIRTABLE_TABLE_NAME_INSTITUCIONES, recordsToUpdate),
        onSuccess: () => {
            setToastInfo({ message: 'Cambios guardados exitosamente.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['nuevosConveniosData'] });
            // Invalidate dashboard data to update the KPI
            queryClient.invalidateQueries({ queryKey: ['metricsDashboardData', 2025] });
        },
        onError: (err) => {
            setToastInfo({ message: `Error al guardar: ${err.message}`, type: 'error' });
        }
    });

    const handleToggleSelection = (groupId: string) => {
        setSelection(prev => {
            const newSelection = new Map(prev);
            newSelection.set(groupId, !prev.get(groupId));
            return newSelection;
        });
    };

    const changesToSave = useMemo(() => {
        const changes: { id: string, fields: Partial<InstitucionFields> }[] = [];
        const allDisplayedGroups = [
            ...confirmedNewConvenios,
            ...suggestedNewConvenios
        ];

        for (const group of allDisplayedGroups) {
            const isSelectedInUI = selection.get(group.id) ?? false;
            const initial = initialStatus.get(group.id) || { isNew: false };
            
            if (isSelectedInUI !== initial.isNew) {
                changes.push({ id: group.id, fields: { [FIELD_CONVENIO_NUEVO_INSTITUCIONES]: isSelectedInUI } });
            }
        }
        return changes;
    }, [selection, initialStatus, confirmedNewConvenios, suggestedNewConvenios]);

    const handleSaveChanges = useCallback(() => {
        if (changesToSave.length > 0) {
            mutation.mutate(changesToSave);
        }
    }, [changesToSave, mutation]);


    if (isLoading) return <div className="flex justify-center p-8"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error al Cargar Datos" message={error.message} />;

    const renderList = (list: GroupedInstitutionInfo[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map(group => {
                const isSelected = selection.get(group.id) ?? false;
                const isExpanded = expandedGroups.has(group.groupName);
                return (
                    <div key={group.id} className={`bg-white dark:bg-slate-800/50 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'border-emerald-400 dark:border-emerald-500 shadow-sm' : 'border-slate-200/80 dark:border-slate-700'}`}>
                        <div className="flex items-start gap-3 p-4">
                            <button onClick={() => handleToggleSelection(group.id)} className="flex-shrink-0 mt-1">
                                <span className={`material-icons !text-2xl transition-colors ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                            </button>
                            <div className="flex-grow">
                                <p className={`font-bold ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-100'}`}>{group.groupName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold">{group.totalCupos}</span> cupos en <span className="font-semibold">{group.subPps.length}</span> PPS
                                </p>
                            </div>
                            <button onClick={() => toggleExpanded(group.groupName)} className="flex-shrink-0 p-2 -m-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                <span className={`material-icons !text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                        </div>
                        {isExpanded && (
                            <div className="border-t border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 p-4 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Desglose de PPS</h5>
                                <ul className="space-y-1.5">
                                    {group.subPps.map(pps => (
                                        <li key={pps.name} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-700 dark:text-slate-300">{pps.name.replace(`${group.groupName} - `, '')}</span>
                                            <span className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded-md">{pps.cupos} cupos</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="animate-fade-in-up space-y-8">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
             <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Herramienta de Convenios Nuevos</h2>
                <div className="relative w-full sm:w-48">
                     <label htmlFor="year-selector" className="sr-only">Seleccionar año</label>
                     <select 
                        id="year-selector"
                        value={targetYear} 
                        onChange={e => setTargetYear(Number(e.target.value))}
                        className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                     >
                        {/* FIX: Explicitly type 'year' to resolve type inference issues. */}
                         {availableYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
                     </select>
                     <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 pointer-events-none">expand_more</span>
                </div>
            </div>

            <Card
                icon="fact_check"
                title={`Convenios Nuevos Confirmados (${targetYear})`}
                description={`Esta es la lista de instituciones marcadas como nuevos convenios para el ciclo ${targetYear}. Desmarca una para que vuelva a aparecer como sugerencia.`}
            >
                {confirmedNewConvenios.length > 0 ? (
                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                        {renderList(confirmedNewConvenios)}
                    </div>
                ) : (
                    <div className="mt-4">
                        <EmptyState 
                            icon="checklist"
                            title="Sin Convenios Confirmados"
                            message={`Aún no se ha confirmado ningún convenio nuevo para ${targetYear}. Las sugerencias aparecerán abajo.`}
                        />
                    </div>
                )}
            </Card>

            <Card
                icon="lightbulb"
                title={`Sugerencias para Revisar (${targetYear})`}
                description={`Hemos identificado ${suggestedNewConvenios.length} instituciones que podrían ser convenios nuevos. Marca las que quieres confirmar.`}
            >
                {suggestedNewConvenios.length > 0 ? (
                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                        {renderList(suggestedNewConvenios)}
                    </div>
                ) : (
                    <div className="mt-4">
                        <EmptyState 
                            icon="celebration"
                            title="No hay sugerencias nuevas"
                            message={`Parece que todas las instituciones nuevas para ${targetYear} ya han sido confirmadas o no se encontraron nuevas oportunidades en comparación con ${targetYear - 1}.`}
                        />
                    </div>
                )}
            </Card>

            {changesToSave.length > 0 && (
                <div className="flex justify-end sticky bottom-4">
                    <button
                        onClick={handleSaveChanges}
                        disabled={mutation.isPending}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl text-base transition-all duration-200 shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        {mutation.isPending ? (
                             <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/><span>Guardando...</span></>
                        ) : (
                             <><span className="material-icons !text-base">save</span><span>Guardar Cambios ({changesToSave.length})</span></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NuevosConvenios;