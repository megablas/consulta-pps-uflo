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
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
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
            // FIX: Refactored the enrollment association logic to be even stricter. In addition to a date check,
            // it now also verifies that the names match exactly, preventing incorrect associations due to faulty data links.
            let enrollment = myEnrollments.find(e => {
                const linkedIds = e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [];
                if (!linkedIds.includes(lanzamiento.id)) {
                    return false;
                }
                
                // --- ENHANCED SANITY CHECK ---
                // 1. NAME CHECK: If linked, the names must also match. This prevents associating "Hospital X" with "Hospital X - Pediatría".
                const enrollmentPpsNameRaw = e[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                const enrollmentPpsName = Array.isArray(enrollmentPpsNameRaw) ? enrollmentPpsNameRaw[0] : enrollmentPpsNameRaw;
                const lanzamientoPpsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];

                const namesMatch = normalizeStringForComparison(enrollmentPpsName as string) === normalizeStringForComparison(lanzamientoPpsName);
                if (!namesMatch) {
                    return false; // Names don't match, this is an incorrect link.
                }

                // 2. DATE CHECK: If linked and names match, the start dates should also be close.
                const enrollmentStartDate = parseToUTCDate(e[FIELD_FECHA_INICIO_CONVOCATORIAS]);
                const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);

                if (enrollmentStartDate && lanzamientoStartDate) {
                    const timeDiff = Math.abs(enrollmentStartDate.getTime() - lanzamientoStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
                    // Allow a 7-day tolerance for minor discrepancies.
                    return daysDiff <= 7;
                }
                
                // If dates are missing but link and names match, trust it.
                return true;
            });

            // Fallback for older enrollment data that might not have a direct link.
            if (!enrollment) {
                enrollment = myEnrollments.find(e => {
                    // Only attempt fallback if the enrollment record itself is unlinked.
                    const isUnlinked = (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).length === 0;
                    if (!isUnlinked) {
                        return false;
                    }
                    
                    const enrollmentPpsNameRaw = e[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                    const enrollmentPpsName = Array.isArray(enrollmentPpsNameRaw) ? enrollmentPpsNameRaw[0] : enrollmentPpsNameRaw;
                    
                    const enrollmentStartDate = parseToUTCDate(e[FIELD_FECHA_INICIO_CONVOCATORIAS]);

                    const lanzamientoPpsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                    const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    
                    if (!enrollmentPpsName || !lanzamientoPpsName || !enrollmentStartDate || !lanzamientoStartDate) {
                        return false;
                    }
                    
                    // Names must match exactly to prevent partial matches like "Hospital X" matching "Hospital X - Pediatría".
                    const namesMatch = normalizeStringForComparison(enrollmentPpsName as string) === normalizeStringForComparison(lanzamientoPpsName);
                    
                    const timeDiff = Math.abs(enrollmentStartDate.getTime() - lanzamientoStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    return namesMatch && daysDiff <= 31;
                });
            }
        
            const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS] : null;
            
            const isCompleted = practicas.some(practica => {
                // New, preferred method: check for a direct link.
                const linkedLanzamientoId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
                if (linkedLanzamientoId) {
                    return linkedLanzamientoId === lanzamiento.id;
                }

                // Fallback for older data: requires exact name, orientation, and close start date match.
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
                
                // Stricter name comparison. A match only occurs if the names are identical after normalization.
                const namesMatch = normalizeStringForComparison(practicaInstitucion as string) === normalizeStringForComparison(lanzamientoInstitucion);

                if (!namesMatch) {
                    return false; // If names are different in any way, it's not the same practice.
                }

                // If names match, we also check orientation and date proximity.
                const orientationsMatch = normalizeStringForComparison(practicaOrientacion) === normalizeStringForComparison(lanzamientoOrientacion);
                
                const timeDiff = Math.abs(practicaFechaInicio.getTime() - lanzamientoFechaInicio.getTime());
                const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                return orientationsMatch && daysDiff <= 31;
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