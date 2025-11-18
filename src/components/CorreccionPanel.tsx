import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/db';
import type { InformeCorreccionPPS, InformeCorreccionStudent, ConvocatoriaFields, PracticaFields, EstudianteFields, LanzamientoPPSFields, FlatCorreccionStudent, AirtableRecord } from '../types';
import {
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
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
import ErrorState from './ErrorState';

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
type Manager = 'Selva Estrella' | 'Franco Pedraza' | 'Cynthia Rossi';
type ViewMode = 'byPps' | 'flatList';

const managerConfig: Record<Manager, { orientations: string[], label: string }> = {
  'Selva Estrella': { orientations: ['clinica'], label: 'Selva Estrella (Clínica)' },
  'Franco Pedraza': { orientations: ['educacional'], label: 'Franco Pedraza (Educacional)' },
  'Cynthia Rossi': { orientations: ['laboral', 'comunitaria'], label: 'Cynthia Rossi (Laboral & Comunitaria)' }
};

const CorreccionPanel: React.FC = () => {
  const { isJefeMode } = useAuth();
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

          const instName = practicaRecord.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as string | undefined;
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
              if (!practicasMap.has(key)) {
                  practicasMap.set(key, practicaRecord);
              }
          }
      }

      const ppsGroups = new Map<string, InformeCorreccionPPS>();
      convocatoriasRes.forEach(conv => {
        const estado = conv.fields[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS];
        if (typeof estado !== 'string' || normalizeStringForComparison(estado) !== 'seleccionado') return;

        const lanzamientoId = (conv.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] as string[] | undefined)?.[0];
        if (!lanzamientoId) return;

        if (!ppsGroups.has(lanzamientoId)) {
            const lanzamiento = allLanzamientos.find(l => l.id === lanzamientoId);
            ppsGroups.set(lanzamientoId, {
                lanzamientoId,
                ppsName: lanzamiento?.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || null,
                orientacion: lanzamiento?.fields[FIELD_ORIENTACION_LANZAMIENTOS] || null,
                informeLink: lanzamiento?.fields[FIELD_INFORME_LANZAMIENTOS] || null,
                fechaFinalizacion: lanzamiento?.fields[FIELD_FECHA_FIN_LANZAMIENTOS] || null,
                students: [],
            });
        }
        
        const studentId = (conv.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] as string[] | undefined)?.[0];
        if (!studentId) return;
        
        const studentDetails = estudiantesMapById.get(studentId);
        if (!studentDetails) return;

        const practicaRecord = practicasMap.get(`${studentId}-${lanzamientoId}`);

        ppsGroups.get(lanzamientoId)!.students.push({
            studentId,
            studentName: studentDetails[FIELD_NOMBRE_ESTUDIANTES] || 'Nombre no encontrado',
            convocatoriaId: conv.id,
            practicaId: practicaRecord?.id || null,
            informeSubido: conv.fields[FIELD_INFORME_SUBIDO_CONVOCATORIAS] || false,
            nota: practicaRecord?.fields[FIELD_NOTA_PRACTICAS] || 'Sin calificar',
            lanzamientoId,
            orientacion: ppsGroups.get(lanzamientoId)!.orientacion,
            fechaFinalizacionPPS: ppsGroups.get(lanzamientoId)!.fechaFinalizacion,
            fechaEntregaInforme: conv.fields[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
        });
      });

      setAllPpsGroups(ppsGroups);
      setLoadingState('loaded');

    } catch (e: any) {
        console.error("Error fetching correction data:", e);
        setError(e.message || 'Ocurrió un error inesperado al cargar los datos.');
        setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNotaChange = useCallback(async (student: InformeCorreccionStudent, newNota: string) => {
    setUpdatingNotaId(student.practicaId || `creating-${student.studentId}`);
    try {
        let practicaId = student.practicaId;

        if (!practicaId) {
            const ppsGroup = allPpsGroups.get(student.lanzamientoId);
            if (!ppsGroup) {
                throw new Error("No se pudo encontrar el grupo de PPS para crear el registro de la práctica.");
            }
            const newPractica = await db.practicas.create({
                estudianteLink: [student.studentId],
                lanzamientoVinculado: [student.lanzamientoId],
                especialidad: student.orientacion,
                fechaInicio: student.fechaInicio || ppsGroup.fechaFinalizacion,
                fechaFin: student.fechaFinalizacionPPS,
                nota: newNota
            });
            if (newPractica) {
                practicaId = newPractica.id;
            } else {
                throw new Error("No se pudo crear el registro de la práctica.");
            }
        } else {
            await db.practicas.update(practicaId, { nota: newNota });
        }
        
        if (newNota === 'No Entregado') {
            await db.convocatorias.update(student.convocatoriaId, { informeSubido: false });
        }
        
        // Optimistic update
        setAllPpsGroups(prev => {
            const newGroups = new Map(prev);
            const group = newGroups.get(student.lanzamientoId);
            if (group) {
                const studentToUpdate = group.students.find(s => s.studentId === student.studentId);
                if (studentToUpdate) {
                    studentToUpdate.nota = newNota;
                    if (!studentToUpdate.practicaId) studentToUpdate.practicaId = practicaId;
                    if (newNota === 'No Entregado') studentToUpdate.informeSubido = false;
                }
            }
            return newGroups;
        });

    } catch (e: any) {
        setToastInfo({ message: `Error al guardar: ${e.message}`, type: 'error' });
    } finally {
        setUpdatingNotaId(null);
    }
  }, [allPpsGroups]);
  
  const handleSelectionChange = useCallback((practicaId: string) => {
    setSelectedStudents((prev: Map<string, Set<string>>) => {
        const newSelection = new Map(prev);
        for (const [lanzamientoId, selectedSet] of newSelection.entries()) {
            if (selectedSet.has(practicaId)) {
                selectedSet.delete(practicaId);
                if (selectedSet.size === 0) {
                    newSelection.delete(lanzamientoId);
                }
                return newSelection;
            }
        }
        
        for (const [lanzamientoId, ppsGroup] of Array.from(allPpsGroups.entries())) {
            if (ppsGroup.students.some((s: InformeCorreccionStudent) => s.practicaId === practicaId)) {
                if (!newSelection.has(lanzamientoId)) {
                    newSelection.set(lanzamientoId, new Set());
                }
                newSelection.get(lanzamientoId)!.add(practicaId);
                break;
            }
        }
        return newSelection;
    });
  }, [allPpsGroups]);

  const handleSelectAll = (practicaIds: string[], select: boolean) => {
    if (practicaIds.length === 0) return;
    const firstPracticaId = practicaIds[0];
    let lanzamientoIdForGroup: string | null = null;
    
    for (const [lanzamientoId, ppsGroup] of Array.from(allPpsGroups.entries())) {
        if (ppsGroup.students.some((s: InformeCorreccionStudent) => s.practicaId === firstPracticaId)) {
            lanzamientoIdForGroup = lanzamientoId;
            break;
        }
    }
    
    if (!lanzamientoIdForGroup) return;

    setSelectedStudents((prev: Map<string, Set<string>>) => {
        const newSelection = new Map(prev);
        if (select) {
            newSelection.set(lanzamientoIdForGroup!, new Set(practicaIds));
        } else {
            newSelection.delete(lanzamientoIdForGroup!);
        }
        return newSelection;
    });
  };

  const handleBatchUpdate = async (newNota: string) => {
    const selectedEntries = Array.from(selectedStudents.entries());
    if (selectedEntries.length === 0) return;
    
    const [lanzamientoId, practicaIdSet] = selectedEntries[0];
    const ppsGroup = allPpsGroups.get(lanzamientoId);
    if (!ppsGroup) return;

    setBatchUpdatingLanzamientoId(lanzamientoId);
    try {
        const updates = Array.from(practicaIdSet).map(practicaId => ({
            id: practicaId,
            fields: { [FIELD_NOTA_PRACTICAS]: newNota }
        }));
        
        await db.practicas.updateMany(updates as any);

        setAllPpsGroups((prev: Map<string, InformeCorreccionPPS>) => {
            const newGroups = new Map(prev);
            const group = newGroups.get(lanzamientoId);
            if (group) {
                group.students.forEach(s => {
                    if (s.practicaId && practicaIdSet.has(s.practicaId)) {
                        s.nota = newNota;
                    }
                });
            }
            return newGroups;
        });

        setSelectedStudents(new Map());
        setToastInfo({ message: `${practicaIdSet.size} notas actualizadas a "${newNota}".`, type: 'success' });
    } catch (e: any) {
        setToastInfo({ message: `Error en lote: ${e.message}`, type: 'error' });
    } finally {
        setBatchUpdatingLanzamientoId(null);
    }
  };


  const filteredAndSortedGroups = useMemo<InformeCorreccionPPS[]>(() => {
    let groups: InformeCorreccionPPS[] = Array.from(allPpsGroups.values());
    const managerOrientations = isJefeMode
      ? managerConfig[activeManager].orientations.map(normalizeStringForComparison)
      : [];

    if (isJefeMode) {
      groups = groups.filter((g: InformeCorreccionPPS) => g.orientacion && managerOrientations.includes(normalizeStringForComparison(g.orientacion)));
    }
    
    if (searchTerm) {
      const lowerSearch = normalizeStringForComparison(searchTerm);
      groups = groups.map((group: InformeCorreccionPPS) => {
        const filteredStudents = group.students.filter(student => 
          normalizeStringForComparison(student.studentName).includes(lowerSearch) ||
          normalizeStringForComparison(group.ppsName || '').includes(lowerSearch)
        );
        return { ...group, students: filteredStudents };
      }).filter(group => group.students.length > 0);
    }
    
    return groups.sort((a: InformeCorreccionPPS, b: InformeCorreccionPPS) => {
        const aDate = a.fechaFinalizacion ? new Date(a.fechaFinalizacion) : new Date(0);
        const bDate = b.fechaFinalizacion ? new Date(b.fechaFinalizacion) : new Date(0);
        return bDate.getTime() - aDate.getTime();
    });
  }, [allPpsGroups, isJefeMode, activeManager, searchTerm]);

  const flatStudentList = useMemo(() => {
    if (viewMode === 'byPps') return [];
    
    return filteredAndSortedGroups.flatMap((group) => {
      return group.students.filter(s => s.informeSubido && (s.nota === 'Sin calificar' || s.nota === 'Entregado (sin corregir)'))
        .map((student): FlatCorreccionStudent => {
            let deadline: string | undefined;
            const baseDateString = student.fechaEntregaInforme || student.fechaFinalizacionPPS;
            const baseDate = parseToUTCDate(baseDateString);
            if(baseDate) {
                const d = new Date(baseDate);
                d.setDate(d.getDate() + 30);
                deadline = d.toISOString();
            }
            return {
                ...student,
                ppsName: group.ppsName,
                informeLink: group.informeLink,
                correctionDeadline: deadline
            }
        })
    });
  }, [filteredAndSortedGroups, viewMode]);


  if (loadingState === 'loading' || loadingState === 'initial') return <Loader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="animate-fade-in-up space-y-6">
        {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <div className="relative w-full sm:w-72">
                <input type="search" placeholder="Buscar por alumno o PPS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 !text-lg pointer-events-none">search</span>
            </div>
            <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <button onClick={() => setViewMode('byPps')} className={`px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'byPps' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}`}>
                    <span className="material-icons !text-base">view_agenda</span> Agrupado
                </button>
                <button onClick={() => setViewMode('flatList')} className={`px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'flatList' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}`}>
                    <span className="material-icons !text-base">view_list</span> Lista Rápida
                </button>
            </div>
            {isJefeMode && (
                <div className="relative w-full sm:w-64">
                    <select value={activeManager} onChange={e => setActiveManager(e.target.value as Manager)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors appearance-none">
                        {Object.entries(managerConfig).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 !text-lg pointer-events-none">supervisor_account</span>
                </div>
            )}
        </div>

        {filteredAndSortedGroups.length === 0 ? (
            <EmptyState icon="task_alt" title="Todo Corregido" message="No hay informes pendientes de corrección que coincidan con los filtros actuales."/>
        ) : (
            viewMode === 'byPps' ? (
                <div className="space-y-6">
                    {filteredAndSortedGroups.map(group => (
                        <InformeCorreccionCard
                            key={group.lanzamientoId}
                            ppsGroup={group}
                            onNotaChange={handleNotaChange}
                            updatingNotaId={updatingNotaId}
                            selectedStudents={selectedStudents.get(group.lanzamientoId) || new Set()}
                            onSelectionChange={handleSelectionChange}
                            onSelectAll={(ids, select) => handleSelectAll(ids, select)}
                            onBatchUpdate={(nota) => handleBatchUpdate(nota)}
                            isBatchUpdating={batchUpdatingLanzamientoId === group.lanzamientoId}
                            searchTerm={searchTerm}
                        />
                    ))}
                </div>
            ) : (
                <CorreccionRapidaView
                    students={flatStudentList}
                    onNotaChange={handleNotaChange}
                    updatingNotaId={updatingNotaId}
                    searchTerm={searchTerm}
                />
            )
        )}
    </div>
  );
};

export default CorreccionPanel;
