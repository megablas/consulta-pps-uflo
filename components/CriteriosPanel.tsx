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

// Configuración de mensajes motivacionales
const MOTIVATIONAL_MESSAGES: MotivationalMessageConfig[] = [
  { threshold: 100, message: "¡Excelente trabajo!", variant: 'success' },
  { threshold: 80, message: "¡Ya casi lo lográs!", variant: 'primary' },
  { threshold: 50, message: "¡Vas por la mitad!", variant: 'primary' },
  { threshold: 25, message: "¡Buen avance, seguí así!", variant: 'secondary' },
  { threshold: 0, message: "¡Recién empezás, vamos!", variant: 'neutral' }
];

// --- Componente ProgressCircle Mejorado ---
const ProgressCircle: React.FC<ProgressCircleProps> = React.memo(({ 
  value, 
  max, 
  size = 160, 
  strokeWidth = 14,
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
      progress: isComplete ? 'text-emerald-500' : 'text-blue-500',
      text: isComplete ? 'text-emerald-700' : 'text-blue-800'
    },
    success: {
      track: 'text-emerald-200',
      progress: 'text-emerald-500',
      text: 'text-emerald-700'
    },
    warning: {
      track: 'text-amber-200',
      progress: 'text-amber-500',
      text: 'text-amber-700'
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
      <svg 
        className={`w-full h-full transform -rotate-90 ${animated ? 'transition-transform duration-300 group-hover:scale-105' : ''}`} 
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track circle */}
        <circle
          className={styles.track}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${styles.progress} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: isComplete ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.3))' : undefined
          }}
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-extrabold tracking-tight ${styles.text} ${animated ? 'transition-colors duration-300' : ''}`}>
            {Math.round(percentage)}%
          </span>
          <span className="text-sm font-medium text-slate-500 -mt-1">
            Completado
          </span>
        </div>
      )}
      
      {/* Glow effect when complete */}
      {isComplete && (
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse" />
      )}
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

// --- Función para mensaje motivacional mejorada ---
const getMotivationalMessage = (percent: number): MotivationalMessageConfig => {
  return MOTIVATIONAL_MESSAGES.find(config => percent >= config.threshold) || MOTIVATIONAL_MESSAGES[MOTIVATIONAL_MESSAGES.length - 1];
};

// --- Componente OrientacionSelector ---
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
      <div className="flex items-center gap-2 mb-2">
        <span className="material-icons text-blue-500 !text-xl">psychology</span>
        <h3 className="text-slate-800 font-semibold text-base leading-tight">
          Define tu Especialidad
        </h3>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        Seleccioná tu orientación para ver el progreso de las {HORAS_OBJETIVO_ORIENTACION}hs.
      </p>
      <div className="relative">
        {showSaveConfirmation && (
          <div className="absolute right-0 -top-8 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 transition-all duration-300 animate-fade-in">
            <span className="material-icons !text-xs mr-1">check_circle</span>
            Guardado
          </div>
        )}
        <select 
          id="orientacion-elegida-select" 
          aria-label="Seleccionar orientación principal"
          value={selectedOrientacion}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          className={`appearance-none w-full rounded-lg border p-3 pr-10 text-sm text-slate-800 bg-white shadow-sm outline-none transition-all duration-200 ${
            isOpen 
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' 
              : 'border-slate-300/80 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          }`}
        >
          <option value="">Seleccionar orientación...</option>
          {ALL_ORIENTACIONES.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <span className="material-icons !text-base text-slate-500">expand_more</span>
        </div>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';

// --- Componente CertificationButton ---
const CertificationButton: React.FC = React.memo(() => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-sm py-3 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2 shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:transform active:scale-95"
      aria-label="Solicitar acreditación final - Se abrirá en nueva ventana"
    >
      <span 
        className={`material-icons !text-base transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}
        aria-hidden="true"
      >
        school
      </span>
      <span>Solicitar Acreditación Final</span>
      <span 
        className={`material-icons !text-sm opacity-75 transition-transform duration-300 ${isHovered ? 'translate-x-0.5' : ''}`}
        aria-hidden="true"
      >
        open_in_new
      </span>
    </a>
  );
});

CertificationButton.displayName = 'CertificationButton';

// --- Componente Principal ---
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

  const { horasTotalesPercent, todosLosCriteriosCumplidos, motivationalMessage } = progressData;

  const messageVariantStyles = {
    success: 'text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md',
    primary: 'text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md',
    secondary: 'text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md',
    neutral: 'text-slate-600'
  };

  return (
    <section className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${todosLosCriteriosCumplidos ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'} transition-colors duration-300`}>
          <span className="material-icons !text-2xl">
            {todosLosCriteriosCumplidos ? 'verified' : 'trending_up'}
          </span>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
          {todosLosCriteriosCumplidos ? '¡Felicitaciones, objetivo cumplido!' : 'Tu Progreso General'}
        </h2>
      </div>
      
      <div className={`bg-white p-6 sm:p-8 rounded-2xl border shadow-lg transition-all duration-500 grid grid-cols-1 md:grid-cols-5 gap-x-8 gap-y-6 ${
        todosLosCriteriosCumplidos 
          ? 'border-emerald-300/80 shadow-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/30' 
          : 'border-slate-200/70 shadow-slate-500/5 hover:shadow-lg hover:border-slate-300/80'
      }`}>
        {/* Progreso Principal */}
        <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-6">
          <ProgressCircle 
            value={criterios.horasTotales} 
            max={HORAS_OBJETIVO_TOTAL}
            variant={todosLosCriteriosCumplidos ? 'success' : 'default'}
          />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {criterios.cumpleHorasTotales ? 'Horas Totales Completadas' : 'Horas Totales de Práctica'}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Has completado{' '}
              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {Math.round(criterios.horasTotales)}
              </span>{' '}
              de{' '}
              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {HORAS_OBJETIVO_TOTAL}
              </span>{' '}
              horas requeridas.
            </p>
            <div className={`mt-2 font-semibold text-sm inline-block ${messageVariantStyles[motivationalMessage.variant]}`}>
              {motivationalMessage.message}
            </div>
            
            {todosLosCriteriosCumplidos && (
              <div className="mt-6">
                <CertificationButton />
              </div>
            )}
          </div>
        </div>

        {/* Criterios Secundarios */}
        <div className="md:col-span-2 flex flex-col justify-center gap-8 border-t md:border-t-0 md:border-l border-slate-200/70 pt-6 md:pt-0 md:pl-8">
          <div className="transition-all duration-300 hover:scale-105">
            <RotationTracker
              count={criterios.orientacionesCursadasCount}
              orientacionesUnicas={criterios.orientacionesUnicas}
            />
          </div>
          
          <div className="flex flex-col transition-all duration-300 hover:scale-105">
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
