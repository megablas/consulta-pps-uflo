import React, { useMemo } from 'react';
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
  isEnrolling, 
  isVerSeleccionadosLoading 
}) => {
  const { userGender } = useData();

  // Destructuring con nombres más claros
  const {
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: nombre,
    [FIELD_ORIENTACION_LANZAMIENTOS]: orientacion,
    [FIELD_DIRECCION_LANZAMIENTOS]: direccion,
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
    
    if (normalized.includes('seleccionado')) return 'seleccionado';
    if (normalized.includes('inscripto')) return 'inscripto';
    if (normalized.includes('no seleccionado')) return 'no_seleccionado';
    return 'none';
  }, [enrollmentStatus]);

  const visualStyles = useMemo(() => getEspecialidadClasses(orientacion), [orientacion]);
  const convocatoriaStatusVisuals = useMemo(() => getStatusVisuals(estadoConvocatoria), [estadoConvocatoria]);

  // Función para obtener el texto con género
  const getGenderedText = (masculino: string, femenino: string): string => {
    return userGender === 'femenino' ? femenino : masculino;
  };

  // Memoización del estado de información
  const statusInfo = useMemo((): StatusInfo => {
    const baseStatus: StatusInfo = {
      text: estadoConvocatoria || 'Cerrada',
      icon: convocatoriaStatusVisuals.icon,
      style: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300',
      hover: ''
    };

    if (enrollmentState === 'none') return baseStatus;

    const statusMap: Record<Exclude<EnrollmentState, 'none'>, StatusInfo> = {
      seleccionado: {
        text: getGenderedText('Seleccionado', 'Seleccionada'),
        icon: 'verified',
        style: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
        hover: 'hover:bg-emerald-200'
      },
      inscripto: {
        text: getGenderedText('Inscripto', 'Inscripta'),
        icon: 'how_to_reg',
        style: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300',
        hover: 'hover:bg-sky-200'
      },
      no_seleccionado: {
        text: `No ${getGenderedText('seleccionado', 'seleccionada')}`,
        icon: 'cancel',
        style: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300',
        hover: 'hover:bg-rose-200'
      }
    };

    return statusMap[enrollmentState];
  }, [enrollmentState, estadoConvocatoria, convocatoriaStatusVisuals, userGender]);

  // Componentes internos para mejor organización
  const LoadingSpinner: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => (
    <div 
      className={`border-2 rounded-full w-5 h-5 animate-spin ${
        variant === 'light' 
          ? 'border-white/50 border-t-white' 
          : 'border-current/50 border-t-current'
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

  const LocationInfo: React.FC = () => (
    direccion ? (
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 transition-colors duration-200 group-hover:text-slate-800">
        <span className="material-icons !text-base text-slate-400">location_on</span>
        <span>{direccion}</span>
      </p>
    ) : null
  );

  const InscribirButton: React.FC = () => (
    <button
      onClick={() => onInscribir(lanzamiento)}
      disabled={isEnrolling}
      className={`w-full sm:w-72 font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center gap-2.5 group whitespace-nowrap ${
        isEnrolling
          ? 'bg-slate-400 text-white cursor-wait'
          : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 active:transform active:scale-95'
      }`}
      aria-label={`Postularme para ${nombre}`}
    >
      {isEnrolling ? (
        <>
          <LoadingSpinner variant="light" />
          <span>Procesando...</span>
        </>
      ) : (
        <>
          <span className="material-icons !text-lg transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
            rocket_launch
          </span>
          <span>Postularme</span>
        </>
      )}
    </button>
  );

  const VerSeleccionadosButton: React.FC = () => (
    <button
      onClick={() => onVerSeleccionados(lanzamiento)}
      disabled={isVerSeleccionadosLoading}
      className={`w-full sm:w-72 font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center gap-2.5 group whitespace-nowrap ${statusInfo.style} ${statusInfo.hover} hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-offset-2 active:transform active:scale-95`}
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
          <span className="font-semibold">{statusInfo.text}</span>
          <span className="mx-1.5 h-4 w-px bg-current opacity-30" aria-hidden="true" />
          <span className="font-normal text-sm opacity-90">Ver Lista</span>
          <span className="material-icons !text-lg opacity-90 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110">
            arrow_forward
          </span>
        </>
      )}
    </button>
  );

  const StatusDisplay: React.FC = () => (
    <div className={`w-full sm:w-72 font-bold text-sm py-2.5 px-5 rounded-lg shadow-md flex items-center justify-center gap-2.5 ${statusInfo.style} cursor-default transition-all duration-200 hover:shadow-lg`}>
      <span className="material-icons !text-lg">{statusInfo.icon}</span>
      <span className="font-semibold">{statusInfo.text}</span>
    </div>
  );

  const ActionButton: React.FC = () => {
    if (convocatoriaState === 'abierta' && enrollmentState === 'none') {
      return <InscribirButton />;
    }
    
    if (convocatoriaState === 'cerrada') {
      return <VerSeleccionadosButton />;
    }
    
    return <StatusDisplay />;
  };

  return (
    <article
      className="group bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60
                 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-slate-300/50 hover:-translate-y-1 p-6
                 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
      style={{ willChange: 'transform, box-shadow' }}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        {/* Información Principal */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-3">
            <StatusBadge />
            {estadoConvocatoria && (
              <span className={`${convocatoriaStatusVisuals.labelClass} gap-1.5 sm:hidden transition-all duration-200 hover:scale-105`}>
                <span className="material-icons !text-sm">{convocatoriaStatusVisuals.icon}</span>
                <span>{estadoConvocatoria}</span>
              </span>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1 group-hover:text-blue-700 transition-colors duration-200">
            {nombre || 'Convocatoria sin nombre'}
          </h3>
          
          <LocationInfo />
        </div>

        {/* Acciones */}
        <div className="flex-shrink-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 flex flex-col items-stretch sm:items-end">
          <ActionButton />
        </div>
      </div>
    </article>
  );
};

export default ConvocatoriaCard;