import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllAirtableData, updateAirtableRecord, createAirtableRecord, updateAirtableRecords } from '../services/airtableService';
import type { LanzamientoPPS, InstitucionFields, AirtableRecord, LanzamientoPPSFields, PracticaFields } from '../types';
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
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema, institucionArraySchema, practicaArraySchema } from '../schemas';

// MOCK DATA FOR TESTING
const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_test_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hospital de Prueba (Activa)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Clinica', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Pendiente de Gestión', [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 5 },
    { id: 'lanz_test_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Escuela Simulada (Finalizada)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Educacional', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Pendiente de Gestión' },
    { id: 'lanz_test_3', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Consultora Ficticia (Confirmada)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Laboral', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Relanzamiento Confirmado', [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'lanz_test_4', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'ONG de Prueba (Sin fecha fin)', [FIELD_FECHA_INICIO_LANZAMIENTOS]: new Date().toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Comunitaria', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'En Conversación', [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 2 },
];
const mockInstitutionsMap = new Map([
    [normalizeStringForComparison('Hospital de Prueba (Activa)'), { id: 'inst_test_1', phone: '1122334455' }],
    [normalizeStringForComparison('Escuela Simulada (Finalizada)'), { id: 'inst_test_2' }],
]);

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';

const getGroupName = (name: unknown): string => {
    const strName = String(name || '');
    if (!strName) return 'Sin Nombre';
    return strName.split(' - ')[0].trim();
};

interface UseGestionConvocatoriasProps {
    forcedOrientations?: string[];
    isTestingMode?: boolean;
}

export const useGestionConvocatorias = ({ forcedOrientations, isTestingMode = false }: UseGestionConvocatoriasProps) => {
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

        if (isTestingMode) {
            setLanzamientos(mockLanzamientos);
            setInstitutionsMap(mockInstitutionsMap);
            setLoadingState('loaded');
            return;
        }
        
        const [lanzamientosRes, institucionesRes] = await Promise.all([
            fetchAllAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                lanzamientoPPSArraySchema,
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
                institucionArraySchema,
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
                    newInstitutionsMap.set(normalizeStringForComparison(name as string), {
                        id: record.id,
                        phone: record.fields[FIELD_TELEFONO_INSTITUCIONES]
                    });
                }
            });
            setInstitutionsMap(newInstitutionsMap);

            const mappedRecords = lanzamientosRes.records.map((r: AirtableRecord<LanzamientoPPSFields>) => ({ ...r.fields as any, id: r.id } as LanzamientoPPS));
            const filteredRecords = mappedRecords.filter(pps => 
                !String(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').toLowerCase().includes('uflo')
            );
            setLanzamientos(filteredRecords);
            setLoadingState('loaded');
        }
    }, [isTestingMode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (loadingState !== 'loaded' || lanzamientos.length === 0 || isTestingMode) {
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
    }, [lanzamientos, loadingState, fetchData, isTestingMode]);

    const handleSave = useCallback(async (id: string, updates: Partial<LanzamientoPPS>): Promise<boolean> => {
        setUpdatingIds(prev => new Set(prev).add(id));

        if (isTestingMode) {
            console.log("TEST MODE: Simulating save for", id, updates);
            await new Promise(resolve => setTimeout(resolve, 500));
            setLanzamientos(prev => prev.map(pps => pps.id === id ? { ...pps, ...updates } : pps));
            setToastInfo({ message: 'Cambios (simulados) guardados.', type: 'success' });
            setUpdatingIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
            return true;
        }

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
    }, [fetchData, isTestingMode]);

    const handleUpdateInstitutionPhone = useCallback(async (institutionId: string, phone: string): Promise<boolean> => {
      if (isTestingMode) {
          console.log("TEST MODE: Simulating phone update for", institutionId, phone);
          await new Promise(resolve => setTimeout(resolve, 500));
          setInstitutionsMap(prev => {
              const newMap = new Map(prev);
              for (const [key, val] of newMap.entries()) {
                  const instValue = val as { id: string; phone?: string };
                  if (instValue.id === institutionId) {
                      newMap.set(key, { ...instValue, phone });
                      break;
                  }
              }
              return newMap;
          });
          setToastInfo({ message: 'Teléfono (simulado) guardado.', type: 'success' });
          return true;
      }

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
                  const instValue = value as { id: string, phone?: string };
                  if (instValue.id === institutionId) {
                      newMap.set(key, { ...instValue, phone });
                      break;
                  }
              }
              return newMap;
          });
          return true;
      }
    }, [isTestingMode]);

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
                practicaArraySchema,
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
            const mappedPracticas: any[] = recentPracticas.map((p: AirtableRecord<PracticaFields>) => ({ ...(p.fields as any), id: p.id }));

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
    
            const newLaunchesToCreate: Partial<LanzamientoPPSFields>[] = [];
            for (const [key, practicasGroup] of groupedPracticas.entries()) {
                if (!existingLaunchKeys.has(key)) {
                    const templatePractica = practicasGroup[0];
                    const nameRaw = templatePractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                    const ppsName = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
                    
                    if (ppsName && String(ppsName).toLowerCase().includes('uflo')) {
                        continue;
                    }

                    const newLaunch: Partial<LanzamientoPPSFields> = {
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
            
            const totalToCreate = (newLaunchesToCreate as any[]).length;
            for (let i = 0; i < totalToCreate; i++) {
                const launchData = newLaunchesToCreate[i];
                setToastInfo({ message: `Sincronizando ${i + 1} de ${totalToCreate}...`, type: 'success' });

                const { error } = await createAirtableRecord(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, launchData);
                
                if (error) {
                    failedCreations++;
                    console.error(`Error al crear el lanzamiento para ${String(launchData[FIELD_NOMBRE_PPS_LANZAMIENTOS] ?? '')}:`, error);
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

    return {
        institutionsMap,
        loadingState,
        error,
        toastInfo,
        setToastInfo,
        updatingIds,
        searchTerm,
        setSearchTerm,
        orientationFilter,
        setOrientationFilter,
        isSyncing,
        handleSave,
        handleUpdateInstitutionPhone,
        handleSync,
        filteredData,
    };
};
