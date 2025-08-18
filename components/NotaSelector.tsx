import React from 'react';

interface NotaSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled: boolean;
  isSaving: boolean;
  ariaLabel: string;
}

const NOTA_OPTIONS = ['Sin calificar', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

const NotaSelector: React.FC<NotaSelectorProps> = ({ value, onChange, disabled, isSaving, ariaLabel }) => {
  return (
    <div className="relative w-48">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || isSaving}
        className={`w-full text-sm rounded-lg border p-2.5 pr-10 text-slate-800 bg-white shadow-sm outline-none transition-all duration-200 appearance-none ${
          isSaving 
            ? 'bg-slate-100 cursor-wait border-slate-300 ring-2 ring-blue-200 animate-pulse' 
            : 'border-slate-300/80 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        }`}
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
          <span className="material-icons !text-base text-slate-400">
            expand_more
          </span>
        )}
      </div>
    </div>
  );
};

export default NotaSelector;