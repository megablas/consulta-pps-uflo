import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSearch from './AdminSearch';
import { fetchAllAirtableData, createAirtableRecord, fetchAirtableData, deleteAirtableRecord, updateAirtableRecord } from '../services/airtableService';
import type { EstudianteFields, Penalizacion, PenalizacionFields, ConvocatoriaFields, PracticaFields, LanzamientoPPSFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_NOMBRE_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_PENALIZACIONES,
  FIELD_PENALIZACION_ESTUDIANTE_LINK,
  FIELD_PENALIZACION_TIPO,
  FIELD_PENALIZACION_FECHA,
  FIELD_PENALIZACION_NOTAS,
  FIELD_PENALIZACION_PUNTAJE,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
  FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  FIELD_ESTUDIANTE_LINK_PRACTICAS,
  FIELD_ESTADO_PRACTICA,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_PENALIZACION_CONVOCATORIA_LINK,
  FIELD_LEGAJO_CONVOCATORIAS,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import Card from './Card';
import { formatDate } from '../utils/formatters';

const PENALTY_TYPES = [
    'Baja Anticipada',
    'Baja sobre la Fecha / Ausencia en Inicio',
    'Abandono durante la PPS',
    'Falta sin Aviso',
];

interface SelectedStudent {
  id: string;
  legajo: string;
  nombre: string;
}

interface PenalizedStudent {
  id: string;
  legajo: string;
  nombre: string;
  totalScore: number;
  penalties: (Penalizacion & { id: string })[];
}

const AddPenaltyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: SelectedStudent;
    onSuccess: () => void;
}> = ({ isOpen, onClose, student, onSuccess }) => {
    const [penaltyType, setPenaltyType] = useState(PENALTY_TYPES[0]);
    const [notes, setNotes] = useState('');
    const [selectedPpsId, setSelectedPpsId] = useState<string>('');
    const queryClient = useQueryClient();

    const { data: relevantPPS, isLoading: isLoadingPPS } = useQuery({
        queryKey: ['relevantPPSForModal', student.id],
        queryFn: async () => {
            const convocatoriasFormula = `AND(OR(FIND('${student.id}', ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}})), SEARCH('${student.legajo}', {${FIELD_LEGAJO_CONVOCATORIAS}} & '')), OR(LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado', LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'inscripto'))`;
            const practicasFormula = `AND(OR(FIND('${student.id}', ARRAYJOIN({${FIELD_ESTUDIANTE_LINK_PRACTICAS}})), SEARCH('${student.legajo}', {${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} & '')), LOWER({${FIELD_ESTADO_PRACTICA}}) = 'en curso')`;
            const [convocatoriasRes, practicasRes] = await Promise.all([
                fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS], convocatoriasFormula),
                fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS], practicasFormula)
            ]);
            const lanzamientoIds = new Set<string>();
            convocatoriasRes.records.forEach(c => (c.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).forEach(id => lanzamientoIds.add(id)));
            practicasRes.records.forEach(p => (p.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] || []).forEach(id => lanzamientoIds.add(id)));
            if (lanzamientoIds.size === 0) return [];
            const lanzamientosFormula = `OR(${Array.from(lanzamientoIds).map(id => `RECORD_ID()='${id}'`).join(',')})`;
            const { records: lanzamientosRes } = await fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS], lanzamientosFormula, [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]);
            return lanzamientosRes.map(r => ({ id: r.id, name: `${r.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]} (${formatDate(r.fields[FIELD_FECHA_INICIO_LANZAMIENTOS])})` }));
        },
        enabled: isOpen,
    });

    const applyPenaltyMutation = useMutation({
        mutationFn: async (penaltyData: PenalizacionFields) => {
            const penaltyResult = await createAirtableRecord<PenalizacionFields>(AIRTABLE_TABLE_NAME_PENALIZACIONES, penaltyData);
            if (penaltyResult.error) throw new Error(typeof penaltyResult.error.error === 'string' ? penaltyResult.error.error : penaltyResult.error.error.message);
            const triggerTypes = ['Baja Anticipada', 'Baja sobre la Fecha / Ausencia en Inicio'];
            if (selectedPpsId && triggerTypes.includes(penaltyType)) {
                const ppsId = selectedPpsId;
                const convFormula = `AND(OR(FIND('${student.id}',ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}})),SEARCH('${student.legajo}',{${FIELD_LEGAJO_CONVOCATORIAS}}&'')),FIND('${ppsId}',ARRAYJOIN({${FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS}})),{${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}='Seleccionado')`;
                const { records: convRecords } = await fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [], convFormula);
                const { records: lanzamientoRecords } = await fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_NOMBRE_PPS_LANZAMIENTOS], `RECORD_ID() = '${ppsId}'`);
                const lanzamientoNombre = lanzamientoRecords[0]?.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                const practicaFormula = `AND(OR(FIND('${student.id}',ARRAYJOIN({${FIELD_ESTUDIANTE_LINK_PRACTICAS}})),SEARCH('${student.legajo}',{${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}}&'')),OR(FIND('${ppsId}',ARRAYJOIN({${FIELD_LANZAMIENTO_VINCULADO_PRACTICAS}})),SEARCH(LOWER("${lanzamientoNombre.replace(/"/g, '\\"')}"),LOWER(ARRAYJOIN({${FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS}})))))`;
                const { records: practicaRecords } = await fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [], practicaFormula);
                const sideEffectPromises = [];
                if (convRecords[0]) sideEffectPromises.push(updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convRecords[0].id, { [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'No Seleccionado' }));
                if (practicaRecords[0]) sideEffectPromises.push(deleteAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaRecords[0].id));
                await Promise.all(sideEffectPromises);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPenalizedStudents'] });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            alert(`Error: ${error.message}`);
        }
    });

    const handleSave = () => {
        const penaltyData: PenalizacionFields = {
            [FIELD_PENALIZACION_ESTUDIANTE_LINK]: [student.id],
            [FIELD_PENALIZACION_TIPO]: penaltyType,
            [FIELD_PENALIZACION_FECHA]: new Date().toISOString().split('T')[0],
            [FIELD_PENALIZACION_NOTAS]: notes,
        };
        if (selectedPpsId) penaltyData[FIELD_PENALIZACION_CONVOCATORIA_LINK] = [selectedPpsId];
        applyPenaltyMutation.mutate(penaltyData);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">Aplicar Penalización a <span className="text-blue-600">{student.nombre}</span></h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="pps-select-modal" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">PPS Afectada (Opcional)</label>
                        {isLoadingPPS ? <p>Cargando PPS...</p> : (
                            <select id="pps-select-modal" value={selectedPpsId} onChange={e => setSelectedPpsId(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-700">
                                <option value="">Seleccionar una PPS...</option>
                                {relevantPPS?.map(pps => <option key={pps.id} value={pps.id}>{pps.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label htmlFor="penalty-type-modal" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Tipo de Incumplimiento</label>
                        <select id="penalty-type-modal" value={penaltyType} onChange={e => setPenaltyType(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-700">
                            {PENALTY_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="penalty-notes-modal" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Notas (Opcional)</label>
                        <textarea id="penalty-notes-modal" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-700" />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
                    <button onClick={handleSave} disabled={applyPenaltyMutation.isPending} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400">{applyPenaltyMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
};

const PenaltyHistoryItem: React.FC<{ penalty: Penalizacion & { id: string }, onDelete: () => void, isDeleting: boolean }> = ({ penalty, onDelete, isDeleting }) => (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{penalty[FIELD_PENALIZACION_TIPO]}</p>
                <p className="text-sm text-rose-600 dark:text-rose-400 font-bold">{penalty[FIELD_PENALIZACION_PUNTAJE]} puntos</p>
            </div>
            <div className="text-right">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(penalty[FIELD_PENALIZACION_FECHA])}</span>
                <button onClick={onDelete} disabled={isDeleting} className="ml-2 text-rose-500 hover:text-rose-700 disabled:text-slate-400 p-1">
                    <span className="material-icons !text-base">{isDeleting ? 'hourglass_top' : 'delete'}</span>
                </button>
            </div>
        </div>
        {penalty[FIELD_PENALIZACION_NOTAS] && <p className="text-xs mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{penalty[FIELD_PENALIZACION_NOTAS]}</p>}
    </div>
);


const PenalizationManager: React.FC = () => {
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [studentForModal, setStudentForModal] = useState<SelectedStudent | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: penalizedStudents, isLoading, error } = useQuery<PenalizedStudent[]>({
        queryKey: ['allPenalizedStudents'],
        queryFn: async () => {
            const [penaltiesRes, studentsRes] = await Promise.all([
                fetchAllAirtableData<Penalizacion>(AIRTABLE_TABLE_NAME_PENALIZACIONES),
                fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES])
            ]);

            if (penaltiesRes.error || studentsRes.error) throw new Error("Failed to fetch data.");

            const studentMap = new Map(studentsRes.records.map(r => [r.id, r.fields]));
            const penaltiesByStudent = new Map<string, PenalizedStudent>();

            penaltiesRes.records.forEach(p => {
                const studentId = (p.fields[FIELD_PENALIZACION_ESTUDIANTE_LINK] || [])[0];
                if (!studentId) return;
                
                const studentInfo = studentMap.get(studentId);
                if (!studentInfo) return;

                if (!penaltiesByStudent.has(studentId)) {
                    penaltiesByStudent.set(studentId, {
                        id: studentId,
                        legajo: studentInfo[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                        nombre: studentInfo[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                        totalScore: 0,
                        penalties: [],
                    });
                }
                const studentGroup = penaltiesByStudent.get(studentId)!;
                studentGroup.penalties.push({ ...p.fields, id: p.id });
                studentGroup.totalScore += p.fields[FIELD_PENALIZACION_PUNTAJE] || 0;
            });
            
            const sortedStudents = Array.from(penaltiesByStudent.values())
                .sort((a, b) => b.totalScore - a.totalScore);
            
            sortedStudents.forEach(s => s.penalties.sort((a, b) => new Date(b[FIELD_PENALIZACION_FECHA]!).getTime() - new Date(a[FIELD_PENALIZACION_FECHA]!).getTime()));

            return sortedStudents;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (penaltyId: string) => {
            setDeletingId(penaltyId);
            const result = await deleteAirtableRecord(AIRTABLE_TABLE_NAME_PENALIZACIONES, penaltyId);
            if (!result.success) {
                const errorMsg = typeof result.error?.error === 'string' 
                    ? result.error.error 
                    : result.error?.error.message || 'Error desconocido al eliminar.';
                throw new Error(errorMsg);
            }
            return result;
        },
        onSuccess: () => {
            setToastInfo({ message: 'Registro de penalización eliminado.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['allPenalizedStudents'] });
        },
        onError: (error: Error) => {
            setToastInfo({ message: `Error al eliminar: ${error.message}`, type: 'error' });
        },
        onSettled: () => {
            setDeletingId(null);
        },
    });

    const handleDelete = (penaltyId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro de penalización? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(penaltyId);
        }
    };

    const handleOpenAddModal = async (student: { legajo: string, nombre: string }) => {
        const { records } = await fetchAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [], `{${FIELD_LEGAJO_ESTUDIANTES}} = '${student.legajo}'`, 1);
        if (records.length > 0) {
            setStudentForModal({ ...student, id: records[0].id });
            setIsAddModalOpen(true);
        } else {
            setToastInfo({ message: 'No se pudo encontrar el estudiante.', type: 'error' });
        }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            {studentForModal && <AddPenaltyModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} student={studentForModal} onSuccess={() => setToastInfo({ message: 'Penalización aplicada con éxito.', type: 'success' })} />}
            
            <Card title="Dashboard de Penalizaciones" icon="gavel" actions={
                <div className="w-full max-w-sm"><AdminSearch onStudentSelect={handleOpenAddModal} /></div>
            }>
                {isLoading && <div className="py-8"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error" message={error.message} />}
                {!isLoading && !error && (
                    <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700 pt-6 space-y-4">
                        {penalizedStudents && penalizedStudents.length > 0 ? (
                            penalizedStudents.map(student => (
                                <details key={student.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 open:shadow-md">
                                    <summary className="p-4 cursor-pointer flex justify-between items-center list-none">
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">{student.nombre} <span className="text-sm font-mono text-slate-500">({student.legajo})</span></div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-rose-600 dark:text-rose-400 text-lg">{student.totalScore} pts</span>
                                            <span className="material-icons text-slate-400">expand_more</span>
                                        </div>
                                    </summary>
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                                        {student.penalties.map(p => <PenaltyHistoryItem key={p.id} penalty={p} onDelete={() => handleDelete(p.id)} isDeleting={deletingId === p.id} />)}
                                    </div>
                                </details>
                            ))
                        ) : (
                            <EmptyState icon="verified" title="Sin Penalizaciones" message="No hay estudiantes con penalizaciones registradas." />
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PenalizationManager;