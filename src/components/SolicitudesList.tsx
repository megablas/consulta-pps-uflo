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
    <div className="space-y-3">
      {solicitudes.map((solicitud) => (
        <SolicitudCard key={solicitud.id} solicitud={solicitud} />
      ))}
    </div>
  );
};

export default React.memo(SolicitudesList);