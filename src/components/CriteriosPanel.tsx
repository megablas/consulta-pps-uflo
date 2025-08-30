import React, { useMemo } from 'react';
import { HORAS_OBJETIVO_TOTAL } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import ProgressCircle from './ProgressCircle';
import OrientacionSelector from './OrientacionSelector';
import type { CriteriosCalculados, Orientacion } from '../types';

// Componente mejorado para el botón de certificación, ahora definido localmente.
const CertificationButton: React.FC = React.memo(() => (
  <a
    href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
    target="_blank"
    rel="noopener noreferrer"
    className="group relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 active:transform active:scale-95 has-shine-effect hover:shine-effect"
    aria-label="Solicitar acreditación final - Se abrirá en nueva ventana"
  >
    <span className="material-icons !text-lg transition-transform duration-300 relative z-10 group-hover:rotate-12 group-hover:scale-110">school</span>
    <span className="relative z-10 tracking-wide">Solicitar Acreditación</span>
    <span className="material-icons !text-sm opacity-80 transition-transform duration-300 relative z-10 group-hover:translate-x-0.5">open_in_new</span>
  </a>
));
CertificationButton.displayName = 'CertificationButton';


interface CriteriosPanelProps {
  criterios: CriteriosCalculados;
  selectedOrientacion: Orientacion | "";
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
}

const CriteriosPanel: React.FC<CriteriosPanelProps> = ({ criterios, selectedOrientacion, handleOrientacionChange, showSaveConfirmation }) => {
  const todosLosCriteriosCumplidos = useMemo(() => 
    criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion,
    [criterios]
  );

  return (
    <section className="animate-fade-in-up">
      <div className={`relative bg-gradient-to-br from-white to-slate-50/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all duration-700 grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-hidden ${
        todosLosCriteriosCumplidos 
          ? 'border-emerald-300/50 animate-pulse-glow-emerald' 
          : 'border-slate-200 shadow-slate-500/10'
      }`}>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full blur-3xl -z-10" />
        
        {todosLosCriteriosCumplidos && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full animate-particle-fade"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.3}s`,
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
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                Horas Totales
              </h3>
            </div>
            
            <p className="text-slate-700 text-lg leading-relaxed mb-4">
              Has completado {todosLosCriteriosCumplidos ? 'exitosamente' : 'un total de'} <strong className="font-black text-blue-600 text-xl">{Math.round(criterios.horasTotales)}</strong> de <strong className="font-black text-slate-800 text-xl">{HORAS_OBJETIVO_TOTAL}</strong> horas requeridas.
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
          <RotationTracker
            count={criterios.orientacionesCursadasCount}
            orientacionesUnicas={criterios.orientacionesUnicas}
          />
          
          {selectedOrientacion ? (
            <ProgressBar
              label={`Horas en ${selectedOrientacion}`}
              value={criterios.horasOrientacionElegida}
              max={criterios.horasFaltantesOrientacion + criterios.horasOrientacionElegida}
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
    </section>
  );
};

export default React.memo(CriteriosPanel);