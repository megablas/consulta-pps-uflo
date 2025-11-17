import React from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import Select from './Select';

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
        <Select
            id="orientacion-elegida-select" 
            aria-label="Seleccionar orientación principal"
            value={selectedOrientacion}
            onChange={(e) => onOrientacionChange(e.target.value as Orientacion | "")}
            className="text-sm font-medium"
        >
            <option value="">🎯 Seleccionar...</option>
            {ALL_ORIENTACIONES.map(o => (
              <option key={o} value={o}>📚 {o}</option>
            ))}
        </Select>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';
export default OrientacionSelector;
