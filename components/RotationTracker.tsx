import React from 'react';

interface RotationTrackerProps {
  label: string;
  count: number;
  total: number;
  orientacionesUnicas: string[];
  labelContainerClassName?: string;
}

const RotationTracker: React.FC<RotationTrackerProps> = ({ label, count, total, orientacionesUnicas, labelContainerClassName = 'h-16' }) => {
  const dots = Array.from({ length: total }, (_, i) => (
    <div
      key={i}
      className={`h-2.5 w-full rounded-full transition-colors duration-300 ${i < count ? 'bg-blue-500' : 'bg-slate-200/70'}`}
      aria-label={`Rotación ${i + 1} ${i < count ? 'completada' : 'pendiente'}`}
    ></div>
  ));

  const completedText = count > 0 
    ? `Has cursado: ${orientacionesUnicas.join(', ')}.`
    : '';

  return (
    <div className="flex flex-col gap-1 w-full text-center items-center">
       <div className={`${labelContainerClassName} flex items-center justify-center`}>
        <p className="text-slate-800 text-sm font-medium leading-normal">{label}</p>
       </div>
       <div className="flex items-center gap-2 w-full my-1.5">
        {dots}
      </div>
      <div className="text-slate-500 text-xs font-normal leading-normal min-h-9 flex flex-col justify-center">
        <p>{count} de {total} completadas.</p>
        {completedText && <p className="font-medium text-slate-600 mt-1">{completedText}</p>}
      </div>
    </div>
  );
};

export default RotationTracker;