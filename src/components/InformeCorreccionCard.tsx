import React, { useMemo, useState } from 'react';
import type { InformeCorreccionPPS, InformeCorreccionStudent } from '../types';
import NotaSelector from './NotaSelector';
import Checkbox from './Checkbox';
import { addBusinessDays, formatDate, parseToUTCDate } from '../utils/formatters';

const NOTA_OPTIONS = ['Sin calificar', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

interface InformeCorreccionCardProps {
  ppsGroup: InformeCorreccionPPS;
  onNotaChange: (practicaId: string, newNota: string, convocatoriaId?: string) => Promise<void>;
  updatingNotaId: string | null;
  // Batch update props
  selectedStudents: Set<string>;
  onSelectionChange: (practicaId: string) => void;
  onSelectAll: (practicaIds: string[], select: boolean) => void;
  onBatchUpdate: (newNota: string) => Promise<void>;
  isBatchUpdating: boolean;
  searchTerm: string;
}

const HighlightedName: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 rounded px-1">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

const InformeCorreccionCard: React.FC<InformeCorreccionCardProps> = ({ 
  ppsGroup, 
  onNotaChange, 
  updatingNotaId,
  selectedStudents,
  onSelectionChange,
  onSelectAll,
  onBatchUpdate,
  isBatchUpdating,
  searchTerm,
}) => {
  const { ppsName, orientacion, students, informeLink, fechaFinalizacion } = ppsGroup;
  const [batchNota, setBatchNota] = useState('10');
  const [justUpdatedPracticaId, setJustUpdatedPracticaId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const qualifiableStudents = students.filter(s => !!s.practicaId);
    const totalStudents = students.length;
    const corregidos = students.filter(s => s.nota && s.nota !== 'Sin calificar').length;
    const isAllSelected = qualifiableStudents.length > 0 && qualifiableStudents.every(s => s.practicaId && selectedStudents.has(s.practicaId));
    return { totalStudents, corregidos, isAllSelected, qualifiableStudents };
  }, [students, selectedStudents]);

  const correctionDeadlineInfo = useMemo(() => {
    // The correction deadline is relevant for any PPS group where at least one student is pending a grade.
    // We display it based on the end date, regardless of individual report submission status,
    // as it provides a clear timeline for the person correcting.
    const isPending = students.some(s => !s.nota || s.nota === 'Sin calificar');
    if (!isPending) return null;

    if (!fechaFinalizacion) {
        return {
            text: 'Límite no calculable (sin fecha de fin)',
            className: 'bg-slate-100 text-slate-600',
            icon: 'help_outline',
            date: null
        };
    }
    
    const finalizacionDate = parseToUTCDate(fechaFinalizacion);

    if (!finalizacionDate) {
        return {
            text: 'Límite no calculable (fecha inválida)',
            className: 'bg-slate-100 text-slate-600',
            icon: 'help_outline',
            date: null
        };
    }

    const deadline = addBusinessDays(finalizacionDate, 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));

    let className = 'bg-slate-100 text-slate-600';
    if (diffDays < 0) {
      className = 'bg-red-100 text-red-700';
    } else if (diffDays <= 7) {
      className = 'bg-amber-100 text-amber-700';
    }
    return { date: deadline, className, icon: 'alarm', text: null };
  }, [fechaFinalizacion, students]);


  const handleNotaChange = async (practicaId: string, newNota: string, convocatoriaId: string) => {
    await onNotaChange(practicaId, newNota, convocatoriaId);
    setJustUpdatedPracticaId(practicaId);
    setTimeout(() => setJustUpdatedPracticaId(null), 1500); 
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const allPracticaIds = stats.qualifiableStudents.map(s => s.practicaId).filter((id): id is string => !!id);
    onSelectAll(allPracticaIds, isChecked);
  };
  
  const handleBatchUpdateClick = async () => {
    if (selectedStudents.size > 0) {
      await onBatchUpdate(batchNota);
    }
  };

  return (
    <details className="bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all duration-300 open:shadow-lg open:border-blue-200 group" open>
      <summary className="p-4 cursor-pointer flex justify-between items-center list-none">
        <div className="flex-grow">
          <h4 className="font-bold text-slate-800 group-open:text-blue-700">{ppsName}</h4>
          <p className="text-sm text-slate-500">{orientacion}</p>
          {correctionDeadlineInfo && (
            <p className={`text-xs font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 mt-2 ${correctionDeadlineInfo.className}`}>
                <span className="material-icons !text-sm">{correctionDeadlineInfo.icon}</span>
                <span>
                    {correctionDeadlineInfo.date
                        ? `Límite de corrección: ${formatDate(correctionDeadlineInfo.date.toISOString())}`
                        : correctionDeadlineInfo.text
                    }
                </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {informeLink && (
            <a
              href={informeLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} 
              className="hidden sm:inline-flex items-center gap-2 bg-blue-100 text-blue-700 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors"
              aria-label={`Ir a la tarea del campus para ${ppsName}`}
            >
              <span className="material-icons !text-base">launch</span>
              <span>Ir al Campus</span>
            </a>
          )}
          <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            {stats.corregidos} / {stats.totalStudents} Corregidos
          </div>
          <div className="text-slate-400 transition-transform duration-300 group-open:rotate-180">
            <span className="material-icons">expand_more</span>
          </div>
        </div>
      </summary>
      
      {/* Batch Actions */}
      {selectedStudents.size > 0 && (
          <div className="border-t border-b border-slate-200 bg-blue-50/50 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in-up">
              <p className="text-sm font-semibold text-blue-800">
                  {selectedStudents.size} alumno{selectedStudents.size > 1 ? 's' : ''} seleccionado{selectedStudents.size > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                  <select
                      value={batchNota}
                      onChange={(e) => setBatchNota(e.target.value)}
                      className="text-sm rounded-lg border border-slate-300/80 p-2 bg-white shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus-ring-blue-500/20"
                      aria-label="Seleccionar nota para el lote"
                  >
                      {NOTA_OPTIONS.filter(o => o !== 'Sin calificar' && o !== 'No Entregado').map(option => (
                          <option key={option} value={option}>{option}</option>
                      ))}
                  </select>
                  <button 
                    onClick={handleBatchUpdateClick} 
                    disabled={isBatchUpdating}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
                  >
                     {isBatchUpdating ? (
                         <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                     ) : (
                         <span className="material-icons !text-base">done_all</span>
                     )}
                     <span>Aplicar</span>
                  </button>
              </div>
          </div>
      )}

      <div className="border-t border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="p-3 w-12 text-center">
                    <input
                        type="checkbox"
                        checked={stats.isAllSelected}
                        onChange={handleSelectAll}
                        disabled={stats.qualifiableStudents.length === 0}
                        className="h-4 w-4 rounded text-blue-600 border-slate-400 focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Seleccionar todos los alumnos"
                    />
                </th>
                <th className="p-3 text-left font-semibold text-slate-500">Alumno</th>
                <th className="p-3 text-center font-semibold text-slate-500">Entrega</th>
                <th className="p-3 text-left font-semibold text-slate-500">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {students.map(student => (
                <tr key={student.convocatoriaId} className={`transition-colors duration-1000 ${!!student.practicaId && selectedStudents.has(student.practicaId) ? 'bg-blue-50/70' : ''} ${justUpdatedPracticaId === student.practicaId ? 'bg-green-100' : 'hover:bg-slate-50/50'}`}>
                  <td className="p-3 text-center">
                      <input
                          type="checkbox"
                          checked={!!student.practicaId && selectedStudents.has(student.practicaId)}
                          onChange={() => student.practicaId && onSelectionChange(student.practicaId)}
                          disabled={!student.practicaId}
                          className="h-4 w-4 rounded text-blue-600 border-slate-400 focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Seleccionar a ${student.studentName}`}
                      />
                  </td>
                  <td className="p-3 font-medium text-slate-800">
                    <HighlightedName text={student.studentName} highlight={searchTerm} />
                  </td>
                  <td className="p-3 text-center">
                    <span 
                      className={`material-icons !text-xl ${student.informeSubido ? 'text-green-500' : 'text-slate-300'}`}
                      title={student.informeSubido ? 'Informe entregado' : 'Informe pendiente'}
                    >
                      {student.informeSubido ? 'check_circle' : 'circle'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <NotaSelector
                        value={student.nota || 'Sin calificar'}
                        onChange={(e) => student.practicaId && handleNotaChange(student.practicaId, e.target.value, student.convocatoriaId)}
                        disabled={!student.practicaId}
                        isSaving={updatingNotaId === student.practicaId}
                        ariaLabel={`Nota para ${student.studentName}`}
                      />
                      {justUpdatedPracticaId === student.practicaId && (
                        <span className="text-xs font-bold text-emerald-600 animate-fade-in-up" style={{ animationDuration: '300ms' }}>
                            Guardado ✓
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
};

export default InformeCorreccionCard;