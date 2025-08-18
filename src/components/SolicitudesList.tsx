import React from 'react';
import SolicitudCard from './SolicitudCard';
import EmptyState from './EmptyState';
import { useData } from '../contexts/DataContext';

const SolicitudesList: React.FC = () => {
  const { solicitudes } = useData();

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

export default SolicitudesList;
