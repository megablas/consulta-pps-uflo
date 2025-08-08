import React from 'react';
import type { Convocatoria, LanzamientoPPS } from '../types';
import ConvocatoriaCard from './ConvocatoriaCard';
import { FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS } from '../constants';
import EmptyState from './EmptyState';

interface ConvocatoriasListProps {
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
  studentAirtableId: string | null;
  enrollingId: string | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
}

const ConvocatoriasList: React.FC<ConvocatoriasListProps> = ({ lanzamientos, myEnrollments, studentAirtableId, enrollingId, onInscribir }) => {

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
            
            return (
              <ConvocatoriaCard 
                  key={lanzamiento.id} 
                  lanzamiento={lanzamiento}
                  enrollmentStatus={enrollmentStatus}
                  isEnrolling={isEnrolling}
                  onInscribir={onInscribir}
              />
            );
          })}
        </div>
    );
};

export default ConvocatoriasList;