import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllAirtableData, updateAirtableRecord } from '../services/airtableService';
import type { LanzamientoPPS } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { formatDate, getStatusVisuals, getEspecialidadClasses } from '../utils/formatters';
import Toast from './Toast';

// Tipos mejorados
type StatusType = 'Abierto' | 'Cerrado' | 'Oculto';
type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
type FilterType = 'all' | 'abierto' | 'cerrado' | 'oculto';

interface StatusOption {
  value: StatusType;
  label: string;
  icon: string;
  description: string;
}

// Configuración de estados
const STATUS_OPTIONS: StatusOption[] = [
  { 
    value: 'Abierto', 
    label: 'Abierto', 
    icon: 'public',
    description: 'Estudiantes pueden postularse'
  },
  { 
    value: 'Cerrado', 
    label: 'Cerrado', 
    icon: 'lock',
    description: 'Solo ver resultados'
  },
  { 
    value: 'Oculto', 
    label: 'Oculto', 
    icon: 'visibility_off',
    description: 'No visible para estudiantes'
  }
];

// Componente para el selector de estado mejorado
const StatusSelector: React.FC<{
  currentStatus: string;
  convocatoriaId: string;
  convocatoriaNombre: string;
  isUpdating: boolean;
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
}> = React.memo(({ currentStatus, convocatoriaId, convocatoriaNombre, isUpdating, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(currentStatus);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedValue(newStatus);
    setIsOpen(false);
    await onStatusChange(convocatoriaId, newStatus);
  }, [convocatoriaId, onStatusChange]);

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === currentStatus);

  return (
    <div className="relative">
      <select
        value={selectedValue}
        onChange={handleChange}
        disabled={isUpdating}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className={`w-full text-sm rounded-lg border p-2.5 pr-10 text-slate-800 bg-white shadow-sm outline-none transition-all duration-200 ${
          isUpdating 
            ? 'bg-slate-100 cursor-wait border-slate-300 ring-2 ring-blue-200' 
            : 'border-slate-300/80 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        }`}
        aria-label={`Cambiar estado para ${convocatoriaNombre}`}
        title={currentOption?.description}
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 transition-all duration-200 ${
        isUpdating ? 'opacity-50' : ''
      }`}>
        {isUpdating ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className={`material-icons !text-base text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}>
            expand_more
          </span>
        )}
      </div>
    </div>
  );
});

StatusSelector.displayName = 'StatusSelector';

// Componente para filtros
const StatusFilter: React.FC<{
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}> = React.memo(({ currentFilter, onFilterChange, counts }) => {
  const filters: Array<{ key: FilterType; label: string; icon: string }> = [
    { key: 'all', label: 'Todas', icon: 'apps' },
    { key: 'abierto', label: 'Abiertas', icon: 'public' },
    { key: 'cerrado', label: 'Cerradas', icon: 'lock' },
    { key: 'oculto', label: 'Ocultas', icon: 'visibility_off' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(filter => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentFilter === filter.key
              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
              : 'bg-white text-slate-600 border border-slate-300/80 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <span className="material-icons !text-base">{filter.icon}</span>
          <span>{filter.label}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
            currentFilter === filter.key
              ? 'bg-white/20 text-white'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {counts[filter.key]}
          </span>
        </button>
      ))}
    </div>
  );
});

StatusFilter.displayName = 'StatusFilter';

