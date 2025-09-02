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

const NOTA_OPTIONS = ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

const notaColors: Record<string, string> = {
  '10': 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-500/20',
  '9': 'bg-gradient-to-r from-emerald-300 to-teal-300 text-emerald-900 font-bold',
  '8': 'bg-blue-100 text-blue-800',
  '7': 'bg-sky-100 text-sky-800',
  '6': 'bg-yellow-100 text-yellow-800',
  '5': 'bg-orange-100 text-orange-800',
  '4': 'bg-red-100 text-red-800',
  'Desaprobado': 'bg-red-200 text-red-900 font-bold',
  'No Entregado': 'bg-rose-100 text-rose-800',
  'Entregado (sin corregir)': 'bg-sky-100 text-sky-800',
  'Sin calificar': 'bg-slate-100 text-slate-700'
};

interface PracticasTableProps {
    practicas: Practica[];
    handleNotaChange: (practicaId: string, nota: string, convocatoriaId?: string) => void;
}

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
      scope="col"
      className={`p-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => requestSort(sortKey)}
        className="w-full h-full p-4 flex items-center gap-2 cursor-pointer select-none group transition-colors hover:bg-slate-200/50"
        aria-label={`Ordenar por ${label} en orden ${isActive && sortConfig.direction === 'ascending' ? 'descendiente' : 'ascendiente'}`}
      >
        <div className={`flex items-center gap-2 w-full ${className.includes('text-left') ? 'justify-start' : 'justify-center'}`}>
            <span className="font-bold text-slate-600 text-xs uppercase tracking-wider">{label}</span>
            <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-100 text-slate-900' : 'opacity-50 group-hover:opacity-80'}`}>{icon}</span>
        </div>
      </button>
    </th>
  );
};

const PracticasTable: React.FC<PracticasTableProps> = ({ practicas, handleNotaChange }) => {
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
    <div>
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full h-12 w-12 flex items-center justify-center mt-1">
          <span className="material-icons !text-3xl">work_history</span>
        </div>
        <div>
          <h2 className="text-slate-900 text-2xl font-bold tracking-tight">Historial de Prácticas</h2>
          <p className="text-slate-600 mt-1 max-w-2xl">Aquí se detallan todas las prácticas que has realizado, junto con sus horas, fechas y estado.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <caption className="sr-only">Historial de Prácticas Profesionales Supervisadas</caption>
          <thead className="bg-slate-100/70">
            <tr className="border-b-2 border-slate-200">
              <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/5" />
              <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} />
              <th scope="col" className="p-4 text-center font-bold text-slate-600 text-xs uppercase tracking-wider">Nota</th>
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
              const notaClass = `inline-block px-3 py-1 rounded-full text-xs font-semibold transition-transform hover:scale-105 shadow-sm ${notaColors[nota] || notaColors['Sin calificar']}`;
              const isEditable = nota === 'Sin calificar' || nota === 'Entregado (sin corregir)';

              return (
                <tr 
                  key={practica.id} 
                  className={`transition-all duration-300 odd:bg-white even:bg-slate-50/70 hover:bg-blue-50 hover:shadow-lg hover:ring-2 hover:ring-blue-200/50 hover:relative hover:z-10 ${
                    justUpdatedPracticaId === practica.id ? 'animate-flash-green' : ''
                  }`}
                >
                  <td className="p-4 align-middle text-slate-900 font-semibold break-words text-left">{institucion || 'N/A'}</td>
                  <td className="p-4 align-middle text-center">
                    <span className={`${getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS]).tag} shadow-sm`}>
                      {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-center align-middle text-slate-800 font-medium">{practica[FIELD_HORAS_PRACTICAS] || 0}</td>
                  <td className="p-4 text-center align-middle text-slate-700">
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
                  <td className="p-4 align-middle w-56 text-center">
                    {isEditable ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <select
                              value={nota}
                              onChange={(e) => handleLocalNotaChange(practica.id, e.target.value)}
                              className={`appearance-none w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 bg-white shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 hover:border-blue-400 hover:bg-slate-50
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
                        {justUpdatedPracticaId === practica.id && (
                            <span className="text-xs font-bold text-emerald-600 animate-fade-in-up whitespace-nowrap" style={{ animationDuration: '300ms' }}>
                                Guardado ✓
                            </span>
                        )}
                      </div>
                    ) : (
                      <div className={notaClass} title={`Nota: ${nota}`}>
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
    </div>
  );
};

export default React.memo(PracticasTable);