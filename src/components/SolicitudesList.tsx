import React from 'react';
import SolicitudCard from './SolicitudCard';
import EmptyState from './EmptyState';
import type { SolicitudPPS } from '../types';

interface SolicitudesListProps {
  solicitudes: SolicitudPPS[];
}

const SolicitudesList: React.FC<SolicitudesListProps> = ({ solicitudes }) => {
  if (solicitudes.length === 0) {
    return (
       <EmptyState 
          icon="list_alt"
          title="No Hay Solicitudes"
          message="Cuando realices una solicitud de PPS, su estado aparecerá aquí."
        />
    );
  }

  return (
    <div>
        <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                <span className="material-icons !text-3xl">list_alt</span>
            </div>
            <div>
                <h2 className="text-slate-900 dark:text-slate-50 text-2xl font-bold tracking-tight">Seguimiento de Solicitudes</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">Revisa el estado de las solicitudes de PPS que has autogestionado. Te notificaremos por correo ante cualquier novedad.</p>
            </div>
        </div>
        <div className="space-y-3">
          {solicitudes.map((solicitud) => (
            <SolicitudCard key={solicitud.id} solicitud={solicitud} />
          ))}
        </div>
    </div>
  );
};

export default React.memo(SolicitudesList);