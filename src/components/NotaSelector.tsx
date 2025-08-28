import React from 'react';

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
    if (nota === 'Entregado (sin corregir)') return 'bg-sky-100';
    if (nota === 'No Entregado') return 'bg-rose-100';
    if (nota === 'Desaprobado') return 'bg-red-100';
    if (nota === 'Sin calificar') return 'bg-slate-100';
    const numNota = parseInt(nota, 10);
    if (numNota >= 7) return 'bg-green-100';
    if (numNota >= 4) return 'bg-yellow-100';
    return 'bg-white';
  };
  
  const bgColor = getBackgroundColor(value);

  return (
    <div className="relative w-full sm:w-48">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || isSaving}
        className={`w-full appearance-none rounded-lg border border-slate-300/80 py-2 pl-3 pr-8 text-sm font-medium shadow-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:opacity-70 ${bgColor}`}
        aria-label={ariaLabel}
      >
        {NOTA_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        {isSaving ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="material-icons !text-base text-slate-400">unfold_more</span>
        )}
      </div>
    </div>
  );
};

export default NotaSelector;
