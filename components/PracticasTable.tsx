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

const NOTA_OPTIONS = ['Sin calificar', '4', '5', '6', '7', '8', '9', '10'];

const notaColors: Record<string, string> = {
  '10': 'bg-green-100 text-green-700 border border-green-300 px-3 py-1 rounded-full text-sm font-semibold',
  '9': 'bg-green-50 text-green-700 border border-green-300 px-3 py-1 rounded-full text-sm font-semibold',
  '8': 'bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1 rounded-full text-sm font-semibold',
  '7': 'bg-sky-50 text-sky-700 border border-sky-300 px-3 py-1 rounded-full text-sm font-semibold',
  '6': 'bg-yellow-50 text-yellow-700 border border-yellow-300 px-3 py-1 rounded-full text-sm font-semibold',
  '5': 'bg-orange-50 text-orange-700 border border-orange-300 px-3 py-1 rounded-full text-sm font-semibold',
  '4': 'bg-red-50 text-red-700 border border-red-300 px-3 py-1 rounded-full text-sm font-semibold',
  'Sin calificar': 'bg-slate-100 text-slate-500 border border-slate-300 px-3 py-1 rounded-full text-sm font-medium'
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
      className={`p-4 ${className} cursor-pointer select-none group transition-colors hover:bg-slate-100/70`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${className.includes('text-left') ? 'justify-start' : 'justify-center'}`}>
        <span>{label}</span>
        <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-90 text-slate-800' : 'opacity-40 group-hover:opacity-70'}`}>{icon}</span>
      </div>
    </th>
  );
};

const PracticasTable: React.FC = () => {
  const { practicas, handleNotaChange } = useData();
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: 'fechaInicio', direction: 'descending' });
  const [savingNotaId, setSavingNotaId] = useState<string | null>(null);

  const handleLocalNotaChange = (practicaId: string, nota: string) => {
    handleNotaChange(practicaId, nota);
    setSavingNotaId(practicaId);
    setTimeout(() => setSavingNotaId(null), 1000);
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
            bValue = safeGetTime(b[FIELD_FECHA_FIN_PRACTICAS]);
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
    <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200/70">
      <table className="w-full min-w-[800px] border-collapse">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200/80">
            <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/5 font-semibold text-slate-500 uppercase text-xs tracking-wider" />
            <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} className="text-center font-semibold text-slate-500 uppercase text-xs tracking-wider"/>
            <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} className="text-center font-semibold text-slate-500 uppercase text-xs tracking-wider"/>
            <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} className="text-center font-semibold text-slate-500 uppercase text-xs tracking-wider"/>
            <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} className="text-center font-semibold text-slate-500 uppercase text-xs tracking-wider"/>
            <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Nota</th>
          </tr>
        </thead>
        <tbody>
          {sortedPracticas.map((practica) => {
            const institucionRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
            const institucion = Array.isArray(institucionRaw) ? institucionRaw.join(', ') : institucionRaw;
            const statusRaw = practica[FIELD_ESTADO_PRACTICA];
            const status = Array.isArray(statusRaw) ? statusRaw?.[0] : statusRaw;
            const statusVisuals = getStatusVisuals(status);
            const nota = practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar';
            const notaClass = notaColors[nota] || notaColors['Sin calificar'];

            return (
              <tr key={practica.id} className="transition-colors duration-200 hover:bg-slate-50/50 border-b border-slate-200/60 last:border-b-0">
                <td className="p-4 align-middle text-sm text-slate-800 font-medium break-words text-left">{institucion || 'N/A'}</td>
                <td className="p-4 align-middle text-center">
                  <span className={getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS]).tag}>
                    {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-sm text-center align-middle text-slate-600 font-semibold hover:bg-slate-100/50 rounded transition-colors">{practica[FIELD_HORAS_PRACTICAS] || 0}</td>
                <td className="p-4 text-sm text-center align-middle text-slate-600">
                  {formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])}<br />
                  {formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}
                </td>
                <td className="p-4 align-middle text-center">
                  <span className={`${statusVisuals.labelClass} gap-1.5`}>
                    <span className="material-icons !text-sm">{statusVisuals.icon}</span>
                    <span>{status || 'N/A'}</span>
                  </span>
                </td>
                <td className="p-3 align-middle w-48 text-center hover:bg-slate-100/50 rounded transition-colors">
                  {nota === 'Sin calificar' ? (
                    <select
                      value={nota}
                      onChange={(e) => handleLocalNotaChange(practica.id, e.target.value)}
                      className={`w-full text-sm rounded-lg border-slate-300/80 p-2.5 bg-white shadow-sm outline-none transition-all 
                        ${savingNotaId === practica.id ? 'ring-2 ring-blue-400 border-blue-400 shadow-blue-200 animate-pulse' : ''}`}
                      aria-label={`Calificación para ${institucion}`}
                    >
                      {NOTA_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <div className={`inline-block ${notaClass}`} title={`Nota: ${nota}`}>
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
