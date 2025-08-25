import React from 'react';
import type { Convocatoria, LanzamientoPPS } from '../types';
import ConvocatoriaCard from './ConvocatoriaCard';
import { FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS } from '../constants';
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
        <div>
            <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                    <span className="material-icons !text-3xl">campaign</span>
                </div>
                <div>
                    <h2 className="text-slate-900 text-2xl font-bold tracking-tight">Convocatorias Abiertas</h2>
                    <p className="text-slate-600 mt-1 max-w-2xl">Aquí encontrarás las oportunidades de Prácticas Profesionales Supervisadas (PPS) disponibles para postularte.</p>
                </div>
            </div>
            <div className="space-y-5">
              {lanzamientos.map((lanzamiento) => {
                const enrollment = studentAirtableId
                    ? myEnrollments.find(e => (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamiento.id))
                    : undefined;
            
                const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS] : null;
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
        </div>
    );
};

export default ConvocatoriasList;