import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllAirtableData, updateAirtableRecord } from '../services/airtableService';
import type { LanzamientoPPS } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { normalizeStringForComparison, getEspecialidadClasses, formatDate } from '../utils/formatters';
import { ALL_ORIENTACIONES } from '../types';

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
const GESTION_STATUS_OPTIONS = ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'];

interface GestionCardProps {
  pps: LanzamientoPPS;
  onSave: (id: string, updates: Partial<LanzamientoPPS>) => Promise<boolean>;
  isUpdating: boolean;
  cardType: 'activasYPorFinalizar' | 'finalizadasParaReactivar' | 'relanzamientosConfirmados';
}

const GestionCard: React.FC<GestionCardProps> = React.memo(({ pps, onSave, isUpdating, cardType }) => {
  const [status, setStatus] = useState(pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión');
  const [notes, setNotes] = useState(pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '');
  const [relaunchDate, setRelaunchDate] = useState(() => {
    const dateStr = pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS];
    if (!dateStr) return '';
    // If it's already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // If it's MM/DD/YYYY, convert to YYYY-MM-DD for the input
    const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
        const [, month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return ''; // Unrecognized format
  });
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const especialidadVisuals = getEspecialidadClasses(pps[FIELD_ORIENTACION_LANZAMIENTOS]);

  const hasChanges = useMemo(() => {
    const originalStatus = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión';
    const originalNotes = pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '';
    const originalRelaunchDate = pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS] || '';

    let currentRelaunchDateForCompare = '';
    if (relaunchDate) {
        const [year, month, day] = relaunchDate.split('-');
        currentRelaunchDateForCompare = `${month}/${day}/${year}`;
    }

    return status !== originalStatus || notes !== originalNotes || currentRelaunchDateForCompare !== originalRelaunchDate;
  }, [status, notes, relaunchDate, pps]);

  const handleSave = async () => {
    setError(null);
    if (!hasChanges) return;
    if (status === 'Relanzamiento Confirmado' && !relaunchDate) {
        setError('Por favor, selecciona una fecha de relanzamiento.');
        return;
    }

    const updates = {
      [FIELD_ESTADO_GESTION_LANZAMIENTOS]: status,
      [FIELD_NOTAS_GESTION_LANZAMIENTOS]: notes,
      [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: status === 'Relanzamiento Confirmado' && relaunchDate
        ? (() => {
            const [year, month, day] = relaunchDate.split('-');
            return `${month}/${day}/${year}`; // Convert YYYY-MM-DD to MM/DD/YYYY
          })()
        : null,
    };
    
    const success = await onSave(pps.id, updates);
    if (success) {
      setIsJustSaved(true);
      setTimeout(() => setIsJustSaved(false), 2000);
    }
  };
  
  const headerBg = isJustSaved ? 'bg-emerald-100' : especialidadVisuals.headerBg;
  const headerIconColor = isJustSaved ? 'text-emerald-700' : especialidadVisuals.headerText;
  const headerTextColor = isJustSaved ? 'text-emerald-900' : especialidadVisuals.headerText;
  
  const cardIcon = useMemo(() => {
    if (cardType === 'activasYPorFinalizar') return 'pending_actions';
    if (cardType === 'finalizadasParaReactivar') return 'history';
    return 'event_repeat'; // For relanzamientosConfirmados
  }, [cardType]);
  
  const timeBadge = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (cardType === 'activasYPorFinalizar') {
        const endDate = pps[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(pps[FIELD_FECHA_FIN_LANZAMIENTOS]) : null;
        if (!endDate || endDate < today) return null;

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Finaliza hoy', color: 'bg-red-100 text-red-800 ring-red-200', icon: 'event_busy' };
        if (diffDays <= 30) return { text: `Finaliza en ${diffDays} día${diffDays !== 1 ? 's' : ''}`, color: 'bg-amber-100 text-amber-800 ring-amber-200', icon: 'hourglass_top' };
        
        const startDate = pps[FIELD_FECHA_INICIO_LANZAMIENTOS] ? new Date(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]) : null;
        if (startDate && startDate <= today && endDate >= today) {
             return { text: 'Activa', color: 'bg-green-100 text-green-800 ring-green-200', icon: 'sync' };
        }
    }

    if (cardType === 'finalizadasParaReactivar') {
        return { text: `Finalizó ${formatDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS])}`, color: 'bg-slate-100 text-slate-600 ring-slate-200', icon: 'history_toggle_off' };
    }
    
    if (cardType === 'relanzamientosConfirmados' && pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]) {
        return { text: `Relanza ${formatDate(pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS])}`, color: 'bg-indigo-100 text-indigo-800 ring-indigo-200', icon: 'flight_takeoff' };
    }
    
    return null;
  }, [pps, cardType]);

  const isEnConversacion = status === 'En Conversación';

  return (
    <div className={`relative bg-white rounded-xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-px group overflow-hidden ${isEnConversacion ? 'border-sky-300 ring-2 ring-sky-50' : 'border-slate-200/60'}`}>
        {/* Header */}
        <div className={`p-4 border-b border-slate-200/60 flex justify-between items-start gap-3 transition-colors duration-500 ${headerBg}`}>
            <div className="flex-grow">
                <div className="flex items-center gap-2.5">
                    <span className={`material-icons !text-lg ${headerIconColor}`}>{cardIcon}</span>
                    <h4 className={`font-extrabold tracking-tight ${headerTextColor}`}>
                        {pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                    </h4>
                </div>
                <div className="mt-2 ml-9">
                    <span className={`${especialidadVisuals.tag} shadow-sm`}>{pps[FIELD_ORIENTACION_LANZAMIENTOS]}</span>
                </div>
            </div>
            {timeBadge?.text && (
            <div className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${timeBadge.color}`}>
                <span className="material-icons !text-sm">{timeBadge.icon}</span>
                <span>{timeBadge.text}</span>
            </div>
            )}
        </div>
        
        <div className="p-4 bg-gradient-to-br from-white to-slate-50/50 space-y-4">
            {/* Form */}
            <div className="space-y-3">
                <div>
                    <label htmlFor={`status-${pps.id}`} className="text-xs font-semibold text-slate-600 mb-1 block">Estado de Gestión</label>
                    <div className="relative">
                        <select 
                            id={`status-${pps.id}`} 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white shadow-sm outline-none appearance-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
                        >
                            {GESTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                            <span className="material-icons !text-base text-slate-500">expand_more</span>
                        </div>
                    </div>
                </div>
                {status === 'Relanzamiento Confirmado' && (
                    <div className="animate-fade-in-up">
                        <label htmlFor={`relaunch-${pps.id}`} className="text-xs font-semibold text-slate-600 mb-1 block">Fecha de Relanzamiento</label>
                        <input
                            type="date"
                            id={`relaunch-${pps.id}`}
                            value={relaunchDate}
                            onChange={(e) => setRelaunchDate(e.target.value)}
                            className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
                        />
                         {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </div>
                )}
                <div>
                    <label htmlFor={`notes-${pps.id}`} className="text-xs font-semibold text-slate-600 mb-1 block">Notas de Gestión</label>
                    <textarea 
                        id={`notes-${pps.id}`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3} 
                        className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-white shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition" 
                        placeholder="Conversaciones, próximos pasos..."
                    />
                </div>
            </div>

            {/* Footer/Actions */}
            <div className="flex justify-end pt-2">
                <button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges || isJustSaved}
                className={`font-bold py-2 px-5 rounded-lg text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 relative overflow-hidden
                    ${isJustSaved
                        ? 'bg-emerald-600 text-white cursor-default'
                        : isUpdating
                            ? 'bg-slate-500 text-white cursor-wait'
                            : hasChanges
                                ? 'bg-slate-800 text-white hover:bg-slate-700 hover:-translate-y-px transform active:scale-95'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }
                `}
                >
                {isUpdating ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">{isJustSaved ? 'check_circle_outline' : 'save'}</span>}
                <span>{isUpdating ? 'Guardando...' : (isJustSaved ? '¡Guardado!' : 'Guardar Cambios')}</span>
                </button>
            </div>
        </div>
    </div>
  );
});

const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode; defaultOpen?: boolean; icon: string; iconBgColor: string; iconColor: string; borderColor: string; }> = ({ title, count, children, defaultOpen = true, icon, iconBgColor, iconColor, borderColor }) => (
    <details className="group/details" open={defaultOpen}>
        <summary className="list-none flex items-center gap-4 cursor-pointer mb-4 p-2 rounded-lg transition-colors hover:bg-slate-50">
            <div className={`flex-shrink-0 size-10 rounded-lg flex items-center justify-center ${iconBgColor}`}>
                <span className={`material-icons ${iconColor}`}>{icon}</span>
            </div>
            <div className="flex-grow">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
            </div>
            <span className="text-base font-bold text-slate-700 bg-slate-200 h-8 w-8 flex items-center justify-center rounded-full">{count}</span>
            <span className="material-icons text-slate-400 transition-transform duration-300 group-open/details:rotate-90">chevron_right</span>
        </summary>
        <div className={`pl-4 ml-5 border-l-2 ${borderColor}`}>
            {children}
        </div>
    </details>
);

interface ConvocatoriaManagerProps {
  forcedOrientation?: string;
}

const ConvocatoriaManager: React.FC<ConvocatoriaManagerProps> = ({ forcedOrientation }) => {
    const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
    const [loadingState, setLoadingState] = useState<LoadingState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [orientationFilter, setOrientationFilter] = useState('all');

    const fetchData = useCallback(async () => {
        setLoadingState('loading');
        setError(null);
        
        const { records, error: fetchError } = await fetchAllAirtableData<LanzamientoPPS>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [
                FIELD_NOMBRE_PPS_LANZAMIENTOS,
                FIELD_FECHA_INICIO_LANZAMIENTOS,
                FIELD_FECHA_FIN_LANZAMIENTOS,
                FIELD_ORIENTACION_LANZAMIENTOS,
                FIELD_ESTADO_GESTION_LANZAMIENTOS,
                FIELD_NOTAS_GESTION_LANZAMIENTOS,
                FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
            ],
            undefined,
            [{ field: FIELD_FECHA_FIN_LANZAMIENTOS, direction: 'desc' }]
        );

        if (fetchError) {
            setError('No se pudieron cargar las convocatorias. ' + (typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message));
            setLoadingState('error');
        } else {
            const mappedRecords = records.map(r => ({ ...r.fields, id: r.id }));
            setLanzamientos(mappedRecords);
            setLoadingState('loaded');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = useCallback(async (id: string, updates: Partial<LanzamientoPPS>): Promise<boolean> => {
        setUpdatingIds(prev => new Set(prev).add(id));

        const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, id, updates);
        
        let success = false;
        if (updateError) {
            setToastInfo({ message: 'Error al actualizar la práctica.', type: 'error' });
        } else {
            setToastInfo({ message: 'Práctica actualizada exitosamente.', type: 'success' });
            // Refetch to ensure data integrity and correct section placement
            fetchData();
            success = true;
        }

        setUpdatingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });

        return success;
    }, [fetchData]);

    const filteredData = useMemo(() => {
        return lanzamientos.filter(pps => {
            const matchesSearch = searchTerm === '' || normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]).includes(normalizeStringForComparison(searchTerm));
            
            const ppsOrientation = normalizeStringForComparison(pps[FIELD_ORIENTACION_LANZAMIENTOS]);

            if (forcedOrientation) {
                const requiredOrientation = normalizeStringForComparison(forcedOrientation);
                return matchesSearch && ppsOrientation === requiredOrientation;
            }
            
            const selectedOrientation = normalizeStringForComparison(orientationFilter);
            const matchesOrientation = selectedOrientation === 'all' || ppsOrientation === selectedOrientation;
            
            return matchesSearch && matchesOrientation;
        });
    }, [lanzamientos, searchTerm, orientationFilter, forcedOrientation]);

    const { finalizadasParaReactivar, relanzamientosConfirmados, activasYPorFinalizar } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        // 1. Group all filtered PPS by institution name
        const ppsByInstitution = new Map<string, LanzamientoPPS[]>();
        for (const pps of filteredData) {
            const institutionName = pps[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (!institutionName) continue;
            const normalizedName = normalizeStringForComparison(institutionName);
            if (!ppsByInstitution.has(normalizedName)) {
                ppsByInstitution.set(normalizedName, []);
            }
            ppsByInstitution.get(normalizedName)!.push(pps);
        }

        // 2. For each institution, find the single most recent record based on end date
        const latestPpsPerInstitution: LanzamientoPPS[] = [];
        for (const ppsList of ppsByInstitution.values()) {
            if (ppsList.length > 0) {
                const latestPps = ppsList.sort((a, b) => {
                    const dateA = a[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(a[FIELD_FECHA_FIN_LANZAMIENTOS]).getTime() : 0;
                    const dateB = b[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(b[FIELD_FECHA_FIN_LANZAMIENTOS]).getTime() : 0;
                    return dateB - dateA;
                })[0];
                latestPpsPerInstitution.push(latestPps);
            }
        }
    
        // 3. Categorize these latest records
        const fin: LanzamientoPPS[] = [];
        const conf: LanzamientoPPS[] = [];
        const act: LanzamientoPPS[] = [];
        const nonManagedStatuses = ['Archivado', 'No se Relanza'];
    
        for (const pps of latestPpsPerInstitution) {
            const gestionStatus = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS];
            if (nonManagedStatuses.includes(gestionStatus!)) {
                continue;
            }
    
            const endDate = pps[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(pps[FIELD_FECHA_FIN_LANZAMIENTOS]) : null;
    
            if (gestionStatus === 'Relanzamiento Confirmado' && pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]) {
                conf.push(pps);
            } else if (endDate && endDate >= today) {
                act.push(pps);
            } else if (endDate && endDate < today) {
                fin.push(pps);
            }
        }
        
        act.sort((a, b) => new Date(a[FIELD_FECHA_FIN_LANZAMIENTOS]!).getTime() - new Date(b[FIELD_FECHA_FIN_LANZAMIENTOS]!).getTime());
        conf.sort((a, b) => new Date(a[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]!).getTime() - new Date(b[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]!).getTime());
        fin.sort((a, b) => {
            const aIsEnConversacion = a[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'En Conversación';
            const bIsEnConversacion = b[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'En Conversación';
            if (aIsEnConversacion && !bIsEnConversacion) return -1;
            if (!aIsEnConversacion && bIsEnConversacion) return 1;

            const dateA = a[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(a[FIELD_FECHA_FIN_LANZAMIENTOS]).getTime() : 0;
            const dateB = b[FIELD_FECHA_FIN_LANZAMIENTOS] ? new Date(b[FIELD_FECHA_FIN_LANZAMIENTOS]).getTime() : 0;
            return dateB - dateA;
        });
    
        return { finalizadasParaReactivar: fin, relanzamientosConfirmados: conf, activasYPorFinalizar: act };
    }, [filteredData]);

    const renderContent = () => {
        if (loadingState === 'loading' || loadingState === 'initial') return <Loader />;
        if (loadingState === 'error') return <EmptyState icon="error" title="Error" message={error!} />;
        if (lanzamientos.length === 0) return <EmptyState icon="folder_off" title="Sin Prácticas" message="No se encontraron prácticas para gestionar." />;
        
        const hasActivas = activasYPorFinalizar.length > 0;
        const hasFinalizadas = finalizadasParaReactivar.length > 0;
        const hasConfirmados = relanzamientosConfirmados.length > 0;

        if (!hasActivas && !hasFinalizadas && !hasConfirmados && (searchTerm || orientationFilter !== 'all' || forcedOrientation)) {
            return <EmptyState icon="search_off" title="Sin Resultados" message="No se encontraron prácticas que coincidan con los filtros aplicados." />;
        }

        return (
            <div className="space-y-6">
                <section>
                    <CollapsibleSection 
                        title="Finalizadas (Para Reactivar)"
                        count={finalizadasParaReactivar.length}
                        icon="history"
                        iconBgColor="bg-sky-100"
                        iconColor="text-sky-600"
                        borderColor="border-sky-300"
                    >
                        {hasFinalizadas ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                                {finalizadasParaReactivar.map(pps => (
                                    <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="finalizadasParaReactivar" />
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm p-4 bg-white rounded-lg border border-slate-200/70">No hay prácticas finalizadas este año pendientes de gestión.</p>
                        )}
                    </CollapsibleSection>
                </section>
                
                <section>
                     <CollapsibleSection 
                        title="Relanzamientos Confirmados"
                        count={relanzamientosConfirmados.length}
                        icon="event_repeat"
                        iconBgColor="bg-indigo-100"
                        iconColor="text-indigo-600"
                        borderColor="border-indigo-300"
                    >
                        {hasConfirmados ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                               {relanzamientosConfirmados.map(pps => (
                                    <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="relanzamientosConfirmados" />
                               ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm p-4 bg-white rounded-lg border border-slate-200/70">No hay prácticas con relanzamiento confirmado.</p>
                        )}
                    </CollapsibleSection>
                </section>

                <section>
                    <CollapsibleSection 
                        title="Activas y Próximas a Finalizar"
                        count={activasYPorFinalizar.length}
                        icon="pending_actions"
                        iconBgColor="bg-amber-100"
                        iconColor="text-amber-600"
                        borderColor="border-amber-300"
                    >
                        {hasActivas ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                               {activasYPorFinalizar.map(pps => (
                                    <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="activasYPorFinalizar" />
                               ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm p-4 bg-white rounded-lg border border-slate-200/70">No hay prácticas activas o finalizando en los próximos 30 días.</p>
                        )}
                    </CollapsibleSection>
                </section>
            </div>
        );
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Buscar por institución..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                    </div>
                    
                    {!forcedOrientation ? (
                        <div className="relative w-full sm:w-60">
                            <select 
                            value={orientationFilter} 
                            onChange={(e) => setOrientationFilter(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                            >
                                <option value="all">Todas las Orientaciones</option>
                                {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-2 rounded-lg border border-blue-200/80">
                            <span className="material-icons !text-base">filter_alt</span>
                            <span>Mostrando: {forcedOrientation}</span>
                        </div>
                    )}
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default ConvocatoriaManager;