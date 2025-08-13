import React from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import { useData } from '../contexts/DataContext';

// --- Start of inlined ProgressCircle component ---
// Inlined to resolve a persistent module resolution build error.
interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ 
  value, 
  max, 
  size = 160, 
  strokeWidth = 14 
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isComplete = percentage >= 100;
  
  const trackColor = 'text-slate-200';
  const progressColor = isComplete ? 'text-green-500' : 'text-blue-500';
  const textColor = isComplete ? 'text-green-700' : 'text-blue-800';


  return (
    <div 
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track Circle */}
        <circle
          className={trackColor}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle */}
        <circle
          className={`${progressColor} transition-all duration-700 ease-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-4xl font-extrabold tracking-tight ${textColor}`}>
          {Math.round(percentage)}%
        </span>
        <span className="text-sm font-medium text-slate-500 -mt-1">
          Completado
        </span>
      </div>
    </div>
  );
};
// --- End of inlined ProgressCircle component ---


const CriteriosPanel: React.FC = () => {
  const { 
    criterios, 
    selectedOrientacion, 
    handleOrientacionChange, 
    showSaveConfirmation
  } = useData();

  const todosLosCriteriosCumplidos = criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion;

  const orientacionSelector = (
     <div className="animate-fade-in-up">
        <h3 className="text-slate-800 font-semibold text-base leading-tight mb-2">
          Define tu Especialidad
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          Selecciona tu orientación para ver el progreso de las {HORAS_OBJETIVO_ORIENTACION}hs.
        </p>
        <div className="relative">
             <div className={`transition-opacity duration-300 h-4 text-center mb-1 ${showSaveConfirmation ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs font-semibold text-blue-500">Guardado ✓</span>
             </div>
            <select 
              id="orientacion-elegida-select" 
              value={selectedOrientacion}
              onChange={(e) => handleOrientacionChange(e.target.value as Orientacion | "")}
              className="appearance-none w-full rounded-md border border-slate-300/80 p-2.5 pr-10 text-sm text-slate-800 bg-slate-50 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
              aria-label="Seleccionar orientación principal"
            >
              <option value="">Seleccionar orientación...</option>
              {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 top-7">
                <span className="material-icons !text-base">unfold_more</span>
            </div>
      </div>
     </div>
  );

  return (
    <section>
        <h2 className="text-3xl font-bold text-slate-800 mb-6 tracking-tight">Tu Progreso General</h2>
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/70 shadow-lg shadow-slate-500/5 
                grid grid-cols-1 md:grid-cols-5 gap-x-8 gap-y-6">
            
            {/* Left Column: Main Progress */}
            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-6">
                 <ProgressCircle
                    value={criterios.horasTotales}
                    max={HORAS_OBJETIVO_TOTAL}
                />
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-bold text-slate-900">Horas Totales de Práctica</h3>
                    <p className="text-slate-500 mt-1">
                        Has completado <span className="font-bold text-slate-700">{Math.round(criterios.horasTotales)}</span> de <span className="font-bold text-slate-700">{HORAS_OBJETIVO_TOTAL}</span> horas requeridas.
                        {criterios.cumpleHorasTotales 
                            ? <span className="block text-green-600 font-semibold mt-1">¡Objetivo de horas totales cumplido!</span>
                            : <span className="block text-blue-600 font-semibold mt-1">¡Sigue así, estás cada vez más cerca!</span>
                        }
                    </p>
                     {todosLosCriteriosCumplidos && (
                        <a
                            href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white font-bold text-sm py-2.5 px-5 rounded-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
                        >
                            <span className="material-icons !text-base">school</span>
                            <span>Solicitar Acreditación</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Right Column: Secondary Criteria */}
            <div className="md:col-span-2 flex flex-col justify-center gap-8 border-t md:border-t-0 md:border-l border-slate-200/70 pt-6 md:pt-0 md:pl-8">
                <RotationTracker
                    count={criterios.orientacionesCursadasCount}
                    orientacionesUnicas={criterios.orientacionesUnicas}
                />
                
                <div className="h-full flex flex-col">
                    {selectedOrientacion ? (
                        <ProgressBar
                            label={`Horas en ${selectedOrientacion}`}
                            value={criterios.horasOrientacionElegida}
                            max={HORAS_OBJETIVO_ORIENTACION}
                            unit="hs"
                            isComplete={criterios.cumpleHorasOrientacion}
                        />
                    ) : (
                        <>{orientacionSelector}</>
                    )}
                </div>
            </div>
        </div>
    </section>
  );
};

export default CriteriosPanel;