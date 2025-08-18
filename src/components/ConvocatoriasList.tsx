import React from 'react';
import type { Convocatoria, LanzamientoPPS } from '../types';
import ConvocatoriaCard from './ConvocatoriaCard';
import { FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS } from '../constants';
import EmptyState from './EmptyState';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

interface ConvocatoriasListProps {
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
}

const ConvocatoriasList: React.FC<ConvocatoriasListProps> = ({ lanzamientos, myEnrollments }) => {
    const { studentAirtableId } = useData();
    const { 
      enrollingId,
      loadingSeleccionadosId,
      handleInscribir,
      handleVerSeleccionados,
    } = useModal();

    if (lanzamientos.length === 0) {
        return (
            <EmptyState
                icon="upcoming"
                title="No hay convocatorias abiertas"
                message="Por el momento, no hay procesos de inscripción disponibles. ¡Vuelve a consultar pronto!"
            />
        );
    }
    
    return (
        <div className="space-y-5">
          {lanzamientos.map((lanzamiento) => {
            const enrollment = studentAirtableId
                ? myEnrollments.find(e => (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamiento.id))
                : undefined;
        
            const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] : null;
            const isEnrolling = enrollingId === lanzamiento.id;
            const isVerSeleccionadosLoading = loadingSeleccionadosId === lanzamiento.id;
            
            return (
              <ConvocatoriaCard 
                  key={lanzamiento.id} 
                  lanzamiento={lanzamiento}
                  enrollmentStatus={enrollmentStatus}
                  isEnrolling={isEnrolling}
                  isVerSeleccionadosLoading={isVerSeleccionadosLoading}
                  onInscribir={handleInscribir}
                  onVerSeleccionados={handleVerSeleccionados}
              />
            );
          })}
        </div>
    );
};

export default ConvocatoriasList;
