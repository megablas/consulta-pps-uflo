import React from 'react';
import { ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';

interface RotationTrackerProps {
  count: number;
  orientacionesUnicas: string[];
}

const RotationTracker: React.FC<RotationTrackerProps> = ({ count, orientacionesUnicas }) => {
  const total = ROTACION_OBJETIVO_ORIENTACIONES;
  const isComplete = count >= total;
  const colorClass = 'text-blue-600';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-base font-bold text-slate-800">
          Rotación de Orientaciones
        </h4>
        <div className={`flex items-center gap-1.5 text-sm font-bold ${isComplete ? colorClass : 'text-slate-800'}`}>
          {isComplete && <span className="material-icons !text-base">check_circle</span>}
          <span>{count} / {total}</span>
        </div>
      </div>
      
      {/* Progress Bars */}
      <div className="flex gap-1.5 h-2">
        {[...Array(total)].map((_, i) => (
          <div key={i} className="flex-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${i < count ? 'bg-blue-600' : ''}`}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      {orientacionesUnicas.length > 0 && (
        <div className="mt-2 text-xs text-slate-500 font-medium">
          <span className="font-semibold">Cursadas:</span> {orientacionesUnicas.join(', ')}
        </div>
      )}
    </div>
  );
};

export default RotationTracker;