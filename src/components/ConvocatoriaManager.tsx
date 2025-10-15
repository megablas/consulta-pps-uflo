import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchAllAirtableData, updateAirtableRecord, createAirtableRecord, updateAirtableRecords } from '../services/airtableService';
import type { LanzamientoPPS, Practica, InstitucionFields, AirtableRecord, LanzamientoPPSFields, PracticaFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_TELEFONO_INSTITUCIONES,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { normalizeStringForComparison, getEspecialidadClasses, formatDate, parseToUTCDate } from '../utils/formatters';
import { ALL_ORIENTACIONES } from '../types';

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
const GESTION_STATUS_OPTIONS = ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'];

interface GestionCardProps {
  pps: LanzamientoPPS;
  onSave: (id: string, updates: Partial<LanzamientoPPS>) => Promise<boolean>;
  isUpdating: boolean;
  cardType: 'activasYPorFinalizar' | 'finalizadasParaReactivar' | 'relanzamientosConfirmados' | 'activasIndefinidas';
  institution?: { id: string; phone?: string };
  onSavePhone: (institutionId: string, phone: string) => Promise<boolean>;
}

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    // Splits by " - " and takes the first part. Handles cases where there's no hyphen.
    return name.split(' - ')[0].trim();
};

const GestionCard: React.FC<GestionCardProps> = React.memo(({ pps, onSave, isUpdating, cardType, institution, onSavePhone }) => {
  const [status, setStatus] = useState(pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión');
  const [notes, setNotes] = useState(pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '');
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const especialidadVisuals = getEspecialidadClasses(pps[FIELD_ORIENTACION_LANZAMIENTOS]);
  
  const hasChanges = useMemo(() => {
    const originalStatus = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión';
    const originalNotes = pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '';
    
    const statusChanged = status !== originalStatus;
    const notesChanged = notes !== originalNotes;

    return statusChanged || notesChanged;
  }, [status, notes, pps]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    const updates: Partial<LanzamientoPPS> = {
      [FIELD_ESTADO_GESTION_LANZAMIENTOS]: status,
      [FIELD_NOTAS_GESTION_LANZAMIENTOS]: notes,
    };
    
    const success = await onSave(pps.id, updates);
    if (success) {
      setIsJustSaved(true);
      setTimeout(() => setIsJustSaved(false), 2000);
    }
  };

  const handleWhatsAppClick = () => {
    if (!institution?.phone) return;
    const cleanPhone = institution.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSavePhone = async () => {
    if (!institution || !newPhone.trim()) return;
    const success = await onSavePhone(institution.id, newPhone.trim());
    if (success) {
      setIsEditingPhone(false);
      setNewPhone('');
    }
  };
  
  const headerBg = isJustSaved ? 'bg-emerald-100 dark:bg-emerald-900/30' : especialidadVisuals.headerBg;
  const headerIconColor = isJustSaved ? 'text-emerald-700 dark:text-emerald-300' : especialidadVisuals.headerText;
  const headerTextColor = isJustSaved ? 'text-emerald-900 dark:text-emerald-200' : especialidadVisuals.headerText;
  
  const cardIcon = useMemo(() => {
    if (cardType === 'activasIndefinidas') return 'hourglass_empty';
    if (cardType === 'activasYPorFinalizar') return 'pending_actions';
    if (cardType === 'finalizadasParaReactivar') return 'history';
    return 'event_repeat';
  }, [cardType]);
  
  const timeBadge = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (cardType === 'activasIndefinidas') {
        return { text: 'Sin fecha de fin', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-600', icon: 'date_range' };
    }

    if (cardType === 'activasYPorFinalizar') {
        const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
        // If there's no end date, we can't show remaining time, so we show nothing.
        if (!endDate) return null;

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // This card type is for active/upcoming, so we shouldn't see negative days, but as a safeguard.
        if (diffDays < 0) return null;

        if (diffDays === 0) {
            return { text: 'Finaliza hoy', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 ring-red-200 dark:ring-red-700', icon: 'event_busy' };
        }
        
        const text = `Finaliza en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
        
        // Use amber for anything ending in the next 30 days
        if (diffDays <= 30) {
             return { text, color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 ring-amber-200 dark:ring-amber-700', icon: 'hourglass_top' };
        }

        // Use green for practices ending further out
        return { text, color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 ring-green-200 dark:ring-green-700', icon: 'event_available' };
    }

    if (cardType === 'finalizadasParaReactivar') {
        return { text: `Finalizó ${formatDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS])}`, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-600', icon: 'history_toggle_off' };
    }
    
    if (cardType === 'relanzamientosConfirmados') {
        const relaunchDateValue = pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS];
        const text = relaunchDateValue ? `Relanza ${formatDate(relaunchDateValue)}` : 'Relanzamiento Confirmado';
        return { text, color: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 ring-indigo-200 dark:ring-indigo-700', icon: 'flight_takeoff' };
    }
    
    return null;
  }, [pps, cardType]);

  const isEnConversacion = status === 'En Conversación';
  const actionButtonClass = "font-bold py-2 px-4 rounded-lg text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 w-44";
  const cupos = pps[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS];

  return (
    <div className={`relative bg-white dark:bg-slate-800/50 rounded-xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-px group overflow-hidden ${isEnConversacion ? 'border-sky-300 dark:border-sky-500 ring-2 ring-sky-50 dark:ring-sky-900/50' : 'border-slate-200/60 dark:border-slate-700/60'}`}>
        <div className={`p-4 border-b border-slate-200/60 dark:border-slate-700 flex justify-between items-start gap-3 transition-colors duration-500 ${headerBg}`}>
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
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {timeBadge?.text && (
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${timeBadge.color}`}>
                    <span className="material-icons !text-sm">{timeBadge.icon}</span>
                    <span>{timeBadge.text}</span>
                </div>
                )}
                {cupos != null && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full ring-1 ring-slate-200 dark:ring-slate-600">
                        <span className="material-icons !text-sm">groups</span>
                        <span>{cupos} cupo{cupos !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/50 dark:to-slate-800/20 space-y-4">
            <div className="space-y-3">
                <div>
                    <label htmlFor={`status-${pps.id}`} className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Estado de Gestión</label>
                    <div className="relative">
                        <select 
                            id={`status-${pps.id}`} 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none appearance-none focus:border-slate-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-blue-400 transition"
                        >
                            {GESTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                            <span className="material-icons !text-base text-slate-500 dark:text-slate-400">expand_more</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor={`notes-${pps.id}`} className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Notas de Gestión</label>
                    <textarea 
                        id={`notes-${pps.id}`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3} 
                        className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-slate-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-blue-400 transition" 
                        placeholder="Conversaciones, próximos pasos..."
                    />
                </div>
            </div>

            <div className="flex justify-end items-stretch gap-3 pt-2">
                 {isEditingPhone ? (
                    <div className="flex items-center gap-2 w-44">
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Nº de teléfono"
                            className="flex-grow w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            autoFocus
                        />
                        <button onClick={handleSavePhone} className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors" aria-label="Guardar teléfono"><span className="material-icons !text-base">check</span></button>
                        <button onClick={() => setIsEditingPhone(false)} className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors" aria-label="Cancelar"><span className="material-icons !text-base">close</span></button>
                    </div>
                 ) : institution?.phone ? (
                    <button
                        onClick={handleWhatsAppClick}
                        type="button"
                        className={`${actionButtonClass} bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 hover:-translate-y-px transform active:scale-95`}
                        title={`Contactar a ${institution.phone}`}
                    >
                        <span className="material-icons !text-base">chat</span>
                        <span>Contactar</span>
                    </button>
                ) : (
                     <button
                        onClick={() => setIsEditingPhone(true)}
                        type="button"
                        className={`${actionButtonClass} bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-800/50 hover:-translate-y-px transform active:scale-95`}
                        disabled={!institution}
                     >
                         <span className="material-icons !text-base">add_call</span>
                         <span>Cargar Teléfono</span>
                     </button>
                )}

                <button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges || isJustSaved}
                className={`${actionButtonClass} relative overflow-hidden
                    ${isJustSaved
                        ? 'bg-emerald-600 text-white cursor-default'
                        : isUpdating
                            ? 'bg-slate-500 text-white cursor-wait'
                            : hasChanges
                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 hover:-translate-y-px transform active:scale-95'
                                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
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

const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode; defaultOpen?: boolean; icon: string; iconBgColor: string; iconColor: string; borderColor: string; actions?: React.ReactNode; }> = ({ title, count, children, defaultOpen = true, icon, iconBgColor, iconColor, borderColor, actions }) => (
    <details className="group/details" open={defaultOpen}>
        <summary className="list-none flex items-center gap-4 cursor-pointer mb-4 p-2 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className={`flex-shrink-0 size-10 rounded-lg flex items-center justify-center ${iconBgColor}`}>
                <span className={`material-icons ${iconColor}`}>{icon}</span>
            </div>
            <div className="flex-grow">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
            <span className="text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 h-8 w-8 flex items-center justify-center rounded-full">{count}</span>
            <span className="material-icons text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open/details:rotate-90">chevron_right</span>
        </summary>
        <div className={`pl-4 ml-5 border-l-2 ${borderColor}`}>
            {children}
        </div>
    </details>
);

interface ConvocatoriaManagerProps {
  forcedOrientations?: string[];
}

const ConvocatoriaManager: React.FC<ConvocatoriaManagerProps> = ({ forcedOrientations }) => {
    const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
    const [institutionsMap, setInstitutionsMap] = useState<Map<string, { id: string; phone?: string }>>(new Map());
    const [loadingState, setLoadingState] = useState<LoadingState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [orientationFilter, setOrientationFilter] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoadingState('loading');
        setError(null);
        
        const [lanzamientosRes, institucionesRes] = await Promise.all([
            fetchAllAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                [
                    FIELD_NOMBRE_PPS_LANZAMIENTOS,
                    FIELD_FECHA_INICIO_LANZAMIENTOS,
                    FIELD_FECHA_FIN_LANZAMIENTOS,
                    FIELD_ORIENTACION_LANZAMIENTOS,
                    FIELD_ESTADO_GESTION_LANZAMIENTOS,
                    FIELD_NOTAS_GESTION_LANZAMIENTOS,
                    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
                    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
                    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
                ],
                undefined,
                [{ field: FIELD_FECHA_FIN_LANZAMIENTOS, direction: 'desc' }]
            ),
            fetchAllAirtableData<InstitucionFields>(
                AIRTABLE_TABLE_NAME_INSTITUCIONES,
                [FIELD_NOMBRE_INSTITUCIONES, FIELD_TELEFONO_INSTITUCIONES]
            )
        ]);

        if (lanzamientosRes.error || institucionesRes.error) {
            const errorObj = (lanzamientosRes.error || institucionesRes.error)?.error;
            const errorMsg = typeof errorObj === 'string' ? errorObj : errorObj?.message || 'Error al cargar los datos.';
            setError('No se pudieron cargar los datos. ' + errorMsg);
            setLoadingState('error');
        } else {
            const newInstitutionsMap = new Map<string, { id: string; phone?: string }>();
            institucionesRes.records.forEach(record => {
                const name = record.fields[FIELD_NOMBRE_INSTITUCIONES];
                if (name) {
                    newInstitutionsMap.set(normalizeStringForComparison(name), {
                        id: record.id,
                        phone: record.fields[FIELD_TELEFONO_INSTITUCIONES]
                    });
                }
            });
            setInstitutionsMap(newInstitutionsMap);

            const mappedRecords = lanzamientosRes.records.map((r: AirtableRecord<LanzamientoPPSFields>) => ({ ...r.fields, id: r.id } as LanzamientoPPS));
            const filteredRecords = mappedRecords.filter(pps => 
                !String(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').toLowerCase().includes('uflo')
            );
            setLanzamientos(filteredRecords);
            setLoadingState('loaded');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (loadingState !== 'loaded' || lanzamientos.length === 0) {
            return;
        }
    
        const confirmedRelaunches = lanzamientos.filter(
            pps => pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'Relanzamiento Confirmado'
        );
    
        if (confirmedRelaunches.length === 0) {
            return;
        }
    
        const updatesToPerform: { id: string; fields: Partial<LanzamientoPPSFields> }[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
    
        confirmedRelaunches.forEach(oldLaunch => {
            const hasActiveRelaunch = lanzamientos.some(newLaunch => {
                if (newLaunch.id === oldLaunch.id) return false;
    
                const oldName = getGroupName(oldLaunch[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
                const newName = getGroupName(newLaunch[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
    
                if (normalizeStringForComparison(newName) !== normalizeStringForComparison(oldName)) {
                    return false;
                }
    
                const newStartDate = parseToUTCDate(newLaunch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                const oldRelaunchDate = parseToUTCDate(oldLaunch[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]);
                const oldEndDate = parseToUTCDate(oldLaunch[FIELD_FECHA_FIN_LANZAMIENTOS]);
                const referenceDate = oldRelaunchDate || oldEndDate;
    
                if (!newStartDate || !referenceDate || newStartDate <= referenceDate) {
                    return false;
                }
    
                const newEndDate = parseToUTCDate(newLaunch[FIELD_FECHA_FIN_LANZAMIENTOS]);
                return !newEndDate || newEndDate >= now;
            });
    
            if (hasActiveRelaunch) {
                updatesToPerform.push({
                    id: oldLaunch.id,
                    fields: { [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Archivado' }
                });
            }
        });
    
        if (updatesToPerform.length > 0) {
            const batchUpdate = async () => {
                const { error } = await updateAirtableRecords(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, updatesToPerform);
                if (error) {
                    setToastInfo({ message: 'Error al archivar relanzamientos completados.', type: 'error' });
                } else {
                    setToastInfo({ message: `${updatesToPerform.length} relanzamiento(s) completado(s) fue(ron) archivado(s) automáticamente.`, type: 'success' });
                    setTimeout(() => fetchData(), 500);
                }
            };
            batchUpdate();
        }
    }, [lanzamientos, loadingState, fetchData]);

    const handleSave = useCallback(async (id: string, updates: Partial<LanzamientoPPS>): Promise<boolean> => {
        setUpdatingIds(prev => new Set(prev).add(id));

        const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, id, updates);
        
        let success = false;
        if (updateError) {
            setToastInfo({ message: 'Error al actualizar la práctica.', type: 'error' });
        } else {
            setToastInfo({ message: 'Práctica actualizada exitosamente.', type: 'success' });
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

    const handleUpdateInstitutionPhone = useCallback(async (institutionId: string, phone: string): Promise<boolean> => {
      const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_INSTITUCIONES, institutionId, {
          [FIELD_TELEFONO_INSTITUCIONES]: phone
      });

      if (updateError) {
          setToastInfo({ message: 'Error al guardar el teléfono.', type: 'error' });
          return false;
      } else {
          setToastInfo({ message: 'Teléfono guardado exitosamente.', type: 'success' });
          setInstitutionsMap(prevMap => {
              const newMap = new Map(prevMap);
              for (const [key, value] of newMap.entries()) {
                  if ((value as { id: string, phone?: string }).id === institutionId) {
                      newMap.set(key, { ...(value as { id: string, phone?: string }), phone });
                      break;
                  }
              }
              return newMap;
          });
          return true;
      }
    }, []);

    const handleSync = async () => {
        if (!window.confirm('Esta acción buscará prácticas de los últimos dos años que no tengan un lanzamiento asociado y los creará. ¿Deseas continuar?')) {
            return;
        }
        
        setIsSyncing(true);
        setToastInfo({ message: 'Iniciando sincronización de prácticas antiguas...', type: 'success' });
    
        try {
            const existingLaunchKeys = new Set(
                lanzamientos.map(l => {
                    const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                    const date = l[FIELD_FECHA_INICIO_LANZAMIENTOS] || '';
                    if (!name || !date) return '';
                    return `${normalizeStringForComparison(name)}-${date}`;
                }).filter(Boolean)
            );
    
            const currentYear = new Date().getFullYear();
            const lastYearStart = new Date(currentYear - 1, 0, 1).toISOString().split('T')[0];
            const filterFormula = `IS_AFTER({${FIELD_FECHA_INICIO_PRACTICAS}}, DATETIME_PARSE('${lastYearStart}', 'YYYY-MM-DD'))`;
    
            const { records: recentPracticas, error: practicasError } = await fetchAllAirtableData<PracticaFields>(
                AIRTABLE_TABLE_NAME_PRACTICAS,
                [
                    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
                    FIELD_FECHA_INICIO_PRACTICAS,
                    FIELD_FECHA_FIN_PRACTICAS,
                    FIELD_ESPECIALIDAD_PRACTICAS,
                    FIELD_HORAS_PRACTICAS,
                ],
                filterFormula
            );
    
            if (practicasError) throw new Error('Error al obtener las prácticas antiguas desde Airtable.');
    
            const groupedPracticas = new Map<string, (PracticaFields & { id: string })[]>();
            const mappedPracticas: Practica[] = recentPracticas.map((p: AirtableRecord<PracticaFields>) => ({ ...p.fields, id: p.id }));

            for (const practica of mappedPracticas) {
                const nameRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                const name = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
                const date = practica[FIELD_FECHA_INICIO_PRACTICAS];
    
                if (!name || !date) continue;
                
                const key = `${normalizeStringForComparison(String(name))}-${date}`;
                if (!groupedPracticas.has(key)) {
                    groupedPracticas.set(key, []);
                }
                groupedPracticas.get(key)!.push(practica);
            }
    
            const newLaunchesToCreate: Partial<LanzamientoPPS>[] = [];
            for (const [key, practicasGroup] of groupedPracticas.entries()) {
                if (!existingLaunchKeys.has(key)) {
                    const templatePractica = practicasGroup[0];
                    const nameRaw = templatePractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                    const ppsName = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
                    
                    if (ppsName && String(ppsName).toLowerCase().includes('uflo')) {
                        continue;
                    }

                    const newLaunch = {
                        [FIELD_NOMBRE_PPS_LANZAMIENTOS]: String(ppsName),
                        [FIELD_FECHA_INICIO_LANZAMIENTOS]: templatePractica[FIELD_FECHA_INICIO_PRACTICAS],
                        [FIELD_FECHA_FIN_LANZAMIENTOS]: templatePractica[FIELD_FECHA_FIN_PRACTICAS],
                        [FIELD_ORIENTACION_LANZAMIENTOS]: templatePractica[FIELD_ESPECIALIDAD_PRACTICAS],
                        [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: templatePractica[FIELD_HORAS_PRACTICAS],
                        [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: practicasGroup.length,
                        [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado',
                        [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Archivado',
                    };
                    newLaunchesToCreate.push(newLaunch);
                }
            }
    
            if (newLaunchesToCreate.length === 0) {
                setToastInfo({ message: 'No se encontraron nuevas prácticas para sincronizar. Todo está al día.', type: 'success' });
                setIsSyncing(false);
                return;
            }
    
            let successfulCreations = 0;
            let failedCreations = 0;
            // FIX: The type `unknown` does not have a `length` property. The `newLaunchesToCreate` variable is already an array, so a direct access is correct and the type assertion is unnecessary.
            const totalToCreate: number = newLaunchesToCreate.length;

            for (let i = 0; i < totalToCreate; i++) {
                const launchData = newLaunchesToCreate[i];
                setToastInfo({ message: `Sincronizando ${i + 1} de ${totalToCreate}...`, type: 'success' });

                const { error } = await createAirtableRecord(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, launchData);
                
                if (error) {
                    failedCreations++;
                    console.error(`Error al crear el lanzamiento para ${launchData[FIELD_NOMBRE_PPS_LANZAMIENTOS]}:`, error);
                } else {
                    successfulCreations++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 250));
            }

            if (failedCreations > 0) {
                 throw new Error(`${failedCreations} de ${totalToCreate} lanzamientos no pudieron crearse. Revisa la consola para más detalles.`);
            }
    
            setToastInfo({ message: `¡Éxito! Se sincronizaron ${successfulCreations} nuevas convocatorias.`, type: 'success' });
            
            fetchData();
    
        } catch (e: any) {
            setToastInfo({ message: e.message || 'Ocurrió un error inesperado durante la sincronización.', type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredData = useMemo(() => {
        let processableItems = [...lanzamientos];

        if (forcedOrientations && forcedOrientations.length > 0) {
            const normalizedForced = forcedOrientations.map(normalizeStringForComparison);
            processableItems = processableItems.filter(pps => {
                const ppsOrientations = (pps[FIELD_ORIENTACION_LANZAMIENTOS] || '').split(',').map(o => normalizeStringForComparison(o.trim()));
                return ppsOrientations.some(o => normalizedForced.includes(o));
            });
        } else if (orientationFilter !== 'all') {
             processableItems = processableItems.filter(pps => normalizeStringForComparison(pps[FIELD_ORIENTACION_LANZAMIENTOS]) === normalizeStringForComparison(orientationFilter));
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            processableItems = processableItems.filter(pps => (pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').toLowerCase().includes(lowercasedTerm));
        }
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        // Priority 1: Active PPS (with end date)
        const activasYPorFinalizar = processableItems.filter(pps => {
            const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            return endDate && endDate >= now;
        }).sort((a, b) => (parseToUTCDate(a[FIELD_FECHA_FIN_LANZAMIENTOS])?.getTime() || 0) - (parseToUTCDate(b[FIELD_FECHA_FIN_LANZAMIENTOS])?.getTime() || 0));

        // Priority 2: Active PPS (without end date) but recent
        const fiveMonthsAgo = new Date(now);
        fiveMonthsAgo.setMonth(now.getMonth() - 5);

        const activasIndefinidas = processableItems.filter(pps => {
            // Must not have an end date to be in this category
            const hasEndDate = !!pps[FIELD_FECHA_FIN_LANZAMIENTOS];
            if (hasEndDate) {
                return false;
            }

            const startDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            // Hide if no start date is present, or if the start date is older than 5 months
            return startDate ? startDate >= fiveMonthsAgo : false;
        });
        
        // Get all remaining PPS (i.e., finished ones)
        const finishedPps = processableItems.filter(pps => {
            const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            return endDate && endDate < now;
        });
        
        // Priority 3: Confirmed Relaunches from the finished pile
        const relanzamientosConfirmados = finishedPps.filter(
            pps => pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'Relanzamiento Confirmado'
        );
        
        // Priority 4: Finished PPS needing action from the finished pile
        const finalizadasParaReactivar = finishedPps.filter(pps => {
            const status = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || '';
            return status !== 'Relanzamiento Confirmado' && status !== 'Archivado' && status !== 'No se Relanza';
        });

        return { activasYPorFinalizar, finalizadasParaReactivar, relanzamientosConfirmados, activasIndefinidas };
    }, [lanzamientos, searchTerm, orientationFilter, forcedOrientations]);


    const renderContent = () => {
        if (loadingState === 'loading' || loadingState === 'initial') return <Loader />;
        if (loadingState === 'error') return <EmptyState icon="error" title="Error" message={error!} />;
        
        const noResults = Object.values(filteredData).every(arr => arr.length === 0);
        if (noResults) {
             return <EmptyState icon="search_off" title="Sin Resultados" message="No se encontraron convocatorias que coincidan con los filtros seleccionados." />;
        }

        return (
             <div className="space-y-8">
                {filteredData.relanzamientosConfirmados.length > 0 && (
                    <CollapsibleSection 
                        title="Relanzamientos Confirmados" 
                        count={filteredData.relanzamientosConfirmados.length}
                        icon="event_repeat"
                        iconBgColor="bg-indigo-100 dark:bg-indigo-900/50"
                        iconColor="text-indigo-600 dark:text-indigo-300"
                        borderColor="border-indigo-300 dark:border-indigo-600"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredData.relanzamientosConfirmados.map(pps => <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="relanzamientosConfirmados" institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} onSavePhone={handleUpdateInstitutionPhone} />)}
                        </div>
                    </CollapsibleSection>
                )}
                 {filteredData.activasIndefinidas.length > 0 && (
                     <CollapsibleSection 
                        title="Activas (Sin Fecha de Fin)" 
                        count={filteredData.activasIndefinidas.length}
                        icon="hourglass_empty"
                        iconBgColor="bg-slate-100 dark:bg-slate-700"
                        iconColor="text-slate-600 dark:text-slate-300"
                        borderColor="border-slate-300 dark:border-slate-600"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredData.activasIndefinidas.map(pps => <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="activasIndefinidas" institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} onSavePhone={handleUpdateInstitutionPhone} />)}
                        </div>
                    </CollapsibleSection>
                 )}
                {filteredData.activasYPorFinalizar.length > 0 && (
                    <CollapsibleSection 
                        title="Activas y Próximas a Finalizar" 
                        count={filteredData.activasYPorFinalizar.length}
                        icon="pending_actions"
                        iconBgColor="bg-green-100 dark:bg-green-900/50"
                        iconColor="text-green-600 dark:text-green-300"
                        borderColor="border-green-300 dark:border-green-600"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredData.activasYPorFinalizar.map(pps => <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="activasYPorFinalizar" institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} onSavePhone={handleUpdateInstitutionPhone} />)}
                        </div>
                    </CollapsibleSection>
                )}
                {filteredData.finalizadasParaReactivar.length > 0 && (
                    <CollapsibleSection 
                        title="Finalizadas para Reactivar" 
                        count={filteredData.finalizadasParaReactivar.length}
                        icon="history"
                        iconBgColor="bg-amber-100 dark:bg-amber-900/50"
                        iconColor="text-amber-600 dark:text-amber-300"
                        borderColor="border-amber-300 dark:border-amber-600"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredData.finalizadasParaReactivar.map(pps => <GestionCard key={pps.id} pps={pps} onSave={handleSave} isUpdating={updatingIds.has(pps.id)} cardType="finalizadasParaReactivar" institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} onSavePhone={handleUpdateInstitutionPhone} />)}
                        </div>
                    </CollapsibleSection>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
             <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Panel de Gestión de Prácticas</h2>
                 <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    {!forcedOrientations && (
                        <div className="relative w-full sm:w-48">
                             <select id="orientation-filter" value={orientationFilter} onChange={e => setOrientationFilter(e.target.value)} className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                                 <option value="all">Todas las Orientaciones</option>
                                 {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 pointer-events-none">expand_more</span>
                        </div>
                    )}
                    <div className="relative w-full sm:w-72">
                        <input id="pps-filter" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar por nombre de PPS..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500">search</span>
                    </div>
                 </div>
            </div>

            {renderContent()}
             
             <CollapsibleSection 
                title="Acciones Avanzadas" 
                count={1}
                icon="build_circle"
                iconBgColor="bg-rose-100 dark:bg-rose-900/50"
                iconColor="text-rose-600 dark:text-rose-300"
                borderColor="border-rose-300 dark:border-rose-600"
                defaultOpen={false}
            >
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Sincronizar Prácticas Antiguas</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-1">
                            Crea registros de "Lanzamiento" para prácticas de los últimos 2 años que no lo tengan.
                            Útil para asegurar que todas las prácticas estén en el sistema de gestión.
                        </p>
                    </div>
                     <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-rose-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-rose-700"
                    >
                        <span className="material-icons">{isSyncing ? 'sync' : 'history'}</span>
                        <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default ConvocatoriaManager;