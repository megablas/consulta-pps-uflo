import React, { useState, useMemo } from 'react';
import type { Practica } from '../types';
import { FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_ESPECIALIDAD_PRACTICAS, FIELD_NOTA_PRACTICAS } from '../constants';
import { formatDate, getEspecialidadClasses, getStatusVisuals, normalizeStringForComparison } from '../utils/formatters';
import EmptyState from './EmptyState';
import { useData } from '../contexts/DataContext';

const NOTA_OPTIONS = ['Sin calificar', '4', '5', '6', '7', '8', '9', '10'];

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
    <th className={`px-4 py-4 ${className} cursor-pointer select-none group transition-colors hover:bg-slate-200/50 text-slate-600 font-bold text-sm tracking-wider uppercase`} onClick={() => requestSort(sortKey)}>
      <div className="flex items-center justify-center gap-2">
        <span>{label}</span>
        <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-90' : 'opacity-40 group-hover:opacity-70'}`}>{icon}</span>
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
        setTimeout(() => setSavingNotaId(null), 1000); // Visual feedback for 1s
    }

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

                switch(sortConfig.key) {
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

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
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
      <div className="border rounded-lg overflow-x-auto border-slate-200/70 bg-white shadow-md">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-100/70 border-b-2 border-slate-200">
            <tr>
              <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/6" />
              <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} />
              <th className="px-4 py-4 text-center text-slate-600 font-bold text-sm tracking-wider uppercase">
                <div className="flex items-center justify-center gap-2">
                    <span>Nota</span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200/80">Nuevo</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {sortedPracticas.map((practica) => {
              const institucionRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
              const institucion = Array.isArray(institucionRaw) ? institucionRaw.join(', ') : institucionRaw;
              const statusRaw = practica[FIELD_ESTADO_PRACTICA];
              const status = Array.isArray(statusRaw) ? statusRaw?.[0] : statusRaw;
              const statusVisuals = getStatusVisuals(status);

              return (
              <tr key={practica.id} className="transition-colors duration-200 odd:bg-white even:bg-slate-50/50 hover:!bg-blue-50/50">
                <td className="p-4 align-middle text-sm text-slate-800 font-medium break-words">{institucion || 'N/A'}</td>
                <td className="p-4 align-middle text-center">
                    <span className={getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS])}>
                        {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                    </span>
                </td>
                <td className="p-4 text-sm text-center align-middle text-slate-700 font-semibold">{practica[FIELD_HORAS_PRACTICAS] || 0}</td>
                <td className="p-4 text-sm text-center align-middle text-slate-700">
                  {formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])} - {formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}
                </td>
                <td className="p-4 align-middle text-center">
                   <span className={`${statusVisuals.labelClass} gap-1.5`}>
                        <span className="material-icons !text-sm">{statusVisuals.icon}</span>
                        <span>{status || 'N/A'}</span>
                   </span>
                </td>
                <td className="p-2 align-middle w-48">
                    <select
                        value={practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar'}
                        onChange={(e) => handleLocalNotaChange(practica.id, e.target.value)}
                        className={`w-full text-sm rounded-md border-slate-300/80 p-2 text-slate-800 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all ${savingNotaId === practica.id ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                        aria-label={`Calificación para ${institucion}`}
                    >
                        {NOTA_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
  );
};

export default PracticasTable;