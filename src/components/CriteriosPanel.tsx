import React, { useMemo, useState } from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import { useData } from '../contexts/DataContext';
import CriterionCard from './CriterionCard';

// Tipos para mejor tipado
interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

// --- Componente ProgressCircle Mejorado ---
const ProgressCircle: React.FC<ProgressCircleProps> = React.memo(({ 
  value, 
  max, 
  size = 180, 
  strokeWidth = 16,
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  const progressGradientId = 'gradient-progress';
  const completeGradientId = 'gradient-complete';

  return (
    <div 
      className="relative flex-shrink-0 group"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progreso total: ${Math.round(percentage)}% completado`}
    >
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isComplete ? 'animate-pulse-glow' : ''}`} />
      
      <svg 
        className="w-full h-full transform -rotate-90 relative z-10 transition-transform duration-300 group-hover:scale-[1.02]"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-progress-from)" />
            <stop offset="100%" stopColor="var(--gradient-progress-to)" />
          </linearGradient>
          <linearGradient id={completeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-complete-from)" />
            <stop offset="100%" stopColor="var(--gradient-complete-to)" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
          </filter>
        </defs>

        <circle
          className="text-slate-200"
          stroke="currentColor"
          strokeWidth={strokeWidth - 2}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          opacity="0.5"
        />

        <circle
          className="transition-all duration-1000 ease-out"
          stroke={`url(#${isComplete ? completeGradientId : progressGradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          filter="url(#shadow)"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
        <span className={`text-5xl font-black tracking-tight drop-shadow-sm ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
          {Math.round(percentage)}%
        </span>
        <span className="text-sm font-semibold text-slate-500 -mt-1 tracking-wide">
          {Math.round(value)} / {max} hs
        </span>
      </div>
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

// --- Componente OrientacionSelector Mejorado ---
const OrientacionSelector: React.FC<{
  selectedOrientacion: string;
  onOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
}> = React.memo(({ selectedOrientacion, onOrientacionChange, showSaveConfirmation }) => {
  return (
    <div className="animate-fade-in-up flex flex-col justify-center h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <span className="material-icons text-slate-500 !text-lg">psychology</span>
        </div>
        <h3 className="text-slate-800 font-bold text-base leading-tight">
          Define tu Especialidad
        </h3>
      </div>
      <p className="text-xs text-slate-600 mb-4">
        Selecciona tu orientación para ver el progreso de horas.
      </p>
      <div className="relative">
        {showSaveConfirmation && (
          <div className="absolute right-0 -top-10 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in-up shadow">
            <span className="material-icons !text-sm mr-1">check_circle</span>
            ¡Guardado!
          </div>
        )}
        <div className="relative group">
          <select 
            id="orientacion-elegida-select" 
            aria-label="Seleccionar orientación principal"
            value={selectedOrientacion}
            onChange={(e) => onOrientacionChange(e.target.value as Orientacion | "")}
            className="appearance-none w-full rounded-lg border-2 border-slate-300 p-3 pr-10 text-sm font-medium text-slate-800 bg-white shadow-sm outline-none transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">🎯 Seleccionar...</option>
            {ALL_ORIENTACIONES.map(o => (
              <option key={o} value={o}>📚 {o}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
            <span className="material-icons !text-lg text-slate-400 drop-shadow">expand_more</span>
          </div>
        </div>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';

// --- Componente CertificationButton Mejorado ---
const CertificationButton: React.FC = React.memo(() => (
    <a
      href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 active:transform active:scale-95"
      aria-label="Solicitar acreditación final - Se abrirá en nueva ventana"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
      <span className="material-icons !text-lg transition-transform duration-300 relative z-10 group-hover:rotate-12 group-hover:scale-110">school</span>
      <span className="relative z-10 tracking-wide">Solicitar Acreditación</span>
      <span className="material-icons !text-sm opacity-80 transition-transform duration-300 relative z-10 group-hover:translate-x-0.5">open_in_new</span>
    </a>
));

CertificationButton.displayName = 'CertificationButton';


// --- Componente Principal Mejorado ---
const CriteriosPanel: React.FC = () => {
  const { criterios, selectedOrientacion, handleOrientacionChange, showSaveConfirmation } = useData();

  const todosLosCriteriosCumplidos = useMemo(() => 
    criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion,
    [criterios]
  );

  return (
    <section className="animate-fade-in-up">
      <div className={`relative bg-gradient-to-br from-white to-slate-50/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all duration-700 grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-hidden ${
        todosLosCriteriosCumplidos 
          ? 'border-emerald-300/50 shadow-emerald-500/10' 
          : 'border-slate-200 shadow-slate-500/10'
      }`}>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full blur-3xl -z-10" />
        
        {todosLosCriteriosCumplidos && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
        )}

        {/* Progreso Principal */}
        <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8 z-10">
          <ProgressCircle 
            value={criterios.horasTotales} 
            max={HORAS_OBJETIVO_TOTAL}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-slate-100">
                <span className="material-icons text-slate-500 !text-xl">schedule</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                Horas Totales
              </h3>
            </div>
            
            <p className="text-slate-700 text-lg leading-relaxed mb-4">
              Has completado {criterios.cumpleHorasTotales ? 'exitosamente' : 'un total de'} <strong className="font-black text-blue-600 text-xl">{Math.round(criterios.horasTotales)}</strong> de <strong className="font-black text-slate-800 text-xl">{HORAS_OBJETIVO_TOTAL}</strong> horas requeridas.
            </p>
            
            {todosLosCriteriosCumplidos && (
              <div className="mt-6 animate-[subtle-bob_2.5s_ease-in-out_infinite]">
                <CertificationButton />
              </div>
            )}
          </div>
        </div>

        {/* Criterios Secundarios */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200/60 pt-8 lg:pt-0 lg:pl-8 z-10">
          <CriterionCard isComplete={criterios.cumpleRotacion}>
            <RotationTracker
              count={criterios.orientacionesCursadasCount}
              orientacionesUnicas={criterios.orientacionesUnicas}
            />
          </CriterionCard>
          
          <CriterionCard 
            isComplete={criterios.cumpleHorasOrientacion} 
            disableHover={!selectedOrientacion}
          >
            {selectedOrientacion ? (
              <ProgressBar
                label={`Horas en ${selectedOrientacion}`}
                value={criterios.horasOrientacionElegida}
                max={HORAS_OBJETIVO_ORIENTACION}
                unit="hs"
                isComplete={criterios.cumpleHorasOrientacion}
              />
            ) : (
              <OrientacionSelector
                selectedOrientacion={selectedOrientacion}
                onOrientacionChange={handleOrientacionChange}
                showSaveConfirmation={showSaveConfirmation}
              />
            )}
          </CriterionCard>
        </div>
      </div>
    </section>
  );
};

export default CriteriosPanel;