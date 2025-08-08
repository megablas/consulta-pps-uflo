import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label, unit = '' }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const roundedValue = Math.round(value);
  const faltantes = Math.max(0, max - roundedValue);
  const progressText = faltantes > 0 ? `Faltan ${faltantes} ${unit} para el objetivo.` : `¡Objetivo cumplido!`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-baseline">
        <p className="text-slate-800 font-semibold text-sm leading-tight">{label}</p>
        <p className="text-blue-600 font-bold text-sm">
          {roundedValue}
          <span className="text-slate-400 font-medium">/{max}{unit}</span>
        </p>
      </div>
      <div className="flex-grow flex items-center py-3">
        <div className="w-full rounded-full h-3.5 bg-slate-200/70 overflow-hidden">
          <div
            className="h-3.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          ></div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-500 text-xs font-medium min-h-[1.25rem]">{progressText}</p>
      </div>
    </div>
  );
};

export default ProgressBar;