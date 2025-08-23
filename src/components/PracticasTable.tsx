import React, { useState, useMemo } from 'react';
import type { Practica } from '../types';
import {
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_ESTADO_PRACTICA,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_NOTA_PRACTICAS
} from '../constants';
import {
  formatDate,
  getEspecialidadClasses,
  getStatusVisuals,
  normalizeStringForComparison
} from '../utils/formatters';
import EmptyState from './EmptyState';
import { useData } from '../contexts/DataContext';

const NOTA_OPTIONS = ['Sin calificar', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

const notaColors: Record<string, string> = {
  '10': 'bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '9': 'bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '8': 'bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '7': 'bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '6': 'bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '5': 'bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  '4': 'bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  'Desaprobado': 'bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
  'No Entregado': 'bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-sm font-medium shadow-sm',
  'Sin calificar': 'bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-sm font-medium shadow-sm'
};

const SortableHeader: React.FC<{
  label: string;
  sortKey: string;
  sortConfig: { key: string | null; direction: 'ascending' | 'descending' };
  requestSort: (key: string) => void;
  className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className = "text-center" }) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive ? (sortConfig.direction === 'ascending' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';

  return (
    <th
      className={`p-4 ${className} cursor-pointer select-none group transition-colors hover:bg-slate-100`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${className.includes('text-left') ? 'justify-start' : 'justify-center'}`}>
        <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">{label}</span>
        <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-100 text-slate-900' : 'opacity-50 group-hover:opacity-80'}`}>{icon}</span>
      </div>
    </th>
  );
};

const PracticasTable: React.FC = () => {
  const { practicas, handleNotaChange } = useData();
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: 'fechaInicio', direction: 'descending' });
  const [savingNotaId, setSavingNotaId] = useState<string | null>(null);
  const [justUpdatedPracticaId, setJustUpdatedPracticaId] = useState<string | null>(null);

  const handleLocalNotaChange = (practicaId: string, nota: string) => {
    handleNotaChange(practicaId, nota);
    setSavingNotaId(practicaId);
    setJustUpdatedPracticaId(practicaId);
    setTimeout(() => setSavingNotaId(null), 1000);
    setTimeout(() => setJustUpdatedPracticaId(null), 1500);
  };

  const sortedPracticas = useMemo(() => {
    let processableItems = [...practicas];
    if (sortConfig.key !== null) {
      processableItems.sort((a, b) => {
        let aValue: string | number, bValue: string | number;
        const safeGetTime = (dateStr?: string) => {
          if (!dateStr) return 0;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        switch (sortConfig.key) {
          case 'institucion':
            aValue = normalizeStringForComparison(Array.isArray(a[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? a[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]?.[0] : a[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
            bValue = normalizeStringForComparison(Array.isArray(b[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? b[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]?.[0] : b[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
            break;
          case 'especialidad':
            aValue = normalizeStringForComparison(a[FIELD_ESPECIALIDAD_PRACTICAS]);
            bValue = normalizeStringForComparison(b[FIELD_ESPECIALIDAD_PRACTICAS]);
            break;
          case 'horas':
            aValue = a[FIELD_HORAS_PRACTICAS] || 0;
            bValue = b[FIELD_HORAS_PRACTICAS] || 0;
            break;
          case 'fechaInicio':
            aValue = safeGetTime(a[FIELD_FECHA_INICIO_PRACTICAS]);
            bValue = safeGetTime(b[FIELD_FECHA_INICIO_PRACTICAS]);
            break;
          case 'estado':
            aValue = normalizeStringForComparison(a[FIELD_ESTADO_PRACTICA]);
            bValue = normalizeStringForComparison(b[FIELD_ESTADO_PRACTICA]);
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return processableItems;
  }, [practicas, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (practicas.length === 0) {
    return (
      <EmptyState
        icon="work_history"
        title="Sin Prácticas Registradas"
        message="Cuando completes prácticas, aparecerán aquí con su detalle."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl shadow-lg border border-slate-100/50 bg-white">
      <table className="w-full min-w-[800px] border-collapse">
        <thead className="bg-slate-50/80 backdrop-blur-sm">
          <tr className="border-b border-slate-200">
            <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/5" />
            <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} />
            <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} />
            <th className="p-4 text-center font-semibold text-slate-700 text-xs uppercase tracking-wide">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedPracticas.map((practica) => {
            const institucionRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
            const institucion = Array.isArray(institucionRaw) ? institucionRaw.join(', ') : institucionRaw;
            const statusRaw = practica[FIELD_ESTADO_PRACTICA];
            const status = Array.isArray(statusRaw) ? statusRaw?.[0] : statusRaw;
            const statusVisuals = getStatusVisuals(status);
            const nota = practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar';
            const notaClass = notaColors[nota] || notaColors['Sin calificar'];

            return (
              <tr 
                key={practica.id} 
                className={`transition-all duration-1000 ${
                  justUpdatedPracticaId === practica.id ? 'bg-green-100' : 'hover:bg-slate-50 hover:shadow-sm'
                }`}
              >
                <td className="p-4 align-middle text-sm text-slate-900 font-semibold break-words text-left">{institucion || 'N/A'}</td>
                <td className="p-4 align-middle text-center">
                  <span className={`${getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS]).tag} shadow-sm`}>
                    {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-sm text-center align-middle text-slate-800 font-medium">{practica[FIELD_HORAS_PRACTICAS] || 0}</td>
                <td className="p-4 text-sm text-center align-middle text-slate-700">
                  <div className="flex flex-col items-center">
                    <span>{formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])}</span>
                    <span className="text-xs text-slate-500">a</span>
                    <span>{formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}</span>
                  </div>
                </td>
                <td className="p-4 align-middle text-center">
                  <span className={`${statusVisuals.labelClass} gap-1.5 shadow-sm transition-transform hover:scale-105`}>
                    <span className="material-icons !text-base">{statusVisuals.icon}</span>
                    <span>{status || 'N/A'}</span>
                  </span>
                </td>
                <td className="p-4 align-middle w-48 text-center">
                  {nota === 'Sin calificar' ? (
                    <div className="relative">
                      <select
                        value={nota}
                        onChange={(e) => handleLocalNotaChange(practica.id, e.target.value)}
                        className={`appearance-none w-full text-sm rounded-lg border border-slate-200 p-2.5 bg-white shadow-md outline-none transition-all 
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 hover:border-blue-300
                          ${savingNotaId === practica.id ? 'ring-2 ring-blue-500 border-blue-500 shadow-blue-100 animate-pulse' : ''}`}
                        aria-label={`Calificación para ${institucion}`}
                      >
                        {NOTA_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                        <span className="material-icons !text-base text-slate-500">expand_more</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`inline-block ${notaClass} transition-transform hover:scale-105`} title={`Nota: ${nota}`}>
                      {nota}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PracticasTable;