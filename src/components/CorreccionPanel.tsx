import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllAirtableData, updateAirtableRecord, updateAirtableRecords } from '../services/airtableService';
import type { InformeCorreccionPPS, InformeCorreccionStudent, ConvocatoriaFields, PracticaFields, EstudianteFields, LanzamientoPPSFields, FlatCorreccionStudent, AirtableRecord, LanzamientoPPS } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
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
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import InformeCorreccionCard from './InformeCorreccionCard';
import CorreccionRapidaView from './CorreccionRapidaView';
import { normalizeStringForComparison, addBusinessDays, parseToUTCDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
type Manager = 'Selva Estrella' | 'Franco Pedraza' | 'Cynthia Rossi';
type ViewMode = 'byPps' | 'flatList';

const managerConfig: Record<Manager, { orientations: string[], label: string }> = {
  'Selva Estrella': { orientations: ['clinica'], label: 'Selva Estrella (Clínica)' },
  'Franco Pedraza': { orientations: ['educacional'], label: 'Franco Pedraza (Educacional)' },
  'Cynthia Rossi': { orientations: ['laboral', 'comunitaria'], label: 'Cynthia Rossi (Laboral & Comunitaria)' }
};

const CorreccionPanel: React.FC = () => {
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

    try {
      const [lanzamientosRes, convocatoriasRes, practicasRes, estudiantesRes] = await Promise.all([
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [
          FIELD_NOMBRE_PPS_LANZAMIENTOS,
          FIELD_ORIENTACION_LANZAMIENTOS,
          FIELD_INFORME_LANZAMIENTOS,
          FIELD_FECHA_FIN_LANZAMIENTOS,
          FIELD_FECHA_INICIO_LANZAMIENTOS,
        ]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS), // Fetch all convocatorias without filters
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS),
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES])
      ]);

      if (lanzamientosRes.error || convocatoriasRes.error || practicasRes.error || estudiantesRes.error) {
        throw new Error('Error al cargar los datos necesarios para la corrección.');
      }

      const estudiantesMap = new Map(estudiantesRes.records.map(r => [r.id, r.fields]));
      const practicasMap = new Map();
      practicasRes.records.forEach(p => {
        const studentLegajo = (p.fields[FIELD_NOMBRE_BUSQUEDA_PRACTICAS] || [])[0];
        const ppsName = (p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] || [])[0];
        if (studentLegajo && ppsName) {
          const key = `${normalizeStringForComparison(studentLegajo)}-${normalizeStringForComparison(ppsName)}`;
          practicasMap.set(key, { id: p.id, fields: p.fields });
        }
      });

      const ppsGroups = new Map<string, InformeCorreccionPPS>();

      // Filter on client side for robustness against case/whitespace issues in Airtable
      const validConvocatorias = convocatoriasRes.records.filter(conv => {
        const estado = normalizeStringForComparison(conv.fields[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]);
        return estado !== 'inscripto' && estado !== 'no seleccionado';
      });
      
      const allLanzamientos = lanzamientosRes.records;
      const lanzamientosToUpdate = new Map<string, { id: string; fields: Partial<LanzamientoPPSFields> }>();

      for (const convRecord of validConvocatorias) {
        const studentId = (convRecord.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        if (!studentId) continue;
        
        const student = estudiantesMap.get(studentId);
        if (!student) continue;

        let lanzamiento: AirtableRecord<LanzamientoPPSFields> | undefined;
        const linkedLanzamientoId = (convRecord.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];

        if (linkedLanzamientoId) {
            lanzamiento = allLanzamientos.find(l => l.id === linkedLanzamientoId);
        }

        // Fallback if no linked record or if linked record not found
        if (!lanzamiento) {
            const convPpsNameRaw = convRecord.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS];
            const convStartDate = parseToUTCDate(convRecord.fields[FIELD_FECHA_INICIO_CONVOCATORIAS]);

            const ppsNameToMatch = Array.isArray(convPpsNameRaw) ? convPpsNameRaw[0] : convPpsNameRaw;

            if (ppsNameToMatch && convStartDate) {
                lanzamiento = allLanzamientos.find(l => {
                    const launchStartDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    const launchName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                    
                    return (
                        normalizeStringForComparison(launchName) === normalizeStringForComparison(ppsNameToMatch) &&
                        launchStartDate?.getTime() === convStartDate.getTime()
                    );
                });
            }
        }
        
        if (!lanzamiento) continue; // If still no lanzamiento, skip this convocatoria.
        
        const ppsName = lanzamiento.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A';
        const studentLegajo = student[FIELD_LEGAJO_ESTUDIANTES];
        
        const practicaKey = `${normalizeStringForComparison(studentLegajo)}-${normalizeStringForComparison(ppsName)}`;
        const practica = practicasMap.get(practicaKey);

        // If there's no matching practica record, this student should not appear in the correction panel.
        if (!practica) {
            continue;
        }
        
        // If a PPS appears in the correction panel but has no report link, flag it for update.
        const informeLink = lanzamiento.fields[FIELD_INFORME_LANZAMIENTOS];
        if (!informeLink) {
            if (!lanzamientosToUpdate.has(lanzamiento.id)) {
                lanzamientosToUpdate.set(lanzamiento.id, {
                    id: lanzamiento.id,
                    fields: { [FIELD_INFORME_LANZAMIENTOS]: 'poner link de informe' }
                });
            }
        }
        
        const lanzamientoId = lanzamiento.id;
        const studentName = student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A';

        if (!ppsGroups.has(lanzamientoId)) {
          ppsGroups.set(lanzamientoId, {
            lanzamientoId: lanzamientoId,
            ppsName: ppsName,
            orientacion: lanzamiento.fields[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A',
            informeLink: informeLink,
            fechaFinalizacion: lanzamiento.fields[FIELD_FECHA_FIN_LANZAMIENTOS],
            students: []
          });
        }

        const studentData: InformeCorreccionStudent = {
          studentId: studentId,
          studentName: studentName,
          convocatoriaId: convRecord.id,
          practicaId: practica?.id,
          informeSubido: !!convRecord.fields[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
          nota: practica?.fields?.[FIELD_NOTA_PRACTICAS] || 'Sin calificar'
        };
        
        ppsGroups.get(lanzamientoId)!.students.push(studentData);
      }
      
      // After processing, fire-and-forget the updates to Airtable
      if (lanzamientosToUpdate.size > 0) {
        const recordsToUpdate = Array.from(lanzamientosToUpdate.values());
        updateAirtableRecords(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, recordsToUpdate)
            .then(({ error }) => {
                if (!error) {
                    setToastInfo({
                        message: `${recordsToUpdate.length} PPS sin link de informe fueron marcadas para completar.`,
                        type: 'success'
                    });
                } else {
                     console.error("Failed to flag Lanzamientos for missing report links:", error);
                }
            });
      }

      // Filter out any PPS groups that have no students left after filtering.
      const finalPpsGroups = new Map<string, InformeCorreccionPPS>();
      for (const [key, group] of ppsGroups.entries()) {
          if (group.students.length > 0) {
              finalPpsGroups.set(key, group);
          }
      }

      // Fallback logic: If a Lanzamiento is missing an orientation,
      // try to infer it from the students' linked Practica records.
      for (const group of finalPpsGroups.values()) {
        if (!group.orientacion || group.orientacion.trim() === '' || group.orientacion === 'N/A') {
          for (const student of group.students) {
            if (student.practicaId) {
              const practicaRecord = practicasRes.records.find(p => p.id === student.practicaId);
              const practicaEspecialidad = practicaRecord?.fields[FIELD_ESPECIALIDAD_PRACTICAS];
              if (practicaEspecialidad && practicaEspecialidad.trim() !== '') {
                group.orientacion = practicaEspecialidad;
                break;
              }
            }
          }
        }
      }

      setAllPpsGroups(finalPpsGroups);
      setLoadingState('loaded');

    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado.');
      setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNotaChange = useCallback(async (practicaId: string, newNota: string, convocatoriaId?: string) => {
    setUpdatingNotaId(practicaId);

    if (newNota === 'No Entregado' && convocatoriaId) {
      // Step 1: Update the Convocatoria record to uncheck 'Informe Subido'
      const { error: convError } = await updateAirtableRecord(
        AIRTABLE_TABLE_NAME_CONVOCATORIAS,
        convocatoriaId,
        { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: false }
      );

      if (convError) {
        setToastInfo({ message: 'Error al actualizar el estado del informe.', type: 'error' });
        setUpdatingNotaId(null);
        return;
      }
      
      // Step 2: Update the Practica record with the 'No Entregado' grade
      const { error: practicasError } = await updateAirtableRecord(
        AIRTABLE_TABLE_NAME_PRACTICAS,
        practicaId,
        { [FIELD_NOTA_PRACTICAS]: 'No Entregado' }
      );

      if (practicasError) {
        setToastInfo({ message: 'Error al actualizar la nota.', type: 'error' });
      } else {
        setToastInfo({ message: 'El informe fue marcado como "No Entregado".', type: 'success' });
        // Update local state for immediate UI feedback
        setAllPpsGroups(prev => {
          const newGroups = new Map(prev);
          for (const pps of newGroups.values()) {
            const student = pps.students.find(s => s.practicaId === practicaId);
            if (student) {
              student.nota = 'No Entregado';
              student.informeSubido = false; // This is the key part for the UI
              break;
            }
          }
          return newGroups;
        });
      }
    } else {
      // Handle regular grading
      const valueToSend = newNota === 'Sin calificar' ? null : newNota;
      const { error } = await updateAirtableRecord(
        AIRTABLE_TABLE_NAME_PRACTICAS,
        practicaId,
        { [FIELD_NOTA_PRACTICAS]: valueToSend }
      );

      if (error) {
        setToastInfo({ message: 'Error al guardar la nota.', type: 'error' });
      } else {
        setToastInfo({ message: 'Nota guardada exitosamente.', type: 'success' });
        setAllPpsGroups(prev => {
          const newGroups = new Map(prev);
          for (const pps of newGroups.values()) {
            const student = pps.students.find(s => s.practicaId === practicaId);
            if (student) {
              student.nota = newNota;
              break;
            }
          }
          return newGroups;
        });
      }
    }

    setUpdatingNotaId(null);
  }, []);
  
  const handleSelectionChange = useCallback((lanzamientoId: string, practicaId: string) => {
      setSelectedStudents(prev => {
          const newSelection = new Map(prev);
          const groupSelection = new Set(newSelection.get(lanzamientoId));
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
          const groupSelection = new Set(newSelection.get(lanzamientoId));
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
      
      const recordsToUpdate = selectedPracticaIds.map(id => ({
          id,
          fields: { [FIELD_NOTA_PRACTICAS]: newNota }
      }));

      const { error } = await updateAirtableRecords(AIRTABLE_TABLE_NAME_PRACTICAS, recordsToUpdate);

      if (error) {
          setToastInfo({ message: `Error al actualizar ${selectedPracticaIds.length} notas.`, type: 'error' });
      } else {
          setToastInfo({ message: `${selectedPracticaIds.length} notas actualizadas a "${newNota}".`, type: 'success' });
          setAllPpsGroups(prev => {
              const newGroups = new Map(prev);
              const ppsGroup = newGroups.get(lanzamientoId);
              if (ppsGroup) {
                  ppsGroup.students.forEach(student => {
                      if (student.practicaId && selectedPracticaIds.includes(student.practicaId)) {
                          student.nota = newNota;
                      }
                  });
              }
              return newGroups;
          });
          setSelectedStudents(prev => {
              const newSelection = new Map(prev);
              newSelection.delete(lanzamientoId);
              return newSelection;
          });
      }

      setBatchUpdatingLanzamientoId(null);
  }, [selectedStudents]);

  const managerData = useMemo(() => {
    const managerOrientations = isJefeMode
      ? new Set((authenticatedUser?.orientaciones || []).map(normalizeStringForComparison))
      : new Set(managerConfig[activeManager].orientations.map(normalizeStringForComparison));

    let filteredGroups = Array.from(allPpsGroups.values()).filter(group => {
        const groupOrientations = (group.orientacion || '').split(',').map(o => normalizeStringForComparison(o.trim()));
        // Check if any of the group's orientations match any of the manager's orientations
        return groupOrientations.some(o => managerOrientations.has(o));
    });

    const flatList: FlatCorreccionStudent[] = [];
    for (const group of filteredGroups) {
      for (const student of group.students) {
        // A student appears in the quick correction list if they have submitted their report, need a grade, and have a practice record.
        if (student.informeSubido && student.nota === 'Sin calificar' && student.practicaId) {
            const finalizacionDate = group.fechaFinalizacion ? parseToUTCDate(group.fechaFinalizacion) : undefined;
            const deadline = finalizacionDate ? addBusinessDays(finalizacionDate, 30) : undefined;
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
          s.ppsName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : flatList;

    let ppsFilteredGroups = filteredGroups;
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        ppsFilteredGroups = ppsFilteredGroups.map(group => {
            const matchingStudents = group.students.filter(student => student.studentName.toLowerCase().includes(lowercasedFilter));
            if (group.ppsName.toLowerCase().includes(lowercasedFilter)) {
                return group;
            }
            if (matchingStudents.length > 0) {
                return { ...group, students: matchingStudents };
            }
            return null;
        }).filter((g): g is InformeCorreccionPPS => g !== null);
    }

    const pendientes = ppsFilteredGroups.filter(group => 
      group.students.some(s => !s.nota || s.nota === 'Sin calificar')
    );
    const finalizados = ppsFilteredGroups.filter(group => 
      group.students.every(s => s.nota && s.nota !== 'Sin calificar')
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
                <p className="text-slate-500 text-sm">¡Excelente! No hay informes pendientes de corrección.</p>
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
                 <p className="text-slate-500 text-sm">Aún no se ha finalizado la corrección de ninguna PPS.</p>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    );
  };
  
  const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, count, children, defaultOpen = false }) => (
    <details className="group" open={defaultOpen}>
      <summary className="list-none flex items-center gap-3 cursor-pointer mb-4">
        <span className="material-icons text-slate-400 transition-transform duration-300 group-open:rotate-90">chevron_right</span>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">{count}</span>
      </summary>
      <div className="pl-8">
        {children}
      </div>
    </details>
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
      
      {!isJefeMode && (
        <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-4" aria-label="Managers">
            {(Object.keys(managerConfig) as Manager[]).map(manager => (
                <button
                key={manager}
                onClick={() => setActiveManager(manager)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                    activeManager === manager
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                >
                {managerConfig[manager].label}
                </button>
            ))}
            </nav>
        </div>
      )}

       <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="p-1 bg-slate-100 rounded-lg flex items-center ring-1 ring-slate-200/50">
               <button 
                  onClick={() => setViewMode('byPps')}
                  className={`w-full px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-300 ${viewMode === 'byPps' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}
                >
                  Vista por PPS
                </button>
                <button 
                  onClick={() => setViewMode('flatList')}
                  className={`w-full px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-300 flex items-center gap-2 ${viewMode === 'flatList' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}
                >
                  <span>Corrección Rápida</span>
                  {managerData.totalSinCorregir > 0 && (
                     <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{managerData.totalSinCorregir}</span>
                  )}
                </button>
           </div>
           <div className="relative w-full sm:w-80">
              <input
                type="search"
                placeholder="Buscar por PPS o Alumno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300/80 rounded-lg text-sm bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:border-slate-400"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg">
                search
              </span>
            </div>
       </div>

      {renderContent()}
    </div>
  );
};

export default CorreccionPanel;
