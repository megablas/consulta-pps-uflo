import React from 'react';

interface RotationTrackerProps {
  label: string;
  count: number;
  total: number;
  orientacionesUnicas: string[];
}

const RotationTracker: React.FC<RotationTrackerProps> = ({ label, count, total, orientacionesUnicas }) => {
  const dots = Array.from({ length: total }, (_, i) => (
    <div
      key={i}
      className={`h-3.5 w-full rounded-full transition-colors duration-300 ${i < count ? 'bg-blue-500' : 'bg-slate-200/70'}`}
      aria-label={`Rotación ${i + 1} ${i < count ? 'completada' : 'pendiente'}`}
    ></div>
  ));

  const completedText = count > 0
    ? `Has cursado: ${orientacionesUnicas.join(', ')}.`
    : `Completa ${total} rotaciones para finalizar.`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-baseline">
        <p className="text-slate-800 font-semibold text-sm leading-tight">{label}</p>
        <p className="text-blue-600 font-bold text-sm">
          {count}
          <span className="text-slate-400 font-medium">/{total}</span>
        </p>
      </div>
      <div className="flex-grow flex items-center py-3">
        <div className="flex items-center gap-2.5 w-full">
          {dots}
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-500 text-xs font-medium min-h-[1.25rem]">{completedText}</p>
      </div>
    </div>
  );
};

export default RotationTracker;