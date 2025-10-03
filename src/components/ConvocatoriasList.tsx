import React, { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Convocatoria, LanzamientoPPS, Practica, EstudianteFields, AsistenciaJornada } from '../types';
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
    CONFERENCE_PPS_NAME,
    CONFERENCE_ACTIVITIES,
    FIELD_ASISTENCIA_MODULO_ID,
} from '../constants';
import EmptyState from './EmptyState';
import { useModal, type JornadaBlockCounts } from '../contexts/ModalContext';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { fetchSeleccionados } from '../services/dataService';
import JornadaCard from './JornadaCard';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { useAuth } from '../contexts/AuthContext';


interface ConvocatoriasListProps {
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
  practicas: Practica[];
  student: EstudianteFields | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  onInscribirJornada: (lanzamiento: LanzamientoPPS) => void;
  institutionAddressMap: Map<string, string>;
  asistencias: (AsistenciaJornada & { id: string })[];
  jornadaBlockCounts: JornadaBlockCounts;
}

const ConvocatoriasList: React.FC<ConvocatoriasListProps> = ({ lanzamientos, myEnrollments, practicas, student, onInscribir, onInscribirJornada, institutionAddressMap, asistencias, jornadaBlockCounts }) => {
    const { openSeleccionadosModal, showModal } = useModal();
    const { isSubmittingJornada, lanzamientoForJornada } = useModal();
    
    const seleccionadosMutation = useMutation({
        mutationFn: (lanzamiento: LanzamientoPPS) => fetchSeleccionados(lanzamiento),
        onSuccess: (data, lanzamiento) => {
            const title = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Convocatoria';
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
            
            // --- Special Card for the Conference ---
            if (lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] === CONFERENCE_PPS_NAME) {
                const isEnrolledTheOldWay = myEnrollments.some(e => {
                    const linkedIds = e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [];
                    return linkedIds.includes(lanzamiento.id);
                });

                const conferenceActivityIds = useMemo(() => new Set(CONFERENCE_ACTIVITIES.map(act => act.id)), []);
                const isEnrolledTheNewWay = asistencias.some(a => conferenceActivityIds.has(a[FIELD_ASISTENCIA_MODULO_ID] as string));

                const isEnrolledInJornada = isEnrolledTheOldWay || isEnrolledTheNewWay;

                return (
                    <JornadaCard 
                        key={lanzamiento.id}
                        lanzamiento={lanzamiento}
                        onInscribir={onInscribirJornada}
                        isEnrolled={isEnrolledInJornada}
                        isEnrolling={isSubmittingJornada && lanzamientoForJornada?.id === lanzamiento.id}
                        blockCounts={jornadaBlockCounts}
                    />
                );
            }

            // --- Regular Convocatoria Cards ---
            let enrollment = myEnrollments.find(e => {
                const linkedIds = e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [];
                if (!linkedIds.includes(lanzamiento.id)) {
                    return false;
                }
                
                const enrollmentPpsNameRaw = e[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                const enrollmentPpsName = Array.isArray(enrollmentPpsNameRaw) ? enrollmentPpsNameRaw[0] : enrollmentPpsNameRaw;
                const lanzamientoPpsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];

                const namesMatch = normalizeStringForComparison(enrollmentPpsName as string) === normalizeStringForComparison(lanzamientoPpsName);
                if (!namesMatch) {
                    return false;
                }

                const enrollmentStartDate = parseToUTCDate(e[FIELD_FECHA_INICIO_CONVOCATORIAS]);
                const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);

                if (enrollmentStartDate && lanzamientoStartDate) {
                    const timeDiff = Math.abs(enrollmentStartDate.getTime() - lanzamientoStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
                    return daysDiff <= 7;
                }
                
                return true;
            });

            if (!enrollment) {
                enrollment = myEnrollments.find(e => {
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
                    
                    const namesMatch = normalizeStringForComparison(enrollmentPpsName as string) === normalizeStringForComparison(lanzamientoPpsName);
                    
                    const timeDiff = Math.abs(enrollmentStartDate.getTime() - lanzamientoStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    return namesMatch && daysDiff <= 31;
                });
            }
        
            const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS] : null;
            
            const isCompleted = practicas.some(practica => {
                const linkedLanzamientoId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
                if (linkedLanzamientoId) {
                    return linkedLanzamientoId === lanzamiento.id;
                }

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

                if (!namesMatch) {
                    return false;
                }

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
