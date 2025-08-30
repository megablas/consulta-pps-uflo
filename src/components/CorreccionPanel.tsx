import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllAirtableData, updateAirtableRecord, updateAirtableRecords, createAirtableRecord } from '../services/airtableService';
import type { InformeCorreccionPPS, InformeCorreccionStudent, ConvocatoriaFields, PracticaFields, EstudianteFields, LanzamientoPPSFields, FlatCorreccionStudent, AirtableRecord } from '../types';
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
          FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
        ]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [
            FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
            FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
            FIELD_FECHA_INICIO_PRACTICAS,
            FIELD_NOTA_PRACTICAS,
            FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
            FIELD_ESTUDIANTE_LINK_PRACTICAS,
            FIELD_ESPECIALIDAD_PRACTICAS,
            FIELD_FECHA_FIN_PRACTICAS
        ]),
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES])
      ]);

      if (lanzamientosRes.error || convocatoriasRes.error || practicasRes.error || estudiantesRes.error) {
        throw new Error('Error al cargar los datos necesarios para la corrección.');
      }

      const estudiantesMapById = new Map(estudiantesRes.records.map(r => [r.id, r.fields]));
      const legajoToStudentIdMap = new Map<string, string>();
      estudiantesRes.records.forEach(r => {
        if (r.fields[FIELD_LEGAJO_ESTUDIANTES]) {
          legajoToStudentIdMap.set(String(r.fields[FIELD_LEGAJO_ESTUDIANTES]), r.id);
        }
      });
      
      const allPracticas = practicasRes.records.map(r => ({ ...r, id: r.id, fields: r.fields as PracticaFields }));
      const allLanzamientos = lanzamientosRes.records;
      
      const practicasMap = new Map<string, AirtableRecord<PracticaFields>>();

      // Pass 1: Prioritize perfectly linked practices and those with grades
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
      
      // Pass 2: Attempt to map unlinked practices using fallback logic
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
      const validConvocatorias = convocatoriasRes.records.filter(conv => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNotaChange = useCallback(async (student: InformeCorreccionStudent, newNota: string) => {
    let currentPracticaId = student.practicaId;

    if (!currentPracticaId) {
        setUpdatingNotaId(`creating-${student.studentId}`);
        
        const newPracticaFields: Partial<PracticaFields> = {
            [FIELD_ESTUDIANTE_LINK_PRACTICAS]: [student.studentId],
            [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: [student.lanzamientoId],
            [FIELD_ESPECIALIDAD_PRACTICAS]: student.orientacion,
            [FIELD_FECHA_INICIO_PRACTICAS]: student.fechaInicio,
            [FIELD_FECHA_FIN_PRACTICAS]: student.fechaFinalizacionPPS,
        };
        
        const { record: newPracticaRecord, error: createError } = await createAirtableRecord<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, newPracticaFields);

        if (createError || !newPracticaRecord) {
            setToastInfo({ message: 'Error: No se pudo crear el registro de práctica para calificar.', type: 'error' });
            setUpdatingNotaId(null);
            return;
        }
        currentPracticaId = newPracticaRecord.id;

        setAllPpsGroups(prev => {
            const newGroups = new Map(prev);
            const ppsGroup = newGroups.get(student.lanzamientoId);
            if (ppsGroup) {
                const studentToUpdate = ppsGroup.students.find(s => s.studentId === student.studentId);
                if (studentToUpdate) {
                    studentToUpdate.practicaId = newPracticaRecord.id;
                }
            }
            return newGroups;
        });
    }

    setUpdatingNotaId(currentPracticaId);

    if (newNota === 'No Entregado' && student.convocatoriaId) {
        await updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, student.convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: false });
    }
    
    const valueToSend = newNota === 'Sin calificar' ? null : newNota;
    const { error } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, currentPracticaId, { [FIELD_NOTA_PRACTICAS]: valueToSend });

    if (error) {
        setToastInfo({ message: 'Error al guardar la nota.', type: 'error' });
    } else {
        setToastInfo({ message: 'Nota guardada exitosamente.', type: 'success' });
        setAllPpsGroups(prev => {
            const newGroups = new Map(prev);
            const ppsGroup = newGroups.get(student.lanzamientoId);
            if (ppsGroup) {
                const studentToUpdate = ppsGroup.students.find(s => s.studentId === student.studentId);
                if (studentToUpdate) {
                    studentToUpdate.nota = newNota;
                    if (newNota === 'No Entregado') {
                        studentToUpdate.informeSubido = false;
                    }
                }
            }
            return newGroups;
        });
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
      group.students.some(s => !s.nota || s.nota === 'Sin calificar' || s.nota === 'Entregado (sin corregir)')
    );
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