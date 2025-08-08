import React from 'react';
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
import { formatDate, getEspecialidadClasses, normalizeStringForComparison } from '../utils/formatters';

interface ConvocatoriaCardProps {
  lanzamiento: LanzamientoPPS;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  enrollmentStatus: string | null;
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


const ConvocatoriaCard: React.FC<ConvocatoriaCardProps> = ({ lanzamiento, onInscribir, enrollmentStatus, isEnrolling }) => {
  const { 
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre, 
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_DIRECCION_LANZAMIENTOS]: direccion,
    [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: horario,
    [FIELD_FECHA_INICIO_LANZAMIENTOS]: fechaInicio,
    [FIELD_FECHA_FIN_LANZAMIENTOS]: fechaFin,
    [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: horas,
  } = lanzamiento;
  
  const hasEnrollment = !!enrollmentStatus;
  const normalizedStatus = normalizeStringForComparison(enrollmentStatus);

  const renderStatusBlock = () => {
    if (!hasEnrollment) {
      return (
        <button
            onClick={() => onInscribir(lanzamiento)}
            disabled={isEnrolling}
            className={`w-full font-bold text-base py-3 px-5 rounded-xl transition-all duration-200 ease-in-out shadow-lg flex items-center justify-center gap-2.5
              ${isEnrolling 
                ? 'bg-slate-400 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            aria-label={`Postularme para ${nombre}`}
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
      );
    }

    let statusStyles = 'bg-slate-100 border-slate-200/80';
    let textStyles = 'text-slate-700';
    let icon = 'info';
    let title = enrollmentStatus;
    let subtitle = 'Estado de tu postulación.';

    if (normalizedStatus === 'seleccionado') {
        statusStyles = 'bg-indigo-50 border-indigo-200/80';
        textStyles = 'text-indigo-700';
        icon = 'verified';
        title = '¡Seleccionado!';
        subtitle = 'Has sido seleccionado/a.';
    } else if (normalizedStatus === 'inscripto') {
        statusStyles = 'bg-blue-50 border-blue-200/80';
        textStyles = 'text-blue-700';
        icon = 'check_circle';
        title = '¡Inscripto!';
        subtitle = 'Tu postulación fue registrada.';
    } else if (normalizedStatus.includes('no seleccionado')) {
        statusStyles = 'bg-rose-50 border-rose-200/80';
        textStyles = 'text-rose-700';
        icon = 'cancel';
        subtitle = 'No fuiste seleccionado/a esta vez.';
    }

    return (
        <div className={`text-center w-full flex flex-col items-center justify-center h-full p-4 rounded-lg border ${statusStyles}`}>
          <div className={`flex items-center gap-2 text-base font-bold ${textStyles}`}>
            <span className="material-icons">{icon}</span>
            <span>{title}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
        </div>
    );
  };

  return (
    <div 
      className="bg-white p-5 rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200/70
                 flex flex-col lg:flex-row items-start lg:items-center gap-6 
                 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1"
      style={{ willChange: 'transform, box-shadow' }}
    >
      {/* Left Side: Info */}
      <div className="flex-grow w-full">
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
      <div className="w-full lg:w-56 flex-shrink-0 flex flex-col items-center justify-center lg:border-l lg:pl-6 border-slate-200/60 self-stretch min-h-[80px]">
        {renderStatusBlock()}
      </div>
    </div>
  );
};

export default ConvocatoriaCard;