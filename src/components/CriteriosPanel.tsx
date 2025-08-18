import React, { useMemo, useState, useCallback } from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import { useData } from '../contexts/DataContext';

// Tipos para mejor tipado
interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning';
}

interface MotivationalMessageConfig {
  threshold: number;
  message: string;
  variant: 'success' | 'primary' | 'secondary' | 'neutral';
}

// Configuración de mensajes motivacionales mejorada
const MOTIVATIONAL_MESSAGES: MotivationalMessageConfig[] = [
  { threshold: 100, message: "¡Excelente trabajo! Has completado todos los requisitos.", variant: 'success' },
  { threshold: 80, message: "¡Ya casi lo lográs! Estás muy cerca del objetivo.", variant: 'primary' },
  { threshold: 50, message: "¡Vas por la mitad del camino! Buen progreso.", variant: 'primary' },
  { threshold: 25, message: "¡Buen avance, seguí así!", variant: 'secondary' },
  { threshold: 0, message: "Todo gran viaje comienza con un primer paso.", variant: 'neutral' }
];

// --- Componente ProgressCircle Mejorado ---
const ProgressCircle: React.FC<ProgressCircleProps> = React.memo(({ 
  value, 
  max, 
  size = 180, 
  strokeWidth = 16,
  animated = true,
  showPercentage = true,
  variant = 'default'
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  const variantStyles = {
    default: {
      track: 'text-slate-200',
      progress: 'from-blue-400 via-blue-500 to-blue-600',
      text: 'text-blue-800',
      glow: 'shadow-blue-500/30'
    },
    success: {
      track: 'text-slate-200',
      progress: 'from-blue-400 via-blue-500 to-blue-600',
      text: 'text-blue-800',
      glow: 'shadow-blue-500/30'
    },
    warning: {
      track: 'text-amber-200',
      progress: 'from-amber-400 via-amber-500 to-amber-600',
      text: 'text-amber-700',
      glow: 'shadow-amber-500/30'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div 
      className="relative flex-shrink-0 group"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progreso: ${Math.round(percentage)}% completado`}
    >
      {/* Outer pulse effect on completion */}
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isComplete ? 'animate-pulse-glow' : ''}`} />
      
      <svg 
        className={`w-full h-full transform -rotate-90 relative z-10 ${animated ? 'transition-transform duration-300 group-hover:scale-[1.02]' : ''}`} 
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={`gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className={`text-blue-400`} stopColor="currentColor" />
            <stop offset="50%" className={`text-blue-500`} stopColor="currentColor" />
            <stop offset="100%" className={`text-blue-600`} stopColor="currentColor" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Track circle with subtle gradient */}
        <circle
          className={styles.track}
          stroke="currentColor"
          strokeWidth={strokeWidth - 2}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          opacity="0.3"
        />

        {/* Progress circle */}
        <circle
          className={`${animated ? 'transition-all duration-1000 ease-out' : ''}`}
          stroke={`url(#gradient-${variant})`}
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
      
      {showPercentage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <span className={`text-5xl font-black tracking-tight ${styles.text} ${animated ? 'transition-all duration-500' : ''} drop-shadow-sm`}>
            {Math.round(percentage)}%
          </span>
          <span className="text-sm font-semibold text-slate-500 -mt-1 tracking-wide">
            COMPLETADO
          </span>
        </div>
      )}
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

// --- Función para mensaje motivacional mejorada ---
const getMotivationalMessage = (percent: number): MotivationalMessageConfig => {
  return MOTIVATIONAL_MESSAGES.find(config => percent >= config.threshold) || MOTIVATIONAL_MESSAGES[MOTIVATIONAL_MESSAGES.length - 1];
};

// --- Componente OrientacionSelector Mejorado ---
const OrientacionSelector: React.FC<{
  selectedOrientacion: string;
  onOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
}> = React.memo(({ selectedOrientacion, onOrientacionChange, showSaveConfirmation }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onOrientacionChange(e.target.value as Orientacion | "");
    setIsOpen(false);
  }, [onOrientacionChange]);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
          <span className="material-icons text-white !text-lg">psychology</span>
        </div>
        <h3 className="text-slate-800 font-bold text-lg leading-tight">
          Define tu Especialidad
        </h3>
      </div>
      <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <span className="material-icons !text-sm text-slate-500 mr-1">info</span>
        Seleccioná tu orientación para ver el progreso de las {HORAS_OBJETIVO_ORIENTACION}hs especializadas.
      </p>
      <div className="relative">
        {showSaveConfirmation && (
          <div className="absolute right-0 -top-10 text-xs font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-2 rounded-lg border-2 border-emerald-200 transition-all duration-300 animate-fade-in shadow-lg">
            <span className="material-icons !text-sm mr-1">check_circle</span>
            ¡Guardado exitosamente!
          </div>
        )}
        <div className="relative group">
          <select 
            id="orientacion-elegida-select" 
            aria-label="Seleccionar orientación principal"
            value={selectedOrientacion}
            onChange={handleChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            className={`appearance-none w-full rounded-xl border-2 p-4 pr-12 text-sm font-medium text-slate-800 bg-gradient-to-r from-white to-slate-50 shadow-lg outline-none transition-all duration-300 ${
              isOpen 
                ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-xl transform scale-[1.02]' 
                : 'border-slate-300 hover:border-blue-400 hover:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
            }`}
          >
            <option value="">🎯 Seleccionar orientación...</option>
            {ALL_ORIENTACIONES.map(o => (
              <option key={o} value={o}>📚 {o}</option>
            ))}
          </select>
          <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 transition-all duration-300 ${isOpen ? 'rotate-180 scale-110' : 'group-hover:scale-110'}`}>
            <span className="material-icons !text-xl text-slate-500 drop-shadow">expand_more</span>
          </div>
          {/* Subtle animated border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';

// --- Componente CertificationButton Mejorado ---
const CertificationButton: React.FC = React.memo(() => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <a
        href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-700 to-indigo-800 hover:from-blue-700 hover:via-indigo-800 hover:to-indigo-900 text-white font-bold text-sm py-4 px-8 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 shadow-xl hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 active:transform active:scale-95"
        aria-label="Solicitar acreditación final - Se abrirá en nueva ventana"
      >
        {/* Background animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        
        <span 
          className={`material-icons !text-lg transition-all duration-300 relative z-10 ${isHovered ? 'rotate-12 scale-125' : ''}`}
          aria-hidden="true"
        >
          school
        </span>
        <span className="relative z-10 tracking-wide">Solicitar Acreditación Final</span>
        <span 
          className={`material-icons !text-sm opacity-90 transition-all duration-300 relative z-10 ${isHovered ? 'translate-x-1 scale-110' : ''}`}
          aria-hidden="true"
        >
          open_in_new
        </span>
      </a>
      
      {/* Floating particles effect */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-75"
              style={{
                left: `${20 + i * 15}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

CertificationButton.displayName = 'CertificationButton';

// --- Componente Principal Mejorado ---
const CriteriosPanel: React.FC = () => {
  const { criterios, selectedOrientacion, handleOrientacionChange, showSaveConfirmation } = useData();

  // Memoización de cálculos
  const progressData = useMemo(() => {
    const horasTotalesPercent = (criterios.horasTotales / HORAS_OBJETIVO_TOTAL) * 100;
    const todosLosCriteriosCumplidos = criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion;
    const motivationalMessage = getMotivationalMessage(horasTotalesPercent);

    return {
      horasTotalesPercent,
      todosLosCriteriosCumplidos,
      motivationalMessage
    };
  }, [criterios]);

  const { todosLosCriteriosCumplidos } = progressData;

  return (
    <section className="animate-fade-in-up">
      <div className={`relative bg-gradient-to-br from-white/80 via-white/70 to-slate-50/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border shadow-2xl transition-all duration-700 grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-8 overflow-hidden ${
        todosLosCriteriosCumplidos 
          ? 'border-blue-300/50 shadow-blue-500/10' 
          : 'border-slate-200 shadow-slate-500/10 hover:shadow-2xl hover:border-slate-300'
      }`}>
        
        {/* Decorative background patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full blur-3xl -z-10" />
        
        {todosLosCriteriosCumplidos && (
          <>
            <div 
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, theme(colors.blue.200) 1px, transparent 0)',
                backgroundSize: '2rem 2rem',
                animation: 'slow-pan 60s linear infinite'
              }}
            />
            {/* Celebration sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-gradient-to-r from-sky-400 to-blue-400 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: '3s'
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Progreso Principal */}
        <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8 z-10">
          <ProgressCircle 
            value={criterios.horasTotales} 
            max={HORAS_OBJETIVO_TOTAL}
            variant={todosLosCriteriosCumplidos ? 'success' : 'default'}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <span className="material-icons text-white !text-xl">schedule</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {criterios.cumpleHorasTotales ? 'Horas Completadas' : 'Horas de Práctica'}
              </h3>
            </div>
            
            <p className="text-slate-700 text-lg leading-relaxed mb-4">
              Has completado{' '}
              <strong className="font-black text-blue-600 text-xl">
                {Math.round(criterios.horasTotales)}
              </strong>{' '}
              de{' '}
              <strong className="font-black text-slate-800 text-xl">
                {HORAS_OBJETIVO_TOTAL}
              </strong>{' '}
              horas requeridas.
            </p>
            
            {todosLosCriteriosCumplidos && (
              <div className="mt-6 animate-[subtle-bob_2.5s_ease-in-out_infinite]">
                <CertificationButton />
              </div>
            )}
          </div>
        </div>

        {/* Criterios Secundarios */}
        <div className="lg:col-span-2 flex flex-col justify-center gap-10 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200 pt-8 lg:pt-0 lg:pl-10 z-10">
          <div className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 rounded-2xl hover:bg-white/50">
            <RotationTracker
              count={criterios.orientacionesCursadasCount}
              orientacionesUnicas={criterios.orientacionesUnicas}
            />
          </div>
          
          <div className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 rounded-2xl hover:bg-white/50">
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default CriteriosPanel;