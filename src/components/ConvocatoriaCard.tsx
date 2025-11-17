import React, { useMemo, useCallback } from 'react';
import type { LanzamientoPPS } from '../types';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
} from '../constants';
import { getEspecialidadClasses, getStatusVisuals, normalizeStringForComparison, isValidLocation } from '../utils/formatters';
import { useModal } from '../contexts/ModalContext';

interface ConvocatoriaCardProps {
  lanzamiento: LanzamientoPPS;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  onVerSeleccionados: (lanzamiento: LanzamientoPPS) => void;
  enrollmentStatus: string | null;
  isVerSeleccionadosLoading: boolean;
  isCompleted: boolean;
  userGender?: 'Varon' | 'Mujer' | 'Otro';
  direccion?: string;
}

// Tipos para mejor tipado
type StatusInfo = {
  text: string;
  icon: string;
  style: string;
  hover: string;
};

type ConvocatoriaState = 'abierta' | 'cerrada' | 'unknown';
type EnrollmentState = 'seleccionado' | 'inscripto' | 'no_seleccionado' | 'none';

const ConvocatoriaCard: React.FC<ConvocatoriaCardProps> = ({ 
  lanzamiento, 
  onInscribir, 
  onVerSeleccionados, 
  enrollmentStatus, 
  isVerSeleccionadosLoading,
  isCompleted,
  userGender,
  direccion
}) => {
  const { isSubmittingEnrollment, selectedLanzamientoForEnrollment } = useModal();
  const isEnrolling = isSubmittingEnrollment && selectedLanzamientoForEnrollment?.id === lanzamiento.id;

  // Destructuring con nombres más claros
  const {
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre,
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: estadoConvocatoria,
  } = lanzamiento;

  // Memoización de cálculos costosos
  const convocatoriaState = useMemo((): ConvocatoriaState => {
    const normalized = normalizeStringForComparison(estadoConvocatoria);
    if (normalized === 'abierta' || normalized === 'abierto') return 'abierta';
    if (normalized === 'cerrado') return 'cerrada';
    return 'unknown';
  }, [estadoConvocatoria]);

  const enrollmentState = useMemo((): EnrollmentState => {
    if (!enrollmentStatus) return 'none';
    const normalized = normalizeStringForComparison(enrollmentStatus);
    
    // Check for the more specific "no seleccionado" first to avoid incorrect matching
    if (normalized.includes('no seleccionado')) return 'no_seleccionado';
    if (normalized.includes('seleccionado')) return 'seleccionado';
    if (normalized.includes('inscripto')) {
        // If the call is closed and the student is still 'inscripto', it means they were not selected.
        if (convocatoriaState === 'cerrada') {
            return 'no_seleccionado';
        }
        return 'inscripto';
    }
    return 'none';
  }, [enrollmentStatus, convocatoriaState]);

  const visualStyles = useMemo(() => getEspecialidadClasses(orientacion), [orientacion]);
  const convocatoriaStatusVisuals = useMemo(() => getStatusVisuals(estadoConvocatoria), [estadoConvocatoria]);

  // Función para obtener el texto con género
  const getGenderedText = useCallback((masculino: string, femenino: string): string => {
    return userGender === 'Mujer' ? femenino : masculino;
  }, [userGender]);

  // Memoización del estado de información
  const statusInfo = useMemo((): StatusInfo => {
    // Si el estudiante tiene un estado de inscripción, ese tiene prioridad
    if (enrollmentState !== 'none') {
        const statusMap: Record<Exclude<EnrollmentState, 'none'>, StatusInfo> = {
            seleccionado: {
                text: getGenderedText('Seleccionado', 'Seleccionada'),
                icon: 'verified',
                style: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700/50',
                hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
            },
            inscripto: {
                text: getGenderedText('Inscripto', 'Inscripta'),
                icon: 'how_to_reg',
                style: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:ring-sky-700/50',
                hover: 'hover:bg-sky-200 dark:hover:bg-sky-800/50'
            },
            no_seleccionado: {
                text: `No ${getGenderedText('seleccionado', 'seleccionada')}`,
                icon: 'cancel',
                style: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:ring-rose-700/50',
                hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/50'
            }
        };
        return statusMap[enrollmentState];
    }
    
    // Si no hay estado de inscripción, se muestra el estado general de la convocatoria
    return {
      text: estadoConvocatoria || 'Cerrada',
      icon: convocatoriaStatusVisuals.icon,
      style: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600',
      hover: ''
    };
  }, [enrollmentState, estadoConvocatoria, convocatoriaStatusVisuals, getGenderedText]);


  // Componentes internos para mejor organización
  const LoadingSpinner: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => (
    <div 
      className={`border-2 rounded-full w-5 h-5 animate-spin ${
        variant === 'light' 
          ? 'border-white/50 border-t-white' 
          : 'border-current/50 dark:border-current/50 border-t-current dark:border-t-current'
      }`} 
    />
  );

  const StatusBadge: React.FC = () => (
    orientacion ? (
      <span className={`${visualStyles.tag} transition-all duration-200 hover:scale-105`}>
        {orientacion}
      </span>
    ) : null
  );

  const LocationInfo: React.FC = () => {
    if (!direccion) return null;

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

    return (
      <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors duration-200 group-hover:text-slate-800 dark:group-hover:text-slate-200">
        <span className="material-icons !text-base text-slate-400 dark:text-slate-500 mt-0.5">location_on</span>
        <div>
          <span>{direccion}</span>
          {isValidLocation(direccion) && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1 ml-1"
              aria-label={`Ver ${direccion} en Google Maps`}
            >
              Ver en Google Maps
              <span className="material-icons !text-xs">open_in_new</span>
            </a>
          )}
        </div>
      </div>
    );
  };

  const InscribirButton: React.FC = () => (
    <button
      onClick={() => onInscribir(lanzamiento)}
      disabled={isEnrolling}
      className={`relative overflow-hidden w-full sm:w-72 font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center gap-2.5 group whitespace-nowrap has-shine-effect ${
        isEnrolling
          ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-wait'
          : 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/20 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:transform active:scale-95 hover:shine-effect'
      }`}
      aria-label={`Postularme para ${nombre}`}
    >
      {isEnrolling ? (
        <>
          <LoadingSpinner variant="light" />
          <span className="relative z-10">Procesando...</span>
        </>
      ) : (
        <>
          <span className="material-icons !text-lg transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 relative z-10">
            rocket_launch
          </span>
          <span className="relative z-10">Postularme</span>
        </>
      )}
    </button>
  );

  const CompletedButton: React.FC = () => (
    <div className="relative group/tooltip">
      <button
        disabled
        className="w-full sm:w-72 font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-inner flex items-center justify-center gap-2.5 whitespace-nowrap bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
        aria-label="Ya has completado esta práctica anteriormente."
      >
        <span className="material-icons !text-lg">history</span>
        <span>Ya Cursada</span>
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 dark:bg-slate-900 text-white dark:text-slate-200 text-xs rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none" role="tooltip">
        Ya has completado esta práctica anteriormente.
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-slate-900"></div>
      </div>
    </div>
  );

  const VerSeleccionadosButton: React.FC = () => (
    <button
      onClick={() => onVerSeleccionados(lanzamiento)}
      disabled={isVerSeleccionadosLoading}
      className={`w-full sm:w-72 font-semibold text-sm py-2.5 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm flex items-center justify-center gap-2.5 group whitespace-nowrap ${statusInfo.style} ${statusInfo.hover} hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:transform active:scale-95`}
      aria-label={`Ver seleccionados para ${nombre}`}
    >
      {isVerSeleccionadosLoading ? (
        <>
          <LoadingSpinner variant="dark" />
          <span>Cargando...</span>
        </>
      ) : (
        <>
          <span className="material-icons !text-lg transition-transform duration-200 group-hover:scale-110">
            {statusInfo.icon}
          </span>
          <span>{statusInfo.text}</span>
          <span className="mx-1 h-4 w-px bg-current opacity-20" aria-hidden="true" />
          <span className="font-normal text-sm opacity-80">Ver Lista</span>
          <span className="material-icons !text-lg opacity-80 transition-transform duration-300 group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </>
      )}
    </button>
  );

  const StatusDisplay: React.FC = () => (
    <div className={`w-full sm:w-72 text-sm py-2.5 px-5 rounded-lg shadow-sm flex items-center justify-center gap-2.5 ${statusInfo.style} cursor-default transition-all duration-200 hover:shadow-md`}>
      <span className="material-icons !text-lg">{statusInfo.icon}</span>
      <span className="font-semibold">{statusInfo.text}</span>
    </div>
  );

  const ActionButton: React.FC = () => {
      // 1. Practice already completed by student. Highest priority.
      if (isCompleted) {
          return <CompletedButton />;
      }
  
      // 2. Student has a definitive selection status. This is also high priority.
      if (enrollmentState === 'seleccionado' || enrollmentState === 'no_seleccionado') {
          return <VerSeleccionadosButton />;
      }

      // 3. The call is closed. Anyone can see the results, regardless of their enrollment status.
      if (convocatoriaState === 'cerrada') {
          return <VerSeleccionadosButton />;
      }
  
      // 4. The call is open and the student has not enrolled yet. They can enroll.
      if (convocatoriaState === 'abierta' && enrollmentState === 'none') {
          return <InscribirButton />;
      }
  
      // 5. The student is enrolled ('inscripto'), and the call is still open. Show their pending status.
      if (enrollmentState === 'inscripto') {
          return <StatusDisplay />;
      }
  
      // 6. Fallback for any other state (like 'Oculto' or other unexpected states).
      return <StatusDisplay />;
  };

  return (
    <article
      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/40 dark:shadow-black/20 border border-slate-200/60 dark:border-slate-700/80
                 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 hover:-translate-y-1 p-6
                 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800"
      style={{ willChange: 'transform, box-shadow' }}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        {/* Información Principal */}
        <div className="flex-grow min-w-0">
          <div className="flex self-start items-center gap-2 mb-3">
            <StatusBadge />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-200">
            {nombre || 'Convocatoria sin nombre'}
          </h3>
          
          <LocationInfo />
        </div>

        {/* Acciones */}
        <div className="flex-shrink-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60 flex flex-col items-stretch sm:items-end">
          <ActionButton />
        </div>
      </div>
    </article>
  );
};

export default ConvocatoriaCard;