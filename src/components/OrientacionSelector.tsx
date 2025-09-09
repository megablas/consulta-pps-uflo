import React from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';

interface OrientacionSelectorProps {
  selectedOrientacion: string;
  onOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
}

const OrientacionSelector: React.FC<OrientacionSelectorProps> = React.memo(({ selectedOrientacion, onOrientacionChange, showSaveConfirmation }) => {
  return (
    <div className="animate-fade-in-up flex flex-col justify-center h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
          <span className="material-icons text-slate-500 dark:text-slate-300 !text-lg">psychology</span>
        </div>
        <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base leading-tight">
          Define tu Especialidad
        </h3>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
        Selecciona tu orientación para ver el progreso de horas.
      </p>
      <div className="relative">
        {showSaveConfirmation && (
          <div className="absolute right-0 -top-10 text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-600/50 animate-fade-in-up shadow">
            <span className="material-icons !text-sm mr-1">check_circle</span>
            ¡Guardado!
          </div>
        )}
        <div className="relative group">
          <select 
            id="orientacion-elegida-select" 
            aria-label="Seleccionar orientación principal"
            value={selectedOrientacion}
            onChange={(e) => onOrientacionChange(e.target.value as Orientacion | "")}
            className="appearance-none w-full rounded-lg border-2 border-slate-300 dark:border-slate-600 p-3 pr-10 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 shadow-sm outline-none transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
          >
            <option value="">🎯 Seleccionar...</option>
            {ALL_ORIENTACIONES.map(o => (
              <option key={o} value={o}>📚 {o}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
            <span className="material-icons !text-lg text-slate-400 dark:text-slate-400 drop-shadow">expand_more</span>
          </div>
        </div>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';
export default OrientacionSelector;