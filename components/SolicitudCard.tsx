import React from 'react';
import type { SolicitudPPS } from '../types';
import { FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, FIELD_NOTAS_PPS } from '../constants';
import { formatDate, getStatusVisuals } from '../utils/formatters';

interface SolicitudCardProps {
  solicitud: SolicitudPPS;
}

const SolicitudCard: React.FC<SolicitudCardProps> = ({ solicitud }) => {
  const institucionRaw = solicitud[FIELD_EMPRESA_PPS_SOLICITUD];
  const institucion = Array.isArray(institucionRaw) ? institucionRaw?.[0] : institucionRaw;

  const statusRaw = solicitud[FIELD_ESTADO_PPS];
  const status = Array.isArray(statusRaw) ? statusRaw?.[0] : statusRaw;
  
  const notas = solicitud[FIELD_NOTAS_PPS];
  const actualizacion = solicitud[FIELD_ULTIMA_ACTUALIZACION_PPS];
  
  const visuals = getStatusVisuals(status);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200/60 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-1">
      <div className={visuals.iconContainerClass}>
        <span className="material-icons !text-3xl">{visuals.icon}</span>
      </div>
      
      <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 gap-4">

        <div className="flex-grow min-w-0">
          <p className="text-slate-800 font-semibold leading-normal break-words text-base">
            {institucion || 'Institución no especificada'}
          </p>

          {notas && (
            <p className="text-slate-600 text-sm leading-snug whitespace-normal mt-1 max-w-prose">
              {notas}
            </p>
          )}
          
          <p className="text-slate-500 text-xs font-medium mt-2">
            Actualizado: {formatDate(actualizacion)}
          </p>
        </div>

        <div className="flex-shrink-0 self-start sm:self-center">
          <span className={visuals.labelClass}>
            {status || 'N/A'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default SolicitudCard;