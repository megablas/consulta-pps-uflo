import React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Convocatoria, LanzamientoPPS, EstudianteFields, GroupedSeleccionados } from '../types';
import ConvocatoriaCard from './ConvocatoriaCard';
import { 
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
} from '../constants';
import EmptyState from './EmptyState';
import { useModal } from '../contexts/ModalContext';
import { normalizeStringForComparison } from '../utils/formatters';
import { fetchSeleccionados } from '../services/dataService';


interface ConvocatoriasListProps {
  lanzamientos: LanzamientoPPS[];
  student: EstudianteFields | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  institutionAddressMap: Map<string, string>;
  enrollmentMap: Map<string, Convocatoria>;
  completedLanzamientoIds: Set<string>;
}

const ConvocatoriasList: React.FC<ConvocatoriasListProps> = ({ 
    lanzamientos, 
    student, 
    onInscribir, 
    institutionAddressMap, 
    enrollmentMap, 
    completedLanzamientoIds 
}) => {
    const { openSeleccionadosModal, showModal } = useModal();
    
    const seleccionadosMutation = useMutation({
        mutationFn: (lanzamiento: LanzamientoPPS) => fetchSeleccionados(lanzamiento),
        onSuccess: (data, lanzamiento) => {
            const title = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Convocatoria';
            const isDataEmpty = !data || Object.keys(data).length === 0;

            if (isDataEmpty) {
                // Si no hay datos, siempre mostrar el mensaje estándar.
                showModal(
                    'Lista de Seleccionados', 
                    'La lista de seleccionados para esta convocatoria aún no ha sido publicada o no hubo seleccionados. Por favor, vuelve a consultar más tarde.'
                );
            } else {
                // Si se encontraron datos, mostrarlos.
                openSeleccionadosModal(data, title);
            }
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
            const enrollment = enrollmentMap.get(lanzamiento.id);
            const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] : null;

            const isCompleted = completedLanzamientoIds.has(lanzamiento.id);
            
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