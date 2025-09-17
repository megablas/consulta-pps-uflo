import React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Convocatoria, LanzamientoPPS, Practica, EstudianteFields } from '../types';
import ConvocatoriaCard from './ConvocatoriaCard';
import { 
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, 
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
} from '../constants';
import EmptyState from './EmptyState';
import { useModal } from '../contexts/ModalContext';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { fetchSeleccionados } from '../services/dataService';

interface ConvocatoriasListProps {
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
  practicas: Practica[];
  student: EstudianteFields | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  institutionAddressMap: Map<string, string>;
}

const ConvocatoriasList: React.FC<ConvocatoriasListProps> = ({ lanzamientos, myEnrollments, practicas, student, onInscribir, institutionAddressMap }) => {
    const { openSeleccionadosModal, showModal } = useModal();
    
    const seleccionadosMutation = useMutation({
        mutationFn: (lanzamiento: LanzamientoPPS) => fetchSeleccionados(lanzamiento.id),
        onSuccess: (data, variables) => {
            const title = variables[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Convocatoria';
            openSeleccionadosModal(data, title);
        },
        onError: (error) => {
            showModal('Error', error.message);
        },
    });

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
            const enrollment = myEnrollments.find(e => (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamiento.id));
        
            const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS] : null;
            
            const isCompleted = practicas.some(practica => {
                // New, preferred method: check for a direct link
                const linkedLanzamientoId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
                if (linkedLanzamientoId) {
                    return linkedLanzamientoId === lanzamiento.id;
                }

                // Fallback to old method for existing data, now with date matching for more precision
                const practicaInstitucionRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                const practicaInstitucion = Array.isArray(practicaInstitucionRaw) ? practicaInstitucionRaw[0] : practicaInstitucionRaw;
                const practicaOrientacion = practica[FIELD_ESPECIALIDAD_PRACTICAS];
                const practicaFechaInicio = parseToUTCDate(practica[FIELD_FECHA_INICIO_PRACTICAS]);

                const lanzamientoInstitucion = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                const lanzamientoOrientacion = lanzamiento[FIELD_ORIENTACION_LANZAMIENTOS];
                const lanzamientoFechaInicio = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);

                if (!practicaInstitucion || !practicaOrientacion || !lanzamientoInstitucion || !lanzamientoOrientacion || !practicaFechaInicio || !lanzamientoFechaInicio) {
                    return false;
                }
                
                const namesMatch = normalizeStringForComparison(practicaInstitucion as string) === normalizeStringForComparison(lanzamientoInstitucion);
                const orientationsMatch = normalizeStringForComparison(practicaOrientacion) === normalizeStringForComparison(lanzamientoOrientacion);
                
                // Calculate the difference in days
                const timeDiff = Math.abs(practicaFechaInicio.getTime() - lanzamientoFechaInicio.getTime());
                const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                // A match requires name, orientation, and a start date within a 31-day tolerance window.
                return namesMatch && orientationsMatch && daysDiff <= 31;
            });

            const lanzamientoDireccion = lanzamiento[FIELD_DIRECCION_LANZAMIENTOS];
            const institutionName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            const fallbackDireccion = institutionName ? institutionAddressMap.get(normalizeStringForComparison(institutionName)) : undefined;
            const finalDireccion = lanzamientoDireccion || fallbackDireccion;
            
            return (
              <ConvocatoriaCard 
                  key={lanzamiento.id} 
                  lanzamiento={lanzamiento}
                  enrollmentStatus={enrollmentStatus}
                  onInscribir={onInscribir}
                  onVerSeleccionados={(l) => seleccionadosMutation.mutate(l)}
                  isVerSeleccionadosLoading={seleccionadosMutation.isPending && seleccionadosMutation.variables?.id === lanzamiento.id}
                  isCompleted={isCompleted}
                  userGender={student?.['Género']}
                  direccion={finalDireccion}
              />
            );
          })}
        </div>
    );
};

export default React.memo(ConvocatoriasList);