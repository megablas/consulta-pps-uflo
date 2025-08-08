import React, { useRef } from 'react';
import type { LanzamientoPPS } from '../types';
import { 
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
} from '../constants';
import { formatDate, getEspecialidadClasses } from '../utils/formatters';

interface ConvocatoriaCardProps {
  lanzamiento: LanzamientoPPS;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  isEnrolled: boolean;
  isEnrolling: boolean;
}

const InfoRow: React.FC<{ icon: string; text: string | undefined; }> = ({ icon, text }) => {
    if (!text) return null;
    return (
        <div className="flex items-center gap-2.5 text-slate-700">
            <span className="material-icons !text-xl text-slate-400">{icon}</span>
            <p className="text-sm font-medium">{text}</p>
        </div>
    );
};


const ConvocatoriaCard: React.FC<ConvocatoriaCardProps> = ({ lanzamiento, onInscribir, isEnrolled, isEnrolling }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = rect;

    const rotateX = (y / height - 0.5) * -8; // More subtle rotation
    const rotateY = (x / width - 0.5) * 8;   // More subtle rotation
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  };

  const { 
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre, 
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_DIRECCION_LANZAMIENTOS]: direccion,
    [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: horario,
    [FIELD_FECHA_INICIO_LANZAMIENTOS]: fechaInicio,
    [FIELD_FECHA_FIN_LANZAMIENTOS]: fechaFin,
    [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: horas,
  } = lanzamiento;

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-white p-5 rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200/70
                 flex flex-col lg:flex-row items-start lg:items-center gap-6 
                 transition-transform duration-300 ease-out
                 transform-style-preserve-3d"
      style={{ willChange: 'transform' }}
    >
      {/* Dynamic Glow Effect */}
      <div 
        className="absolute inset-0 rounded-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(500px circle at var(--mouse-x) var(--mouse-y), theme(colors.sky.100/0.5), transparent 80%)`,
          zIndex: 0,
        }}
      />
      
      {/* Content now sits directly inside, on top of the glow */}
      
      {/* Left Side: Info */}
      <div className="flex-grow w-full relative z-10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
            <h3 className="text-slate-900 font-bold text-lg leading-tight pr-4">
                {nombre || 'Convocatoria sin nombre'}
            </h3>
            {orientacion && <span className={`${getEspecialidadClasses(orientacion)} flex-shrink-0`}>{orientacion}</span>}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow icon="place" text={direccion} />
            <InfoRow icon="schedule" text={horario} />
            <InfoRow icon="event_repeat" text={`Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`} />
            <InfoRow icon="workspace_premium" text={horas ? `${horas} horas acreditadas` : undefined} />
        </div>
      </div>
      
      {/* Right Side: Action */}
      <div className="w-full lg:w-56 flex-shrink-0 flex flex-col items-center justify-center lg:border-l lg:pl-6 border-slate-200/60 self-stretch min-h-[80px] relative z-10">
        {isEnrolled ? (
           <div className="text-center w-full flex flex-col items-center justify-center h-full p-4 bg-blue-50 rounded-lg border border-blue-200/80">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
                <span className="material-icons">check_circle</span>
                <span>¡Inscripto!</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Tu postulación fue registrada.</p>
           </div>
        ) : (
          <button
            onClick={() => onInscribir(lanzamiento)}
            disabled={isEnrolling}
            className={`w-full font-bold text-base py-3 px-5 rounded-xl transition-all duration-200 ease-in-out shadow-lg flex items-center justify-center gap-2.5
              ${isEnrolling 
                ? 'bg-slate-400 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 active:scale-100'
              }`}
            aria-label={isEnrolled ? `Inscripto en ${nombre}` : `Postularme para ${nombre}`}
          >
            {isEnrolling ? (
              <>
                <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span className="material-icons !text-xl">rocket_launch</span>
                <span>Postularme</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConvocatoriaCard;