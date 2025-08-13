import React from 'react';
import { ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';

interface RotationTrackerProps {
  count: number;
  orientacionesUnicas: string[];
}

const RotationTracker: React.FC<RotationTrackerProps> = ({ count, orientacionesUnicas }) => {
  const total = ROTACION_OBJETIVO_ORIENTACIONES;
  const isComplete = count >= total;
  
  const completedText = isComplete
    ? `Rotación completa. Cursaste: ${orientacionesUnicas.join(', ')}.`
    : `Has cursado ${count} de ${total} orientaciones.`;

  return (
    <div className="flex flex-col">
       <div className="flex justify-between items-baseline mb-2">
        <h4 className="text-slate-800 font-semibold text-base leading-tight">Rotación de Orientaciones</h4>
        <p className={`font-bold text-lg ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
          {count}
          <span className="text-slate-400 font-medium">/{total}</span>
        </p>
      </div>

      <div className="flex-grow flex items-center">
        <div className="flex items-center gap-1.5 w-full">
           {Array.from({ length: total }).map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 h-2 rounded-full transition-colors duration-500 ${i < count ? 'bg-blue-500' : 'bg-slate-200'}`}
              title={i < count ? (orientacionesUnicas[i] || `Rotación ${i+1}`) : `Rotación ${i+1} pendiente`}
            />
          ))}
        </div>
      </div>
      
       <div className="text-center mt-2">
        <p className="text-slate-500 text-xs font-medium min-h-[1.25rem]">{completedText}</p>
      </div>
    </div>
  );
};

export default RotationTracker;