import React from 'react';
import Select from './Select';

const NOTA_OPTIONS = ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

interface NotaSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  isSaving?: boolean;
  ariaLabel: string;
}

const NotaSelector: React.FC<NotaSelectorProps> = ({ value, onChange, disabled, isSaving, ariaLabel }) => {
  
  const getBackgroundColor = (nota: string) => {
    if (nota === 'Entregado (sin corregir)') return 'bg-sky-100 dark:bg-sky-900/50';
    if (nota === 'No Entregado') return 'bg-rose-100 dark:bg-rose-900/50';
    if (nota === 'Desaprobado') return 'bg-red-100 dark:bg-red-900/50';
    if (nota === 'Sin calificar') return 'bg-slate-100 dark:bg-slate-700/80';
    const numNota = parseInt(nota, 10);
    if (numNota >= 7) return 'bg-green-100 dark:bg-green-900/50';
    if (numNota >= 4) return 'bg-yellow-100 dark:bg-yellow-900/50';
    return 'bg-white dark:bg-slate-700';
  };
  
  const bgColor = getBackgroundColor(value);

  return (
    <div className="relative w-full sm:w-48">
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled || isSaving}
        className={`w-full py-2 pl-3 pr-8 text-sm font-medium ${bgColor} ${isSaving ? 'ring-2 ring-blue-500/50 border-blue-500 animate-pulse' : ''}`}
        aria-label={ariaLabel}
      >
        {NOTA_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </Select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        {isSaving && (
          <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
};

export default NotaSelector;
