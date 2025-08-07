import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  small?: boolean;
  labelContainerClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label, unit = '', small = false, labelContainerClassName = 'h-16' }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const height = small ? 'h-2' : 'h-2.5';
  const labelSize = small ? 'text-xs' : 'text-sm';
  const valueSize = small ? 'text-xs' : 'text-sm';

  return (
    <div className="flex flex-col gap-1 w-full text-center">
      <div className={`${labelContainerClassName} flex items-center justify-center`}>
        <p className={`text-slate-800 font-medium leading-normal ${labelSize}`}>{label}</p>
      </div>
      <div className={`rounded-full ${height} bg-slate-200/70 overflow-hidden my-1.5`}>
        <div 
          className={`${height} rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="min-h-9 flex items-center justify-center">
        <p className={`text-blue-600 font-semibold leading-normal ${valueSize}`}>{Math.round(value)}/{max}{unit}</p>
      </div>
    </div>
  );
};

export default ProgressBar;