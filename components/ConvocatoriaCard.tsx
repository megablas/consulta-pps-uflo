import React from 'react';
import type { LanzamientoPPS } from '../types';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
} from '../constants';
import { getEspecialidadClasses, getStatusVisuals, normalizeStringForComparison } from '../utils/formatters';
import { useData } from '../contexts/DataContext';

interface ConvocatoriaCardProps {
  lanzamiento: LanzamientoPPS;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  onVerSeleccionados: (lanzamiento: LanzamientoPPS) => void;
  enrollmentStatus: string | null;
  isEnrolling: boolean;
  isVerSeleccionadosLoading: boolean;
}

const ConvocatoriaCard: React.FC<ConvocatoriaCardProps> = ({ lanzamiento, onInscribir, onVerSeleccionados, enrollmentStatus, isEnrolling, isVerSeleccionadosLoading }) => {
  const { userGender } = useData();

  const {
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre,
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_DIRECCION_LANZAMIENTOS]: direccion,
    [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: estadoConvocatoria,
  } = lanzamiento;

  const visualStyles = getEspecialidadClasses(orientacion);
  const convocatoriaStatusVisuals = getStatusVisuals(estadoConvocatoria);

  const hasEnrollment = !!enrollmentStatus;
  const normalizedStatus = normalizeStringForComparison(enrollmentStatus);
  
  const normalizedEstadoConvocatoria = normalizeStringForComparison(estadoConvocatoria);
  const isConvocatoriaAbierta = normalizedEstadoConvocatoria === 'abierta' || normalizedEstadoConvocatoria === 'abierto';
  const isConvocatoriaCerrada = normalizedEstadoConvocatoria === 'cerrado';

  // --- Style & Content Definitions ---
  const primaryButtonBaseClasses = "w-full sm:w-auto font-bold text-base py-3 px-5 rounded-xl transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center gap-2.5 group";

  let statusInfo = {
    text: estadoConvocatoria || 'Cerrada',
    icon: convocatoriaStatusVisuals.icon,
    style: 'bg-slate-200 text-slate-800',
    ring: 'focus:ring-slate-300'
  };

  if (hasEnrollment) {
    if (normalizedStatus.includes('seleccionado')) {
      statusInfo = {
        text: userGender === 'femenino' ? 'Seleccionada' : 'Seleccionado',
        icon: 'verified',
        style: 'bg-indigo-200 text-indigo-800',
        ring: 'focus:ring-indigo-300'
      };
    } else if (normalizedStatus.includes('inscripto')) {
      statusInfo = {
        text: userGender === 'femenino' ? 'Inscripta' : 'Inscripto',
        icon: 'how_to_reg',
        style: 'bg-sky-200 text-sky-800',
        ring: 'focus:ring-sky-300'
      };
    } else if (normalizedStatus.includes('no seleccionado')) {
      statusInfo = {
        text: `No ${userGender === 'femenino' ? 'seleccionada' : 'seleccionado'}`,
        icon: 'cancel',
        style: 'bg-rose-200 text-rose-800',
        ring: 'focus:ring-rose-300'
      };
    }
  }
  
  return (
    <div
      className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60
                 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 p-5 sm:p-6"
      style={{ willChange: 'transform, box-shadow' }}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        {/* Left Side: Info */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-3">
            {orientacion && (
              <span className={visualStyles.tag}>
                {orientacion}
              </span>
            )}
            {/* Show status tag on mobile, it's implicit on desktop */}
            {estadoConvocatoria && (
              <span className={`${convocatoriaStatusVisuals.labelClass} gap-1.5 sm:hidden`}>
                  <span className="material-icons !text-sm">{convocatoriaStatusVisuals.icon}</span>
                  <span>{estadoConvocatoria}</span>
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            {nombre || 'Convocatoria sin nombre'}
          </h3>
          {direccion && (
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-icons !text-base">location_on</span>
                  <span>{direccion}</span>
              </p>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex-shrink-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 flex flex-col items-stretch sm:items-end">
            {isConvocatoriaAbierta && !hasEnrollment ? (
              <button
                onClick={() => onInscribir(lanzamiento)}
                disabled={isEnrolling}
                className={`${primaryButtonBaseClasses} ${isEnrolling
                    ? 'bg-slate-400 text-white cursor-wait'
                    : 'text-white bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300'
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
                    <span className="material-icons !text-xl transition-transform duration-300 group-hover:rotate-12">rocket_launch</span>
                    <span>Postularme</span>
                  </>
                )}
              </button>
            ) : (
              <>
                {isConvocatoriaCerrada ? (
                  <button
                    onClick={() => onVerSeleccionados(lanzamiento)}
                    disabled={isVerSeleccionadosLoading}
                    className={`${primaryButtonBaseClasses} ${statusInfo.style} hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 ${statusInfo.ring}`}
                    aria-label={`Ver seleccionados para ${nombre}`}
                  >
                    {isVerSeleccionadosLoading ? (
                      <>
                        <div className="border-2 border-current/50 border-t-current rounded-full w-5 h-5 animate-spin"></div>
                        <span>Cargando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-icons !text-xl">{statusInfo.icon}</span>
                        <span className="font-semibold">{statusInfo.text}</span>
                        <span className="mx-1.5 h-4 w-px bg-current opacity-30" aria-hidden="true"></span>
                        <span className="font-normal text-sm opacity-90">Ver Seleccionados</span>
                        <span className="material-icons !text-lg opacity-90 transition-transform duration-300 group-hover:translate-x-0.5">arrow_forward</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className={`${primaryButtonBaseClasses} ${statusInfo.style} cursor-default`}>
                    <span className="material-icons !text-xl">{statusInfo.icon}</span>
                    <span className="font-semibold">{statusInfo.text}</span>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default ConvocatoriaCard;