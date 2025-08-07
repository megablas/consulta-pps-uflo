import React from 'react';

interface LegajoInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

const LegajoInput: React.FC<LegajoInputProps> = ({ value, onChange, onKeyPress, disabled }) => {
  return (
    <div className="relative flex-grow">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="material-icons text-slate-400">search</span>
      </div>
      <input
        type="text"
        id="legajo"
        name="legajo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300/80 p-3 pl-10 text-base text-slate-800 bg-white shadow-sm
                   placeholder-slate-400/80
                   focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all
                   disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        placeholder="Ingresa tu número de legajo"
        aria-label="Número de Legajo"
      />
    </div>
  );
};

export default LegajoInput;