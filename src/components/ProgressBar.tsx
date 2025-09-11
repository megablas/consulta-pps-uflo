import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  isComplete: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label, unit = '', isComplete }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const roundedValue = Math.round(value);
  const colorClass = 'bg-blue-600 dark:bg-blue-500';
  const textClass = 'text-blue-600 dark:text-blue-400';

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-base font-bold text-slate-800 dark:text-slate-100">{label}</span>
        <div className="text-sm font-semibold">
          <span className={`font-black ${textClass}`}>{roundedValue}</span>
          <span className="text-slate-500 dark:text-slate-400"> / {max}{unit}</span>
        </div>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 shadow-inner">
        <div
          className={`${colorClass} h-2.5 rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        ></div>
      </div>
       {isComplete && (
        <div className={`flex items-center gap-1 text-xs font-bold ${textClass} mt-1.5`}>
          <span className="material-icons !text-sm">check_circle</span>
          <span>¡Objetivo cumplido!</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;