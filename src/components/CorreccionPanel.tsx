import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/db';
import type { InformeCorreccionPPS, InformeCorreccionStudent, ConvocatoriaFields, PracticaFields, EstudianteFields, LanzamientoPPSFields, FlatCorreccionStudent, AirtableRecord } from '../types';
import {
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS,
  FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_INFORME_SUBIDO_CONVOCATORIAS,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_NOTA_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_INFORME_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
  FIELD_ESTUDIANTE_LINK_PRACTICAS,
  FIELD_FECHA_FIN_CONVOCATORIAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import InformeCorreccionCard from './InformeCorreccionCard';
import CorreccionRapidaView from './CorreccionRapidaView';
import { normalizeStringForComparison, formatDate, parseToUTCDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
type Manager = 'Selva Estrella' | 'Franco Pedraza' | 'Cynthia Rossi';
type ViewMode = 'byPps' | 'flatList';

const managerConfig: Record<Manager, { orientations: string[], label: string }> = {
  'Selva Estrella': { orientations: ['clinica'], label: 'Selva Estrella (Clínica)' },
  'Franco Pedraza': { orientations: ['educacional'], label: 'Franco Pedraza (Educacional)' },
  'Cynthia Rossi': { orientations: ['laboral', 'comunitaria'], label: 'Cynthia Rossi (Laboral & Comunitaria)' }
};

// FIX: Added props interface to accept isTestingMode prop.
interface CorreccionPanelProps {
  isTestingMode?: boolean;
}

const CorreccionPanel: React.FC<CorreccionPanelProps> = ({ isTestingMode = false }) => {
  const { isJefeMode, authenticatedUser } = useAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [allPpsGroups, setAllPpsGroups] = useState<Map<string, InformeCorreccionPPS>>(new Map());
  const [activeManager, setActiveManager] = useState<Manager>('Selva Estrella');
  const [updatingNotaId, setUpdatingNotaId] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('byPps');

  const [selectedStudents, setSelectedStudents] = useState<Map<string, Set<string>>>(new Map());
  const [batchUpdatingLanzamientoId, setBatchUpdatingLanzamientoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    // FIX: Added mock data handling for testing mode.
    if (isTestingMode) {
      setAllPpsGroups(new Map());
      setLoadingState('loaded');
      return;
    }

    try {
      const [lanzamientosRes, convocatoriasRes, practicasRes, estudiantesRes] = await Promise.all([
        db.lanzamientos.getAll(),
        db.convocatorias.getAll(),
        db.practicas.getAll(),
        db.estudiantes.getAll()
      ]);

      const estudiantesMapById = new Map(estudiantesRes.map(r => [r.id, r.fields]));
      const legajoToStudentIdMap = new Map<string, string>();
      estudiantesRes.forEach(r => {
        if (r.fields[FIELD_LEGAJO_ESTUDIANTES]) {
          legajoToStudentIdMap.set(String(r.fields[FIELD_LEGAJO_ESTUDIANTES]), r.id);
        }
      });
      
      const allPracticas = practicasRes.map(r => ({ ...r, id: r.id, fields: r.fields as PracticaFields }));
      const allLanzamientos = lanzamientosRes;
      
      const practicasMap = new Map<string, AirtableRecord<PracticaFields>>();

      for (const practicaRecord of allPracticas) {
          const studentId = (practicaRecord.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] as string[] | undefined)?.[0];
          const lanzamientoId = (practicaRecord.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
          
          if (studentId && lanzamientoId) {
              const key = `${studentId}-${lanzamientoId}`;
              const existing = practicasMap.get(key);
              if (!existing || (practicaRecord.fields[FIELD_NOTA_PRACTICAS] && !existing.fields[FIELD_NOTA_PRACTICAS])) {
                  practicasMap.set(key, practicaRecord);
              }
          }
      }
      
      for (const practicaRecord of allPracticas) {
          const linkedStudentId = (practicaRecord.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] as string[] | undefined)?.[0];
          const linkedLanzamientoId = (practicaRecord.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
          if (linkedStudentId && linkedLanzamientoId && practicasMap.has(`${linkedStudentId}-${linkedLanzamientoId}`)) {
              continue; 
          }

          const legajoArray = practicaRecord.fields[FIELD_NOMBRE_BUSQUEDA_PRACTICAS] as (string | number)[] | undefined;
          const legajo = legajoArray ? String(legajoArray[0]) : null;
          if (!legajo) continue;
          
          const studentId = legajoToStudentIdMap.get(legajo);
          if (!studentId) continue;

          const instRaw = practicaRecord.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as string[] | undefined;
          const instName = instRaw ? instRaw[0] : null;
          if (!instName) continue;

          const practicaStartDate = parseToUTCDate(practicaRecord.fields[FIELD_FECHA_INICIO_PRACTICAS]);
          if (!practicaStartDate) continue;

          const normalizedInstName = normalizeStringForComparison(instName);

          const matchingLanzamiento = allLanzamientos.find(l => {
              const lanzamientoName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
              if (!lanzamientoName || normalizeStringForComparison(lanzamientoName) !== normalizedInstName) return false;

              const lanzamientoStartDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
              if (!lanzamientoStartDate) return false;
              
              const timeDiff = Math.abs(practicaStartDate.getTime() - lanzamientoStartDate.getTime());
              const daysDiff = timeDiff / (1000 * 3600 * 24);
              return daysDiff <= 31;
          });
          
          if (matchingLanzamiento) {
              const key = `${studentId}-${matchingLanzamiento.id}`;
              const existing = practicasMap.get(key);
               if (!existing || (practicaRecord.fields[FIELD_NOTA_PRACTICAS] && !existing.fields[FIELD_NOTA_PRACTICAS])) {
                   practicasMap.set(key, practicaRecord);
               }
          }
      }

      const ppsGroups = new Map<string, InformeCorreccionPPS>();
      const validConvocatorias = convocatoriasRes.filter(conv => {
        const estado = normalizeStringForComparison(conv.fields[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]);
        return estado !== 'inscripto' && estado !== 'no seleccionado';
      });

      for (const convRecord of validConvocatorias) {
        const studentId = (convRecord.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        const student = studentId ? estudiantesMapById.get(studentId) : null;
        if (!studentId || !student) continue;

        let lanzamiento: AirtableRecord<LanzamientoPPSFields> | undefined;
        const linkedLanzamientoId = (convRecord.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
        if (linkedLanzamientoId) {
            lanzamiento = allLanzamientos.find(l => l.id === linkedLanzamientoId);
        } else {
            const convPpsNameRaw = convRecord.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS];
            const convStartDate = parseToUTCDate(convRecord.fields[FIELD_FECHA_INICIO_CONVOCATORIAS]);
            const ppsNameToMatch = Array.isArray(convPpsNameRaw) ? convPpsNameRaw[0] : convPpsNameRaw;

            if (ppsNameToMatch && convStartDate) {
                lanzamiento = allLanzamientos.find(l => {
                    const lanzamientoStartDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    if (!lanzamientoStartDate) return false;
                    const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 3600 * 24);
                    return normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]) === normalizeStringForComparison(ppsNameToMatch) && daysDiff <= 31;
                });
            }
        }
        if (!lanzamiento) continue;

        const practica = practicasMap.get(`${studentId}-${lanzamiento.id}`);

        if (!ppsGroups.has(lanzamiento.id)) {
          ppsGroups.set(lanzamiento.id, {
            lanzamientoId: lanzamiento.id,
            ppsName: lanzamiento.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A',
            orientacion: lanzamiento.fields[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A',
            informeLink: lanzamiento.fields[FIELD_INFORME_LANZAMIENTOS],
            fechaFinalizacion: lanzamiento.fields[FIELD_FECHA_FIN_LANZAMIENTOS],
            students: []
          });
        }

        const informeSubido = !!convRecord.fields[FIELD_INFORME_SUBIDO_CONVOCATORIAS];
        const notaActual = practica?.fields?.[FIELD_NOTA_PRACTICAS];
        ppsGroups.get(lanzamiento.id)!.students.push({
          studentId: studentId,
          studentName: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
          convocatoriaId: convRecord.id,
          practicaId: practica?.id,
          informeSubido: informeSubido,
          nota: notaActual || (informeSubido ? 'Entregado (sin corregir)' : 'Sin calificar'),
          lanzamientoId: lanzamiento.id,
          orientacion: lanzamiento.fields[FIELD_ORIENTACION_LANZAMIENTOS],
          fechaInicio: convRecord.fields[FIELD_FECHA_INICIO_CONVOCATORIAS],
          fechaFinalizacionPPS: convRecord.fields[FIELD_FECHA_FIN_CONVOCATORIAS],
          fechaEntregaInforme: convRecord.fields[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
        });
      }
      
      const finalPpsGroups = new Map<string, InformeCorreccionPPS>();
      for (const [key, group] of ppsGroups.entries()) {
          if (group.students.length > 0) {
              finalPpsGroups.set(key, group);
          }
      }

      setAllPpsGroups(finalPpsGroups);
      setLoadingState('loaded');

    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado.');
      setLoadingState('error');
    }
  }, [isTestingMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNotaChange = useCallback(async (student: InformeCorreccionStudent, newNota: string) => {
    let currentPracticaId = student.practicaId;

    if (!currentPracticaId) {
        setUpdatingNotaId(`creating-${student.studentId}`);
        
        const firstOrientation = student.orientacion || '';

        try {
            const newPracticaRecord = await db.practicas.create({
                estudianteLink: [student.studentId],
                lanzamientoVinculado: [student.lanzamientoId],
                // FIX: The 'especialidad' field expects a string according to the schema, not an array. Correcting the type mismatch.
                especialidad: firstOrientation,
                fechaInicio: student.fechaInicio,
                fechaFin: student.fechaFinalizacionPPS,
            });

            if (!newPracticaRecord) throw new Error("La creación del registro de práctica no devolvió un resultado.");
            
            currentPracticaId = newPracticaRecord.id;

            setAllPpsGroups(prev => {
                const newGroups = new Map<string, InformeCorreccionPPS>(prev);
                const ppsGroup = newGroups.get(student.lanzamientoId);
                if (ppsGroup) {
                    const newStudents = ppsGroup.students.map(s => 
                        s.studentId === student.studentId ? { ...s, practicaId: newPracticaRecord.id } : s
                    );
                    newGroups.set(student.lanzamientoId, { ...ppsGroup, students: newStudents });
                }
                return newGroups;
            });
        } catch (error: any) {
            setToastInfo({ message: `Error: No se pudo crear el registro de práctica. ${error.message}`, type: 'error' });
            setUpdatingNotaId(null);
            return;
        }
    }

    setUpdatingNotaId(currentPracticaId);

    try {
        if (newNota === 'No Entregado' && student.convocatoriaId) {
            await db.convocatorias.update(student.convocatoriaId, { informeSubido: false });
        }
        
        const valueToSend = newNota === 'Sin calificar' ? null : newNota;
        await db.practicas.update(currentPracticaId, { nota: valueToSend });

        setToastInfo({ message: 'Nota guardada exitosamente.', type: 'success' });
        setAllPpsGroups(prev => {
            const newGroups = new Map<string, InformeCorreccionPPS>(prev);
            const ppsGroup = newGroups.get(student.lanzamientoId);
            if (ppsGroup) {
                const newStudents = ppsGroup.students.map(s => {
                    if (s.studentId === student.studentId) {
                        return {
                            ...s,
                            nota: newNota,
                            informeSubido: newNota === 'No Entregado' ? false : s.informeSubido,
                        };
                    }
                    return s;
                });
                newGroups.set(student.lanzamientoId, { ...ppsGroup, students: newStudents });
            }
            return newGroups;
        });
    } catch(error: any) {
        setToastInfo({ message: `Error al guardar la nota. ${error.message}`, type: 'error' });
    } finally {
        setUpdatingNotaId(null);
    }
}, []);
  
  const handleSelectionChange = useCallback((lanzamientoId: string, practicaId: string) => {
      setSelectedStudents(prev => {
          const newSelection = new Map(prev);
          const currentSet = newSelection.get(lanzamientoId);
          const groupSelection = currentSet ? new Set(currentSet) : new Set<string>();
          if (groupSelection.has(practicaId)) {
              groupSelection.delete(practicaId);
          } else {
              groupSelection.add(practicaId);
          }
          newSelection.set(lanzamientoId, groupSelection);
          return newSelection;
      });
  }, []);

  const handleSelectAll = useCallback((lanzamientoId: string, practicaIds: string[], select: boolean) => {
      setSelectedStudents(prev => {
          const newSelection = new Map(prev);
          const currentSet = newSelection.get(lanzamientoId);
          const groupSelection = currentSet ? new Set(currentSet) : new Set<string>();
          if (select) {
              practicaIds.forEach(id => groupSelection.add(id));
          } else {
              practicaIds.forEach(id => groupSelection.delete(id));
          }
          newSelection.set(lanzamientoId, groupSelection);
          return newSelection;
      });
  }, []);

  const handleBatchUpdate = useCallback(async (lanzamientoId: string, newNota: string) => {
      const selectedPracticaIds = Array.from(selectedStudents.get(lanzamientoId) || []);
      if (selectedPracticaIds.length === 0) return;

      setBatchUpdatingLanzamientoId(lanzamientoId);
      
      const recordsToUpdate = selectedPracticaIds.map((id: string) => ({
          id,
          fields: { nota: newNota }
      }));

      try {
          await db.practicas.updateMany(recordsToUpdate);
          setToastInfo({ message: `${selectedPracticaIds.length} notas actualizadas a "${newNota}".`, type: 'success' });
          setAllPpsGroups(prev => {
              const newGroups = new Map<string, InformeCorreccionPPS>(prev);
              const ppsGroup = newGroups.get(lanzamientoId);
              if (ppsGroup) {
                  const newStudents = ppsGroup.students.map(student => {
                      if (student.practicaId && selectedPracticaIds.includes(student.practicaId)) {
                          return { ...student, nota: newNota };
                      }
                      return student;
                  });
                  newGroups.set(lanzamientoId, { ...ppsGroup, students: newStudents });
              }
              return newGroups;
          });
          setSelectedStudents(prev => {
              const newSelection = new Map(prev);
              newSelection.delete(lanzamientoId);
              return newSelection;
          });
      } catch (error: any) {
          setToastInfo({ message: `Error al actualizar notas: ${error.message}`, type: 'error' });
      } finally {
        setBatchUpdatingLanzamientoId(null);
      }
  }, [selectedStudents]);

  const managerData = useMemo(() => {
    const jefeOrientations = authenticatedUser?.orientaciones;
    const managerOrientations = isJefeMode
      ? new Set((jefeOrientations || []).map(normalizeStringForComparison))
      : new Set(managerConfig[activeManager].orientations.map(normalizeStringForComparison));

    const filteredGroups: InformeCorreccionPPS[] = [...allPpsGroups.values()].filter((group: InformeCorreccionPPS) => {
        // FIX: Handle group.orientacion being a string or string array by simplifying logic.
        const groupOrientations = (group.orientacion || '').split(',').map(o => normalizeStringForComparison(o.trim()));
        return groupOrientations.some(o => managerOrientations.has(o));
    });

    const flatList: FlatCorreccionStudent[] = [];
    for (const group of filteredGroups) {
      for (const student of group.students) {
        if (student.informeSubido && (student.nota === 'Sin calificar' || student.nota === 'Entregado (sin corregir)')) {
            const baseDateForDeadline = student.fechaEntregaInforme 
                ? parseToUTCDate(student.fechaEntregaInforme) 
                : (student.fechaFinalizacionPPS ? parseToUTCDate(student.fechaFinalizacionPPS) : undefined);

            let deadline: Date | undefined;
            if (baseDateForDeadline) {
                deadline = new Date(baseDateForDeadline.getTime());
                deadline.setUTCDate(deadline.getUTCDate() + 30);
            }
            
            flatList.push({ 
                ...student, 
                ppsName: group.ppsName, 
                informeLink: group.informeLink,
                correctionDeadline: deadline?.toISOString()
            });
        }
      }
    }
    const totalSinCorregir = flatList.length;

    const searchFilteredFlatList = searchTerm
      ? flatList.filter(s =>
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.ppsName || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : flatList;

    let ppsFilteredGroups = filteredGroups;
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        ppsFilteredGroups = ppsFilteredGroups.map((group: InformeCorreccionPPS) => {
            const matchingStudents = group.students.filter(student => student.studentName.toLowerCase().includes(lowercasedFilter));
            if ((group.ppsName || '').toLowerCase().includes(lowercasedFilter)) {
                return group;
            }
            if (matchingStudents.length > 0) {
                return { ...group, students: matchingStudents };
            }
            return null;
        }).filter((g): g is InformeCorreccionPPS => g !== null);
    }

    const pendientes = ppsFilteredGroups.filter(group => 
      group.students.some(s => !s.nota || s.nota === 'Sin calificar' || s.nota === 'Entregado (sin corregir)')
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setUTCDate(oneMonthAgo.getUTCDate() - 30);

    const getPpsCategory = (pps: InformeCorreccionPPS): number => {
      const endDate = parseToUTCDate(pps.fechaFinalizacion);
      if (!endDate) return 3; // Lowest priority if no date
      if (endDate > today) return 2; // In Progress
      if (endDate >= oneMonthAgo && endDate <= today) return 1; // Priority: Finished within the last month
      return 3; // Older: Finished more than a month ago
    };

    pendientes.sort((a: InformeCorreccionPPS, b: InformeCorreccionPPS) => {
      const categoryA = getPpsCategory(a);
      const categoryB = getPpsCategory(b);
      if (categoryA !== categoryB) return categoryA - categoryB;
      const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
      const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
      return dateB - dateA;
    });

    const finalizados = ppsFilteredGroups.filter(group => 
      group.students.every(s => s.nota && s.nota !== 'Sin calificar' && s.nota !== 'Entregado (sin corregir)')
    );
    
    return { pendientes, finalizados, flatList: searchFilteredFlatList, totalSinCorregir };
  }, [activeManager, allPpsGroups, searchTerm, isJefeMode, authenticatedUser]);

  const renderContent = () => {
    if (loadingState === 'loading' || loadingState === 'initial') return <Loader />;
    if (loadingState === 'error') return <EmptyState icon="error" title="Error" message={error!} />;
    if (allPpsGroups.size === 0) return <EmptyState icon="folder_off" title="Sin Informes" message="No se encontraron informes para corregir." />;

    const noContentForManager = managerData.pendientes.length === 0 && managerData.finalizados.length === 0;

    if (viewMode === 'flatList') {
        return <CorreccionRapidaView students={managerData.flatList} onNotaChange={handleNotaChange} updatingNotaId={updatingNotaId} searchTerm={searchTerm} />;
    }

    return (
      <div className="space-y-8">
        {noContentForManager ? (
           <EmptyState icon="person_search_off" title="Sin Resultados" message={`No se encontraron Prácticas de ${isJefeMode ? authenticatedUser?.orientaciones?.join(' & ') : managerConfig[activeManager].orientations.join(' o ')} que coincidan con la búsqueda.`} />
        ) : (
          <>
            <CollapsibleSection title="Pendientes de Corrección" count={managerData.pendientes.length} defaultOpen>
              {managerData.pendientes.length > 0 ? (
                <div className="space-y-4">
                  {managerData.pendientes.map(group => (
                    <InformeCorreccionCard 
                      key={group.lanzamientoId} 
                      ppsGroup={group} 
                      onNotaChange={handleNotaChange} 
                      updatingNotaId={updatingNotaId}
                      selectedStudents={selectedStudents.get(group.lanzamientoId) || new Set()}
                      onSelectionChange={(practicaId) => handleSelectionChange(group.lanzamientoId, practicaId)}
                      onSelectAll={(practicaIds, select) => handleSelectAll(group.lanzamientoId, practicaIds, select)}
                      onBatchUpdate={(newNota) => handleBatchUpdate(group.lanzamientoId, newNota)}
                      isBatchUpdating={batchUpdatingLanzamientoId === group.lanzamientoId}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">¡Excelente! No hay informes pendientes de corrección.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Finalizados" count={managerData.finalizados.length}>
               {managerData.finalizados.length > 0 ? (
                <div className="space-y-4">
                   {managerData.finalizados.map(group => (
                    <InformeCorreccionCard 
                      key={group.lanzamientoId} 
                      ppsGroup={group} 
                      onNotaChange={handleNotaChange} 
                      updatingNotaId={updatingNotaId}
                      selectedStudents={selectedStudents.get(group.lanzamientoId) || new Set()}
                      onSelectionChange={(practicaId) => handleSelectionChange(group.lanzamientoId, practicaId)}
                      onSelectAll={(practicaIds, select) => handleSelectAll(group.lanzamientoId, practicaIds, select)}
                      onBatchUpdate={(newNota) => handleBatchUpdate(group.lanzamientoId, newNota)}
                      isBatchUpdating={batchUpdatingLanzamientoId === group.lanzamientoId}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              ) : (
                 <p className="text-slate-500 dark:text-slate-400 text-sm">No hay prácticas finalizadas en esta categoría.</p>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    );
  };

  const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, count, children, defaultOpen = false }) => (
    <details className="group" open={defaultOpen}>
      <summary className="list-none flex items-center gap-3 cursor-pointer mb-4 p-1">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-2 py-1 rounded-full">{count}</span>
        <div className="flex-grow border-b-2 border-slate-200/60 dark:border-slate-700/60"></div>
        <span className="material-icons text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open:rotate-180">expand_more</span>
      </summary>
      {children}
    </details>
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
      
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            
            {!isJefeMode && (
                <div className="w-full sm:w-auto p-1 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center ring-1 ring-slate-300/50 dark:ring-slate-600/50">
                    {Object.entries(managerConfig).map(([key, config]) => (
                        <button key={key} onClick={() => setActiveManager(key as Manager)} className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${activeManager === key ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-600/50'}`}>
                            {config.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="w-full sm:w-auto p-1 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center ring-1 ring-slate-300/50 dark:ring-slate-600/50">
                 <button onClick={() => setViewMode('byPps')} className={`w-full sm:w-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-300 flex items-center gap-2 ${viewMode === 'byPps' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-icons !text-base">view_agenda</span>
                    Por PPS
                 </button>
                 <button onClick={() => setViewMode('flatList')} className={`w-full sm:w-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-300 flex items-center gap-2 ${viewMode === 'flatList' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-icons !text-base">grading</span>
                    Corrección Rápida
                    {managerData.totalSinCorregir > 0 && <span className="text-xs font-bold bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{managerData.totalSinCorregir}</span>}
                 </button>
            </div>
            
             <div className="relative w-full sm:w-72">
                <input
                    type="text"
                    placeholder="Buscar por alumno o PPS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500">search</span>
            </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default CorreccionPanel;