// Componente para estadísticas rápidas
const StatsOverview: React.FC<{ lanzamientos: LanzamientoPPS[] }> = React.memo(({ lanzamientos }) => {
  const stats = useMemo(() => {
    const total = lanzamientos.length;
    const abiertos = lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Abierto').length;
    const cerrados = lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Cerrado').length;
    const ocultos = lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Oculto').length;

    return { total, abiertos, cerrados, ocultos };
  }, [lanzamientos]);

  const statCards = [
    { label: 'Total', value: stats.total, icon: 'apps', color: 'bg-slate-100 text-slate-700' },
    { label: 'Abiertas', value: stats.abiertos, icon: 'public', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Cerradas', value: stats.cerrados, icon: 'lock', color: 'bg-blue-100 text-blue-700' },
    { label: 'Ocultas', value: stats.ocultos, icon: 'visibility_off', color: 'bg-amber-100 text-amber-700' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map(stat => (
        <div key={stat.label} className="bg-white rounded-lg border border-slate-200/60 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <span className="material-icons !text-lg">{stat.icon}</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

StatsOverview.displayName = 'StatsOverview';

// Componente principal
const ConvocatoriaManager: React.FC = () => {
  const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Datos filtrados
  const filteredLanzamientos = useMemo(() => {
    let filtered = lanzamientos;

    // Filtro por estado
    if (currentFilter !== 'all') {
      const statusMap: Record<Exclude<FilterType, 'all'>, string> = {
        'abierto': 'Abierto',
        'cerrado': 'Cerrado',
        'oculto': 'Oculto'
      };
      filtered = filtered.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === statusMap[currentFilter]);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l[FIELD_NOMBRE_PPS_LANZAMIENTOS]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l[FIELD_ORIENTACION_LANZAMIENTOS]?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [lanzamientos, currentFilter, searchTerm]);

  // Contadores para filtros
  const filterCounts = useMemo((): Record<FilterType, number> => ({
    all: lanzamientos.length,
    abierto: lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Abierto').length,
    cerrado: lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Cerrado').length,
    oculto: lanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Oculto').length,
  }), [lanzamientos]);

  const fetchData = useCallback(async () => {
    setLoadingState('loading');
    setError(null);
    
    const { records, error: fetchError } = await fetchAllAirtableData<LanzamientoPPS>(
      AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
      [
        FIELD_NOMBRE_PPS_LANZAMIENTOS,
        FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
        FIELD_FECHA_INICIO_LANZAMIENTOS,
        FIELD_ORIENTACION_LANZAMIENTOS,
      ],
      undefined,
      [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]
    );

    if (fetchError) {
      setError('No se pudieron cargar las convocatorias. ' + (typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message));
      setLoadingState('error');
    } else {
      const mappedRecords = records.map(r => ({ ...r.fields, id: r.id }));
      setLanzamientos(mappedRecords);
      setLoadingState('loaded');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    setUpdatingId(id);

    const originalLanzamientos = [...lanzamientos];
    const updatedLanzamientos = lanzamientos.map(l => 
      l.id === id ? { ...l, [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: newStatus } : l
    );
    setLanzamientos(updatedLanzamientos);

    const { error: updateError } = await updateAirtableRecord(
      AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
      id,
      { [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: newStatus }
    );

    if (updateError) {
      setLanzamientos(originalLanzamientos);
      setToastInfo({ message: 'Error al actualizar el estado.', type: 'error' });
    } else {
      setToastInfo({ message: `Estado cambiado a "${newStatus}" exitosamente.`, type: 'success' });
    }
    setUpdatingId(null);
  }, [lanzamientos]);

  const renderTable = () => (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="p-4 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Convocatoria</th>
              <th className="p-4 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">Orientación</th>
              <th className="p-4 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">Fecha Inicio</th>
              <th className="p-4 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">Estado Actual</th>
              <th className="p-4 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">Gestionar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {filteredLanzamientos.map(l => {
              const status = l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] || 'N/A';
              const visuals = getStatusVisuals(status);
              const especialidadClasses = getEspecialidadClasses(l[FIELD_ORIENTACION_LANZAMIENTOS]);
              
              return (
                <tr key={l.id} className="transition-all duration-200 hover:bg-slate-50/50 group">
                  <td className="p-4 align-middle">
                    <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">
                      {l[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-center">
                    <span className={`${especialidadClasses.tag} transition-all duration-200 group-hover:scale-105`}>
                      {l[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-center text-slate-600 font-medium">
                    {formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <span className={`${visuals.labelClass} gap-1.5 transition-all duration-200 group-hover:scale-105`}>
                      <span className="material-icons !text-sm">{visuals.icon}</span>
                      <span>{status}</span>
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <StatusSelector
                      currentStatus={status}
                      convocatoriaId={l.id}
                      convocatoriaNombre={l[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                      isUpdating={updatingId === l.id}
                      onStatusChange={handleStatusChange}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loadingState === 'loading') {
      return <Loader />;
    }
    if (loadingState === 'error') {
      return (
        <EmptyState 
          icon="error" 
          title="Error al Cargar" 
          message={error!}
          action={
            <button
              onClick={fetchData}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Reintentar
            </button>
          }
        />
      );
    }
    if (lanzamientos.length === 0) {
      return <EmptyState icon="upcoming_off" title="Sin Convocatorias" message="No se encontraron lanzamientos de PPS en Airtable." />;
    }
    if (filteredLanzamientos.length === 0) {
      return <EmptyState icon="search_off" title="Sin Resultados" message="No se encontraron convocatorias que coincidan con los filtros." />;
    }
    return renderTable();
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {toastInfo && (
        <Toast 
          message={toastInfo.message} 
          type={toastInfo.type} 
          onClose={() => setToastInfo(null)} 
        />
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <span className="material-icons !text-2xl">admin_panel_settings</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Panel de Administración</h3>
          <p className="text-slate-600 max-w-2xl mt-1">
            Gestiona la visibilidad y estado de las convocatorias para estudiantes.
          </p>
        </div>
      </div>

      {loadingState === 'loaded' && lanzamientos.length > 0 && (
        <>
          <StatsOverview lanzamientos={lanzamientos} />
          
          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <StatusFilter 
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              counts={filterCounts}
            />
            
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Buscar convocatorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300/80 rounded-lg text-sm bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:border-slate-400"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg">
                search
              </span>
            </div>
          </div>
        </>
      )}

      {renderContent()}
    </div>
  );
};

export default ConvocatoriaManager;
