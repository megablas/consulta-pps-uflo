import type { Convocatoria, LanzamientoPPS, Practica, InformeTask } from '../types';
import { normalizeStringForComparison, parseToUTCDate } from './formatters';
import {
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_INFORME_LANZAMIENTOS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOTA_PRACTICAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ORIENTACION_LANZAMIENTOS
} from '../constants';

// Helper to get a single string name from a potential lookup array
function getLookupName(fieldValue: any): string | null {
    if (Array.isArray(fieldValue)) {
        return typeof fieldValue[0] === 'string' ? fieldValue[0] : null;
    }
    return typeof fieldValue === 'string' ? fieldValue : null;
}

/**
 * Finds a matching Lanzamiento for a Convocatoria.
 * Prioritizes direct ID link, then falls back to fuzzy matching on name and date.
 */
function findLanzamientoForConvocatoria(
    convocatoria: Convocatoria,
    lanzamientosMap: Map<string, LanzamientoPPS>,
    allLanzamientos: LanzamientoPPS[]
): LanzamientoPPS | undefined {
    // 1. Prioritize direct link
    const linkedId = (convocatoria[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
    if (linkedId && lanzamientosMap.has(linkedId)) {
        return lanzamientosMap.get(linkedId);
    }

    // 2. Fallback to fuzzy matching name + date
    const convPpsName = getLookupName(convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS]);
    const convStartDate = parseToUTCDate(convocatoria[FIELD_FECHA_INICIO_CONVOCATORIAS]);
    if (!convPpsName || !convStartDate) return undefined;

    const normalizedConvName = normalizeStringForComparison(convPpsName);
    let bestMatch: LanzamientoPPS | undefined;
    let smallestDaysDiff = 32; // Only match within a month

    for (const lanzamiento of allLanzamientos) {
        const lanzamientoName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        
        if (!lanzamientoName || !lanzamientoStartDate || normalizeStringForComparison(lanzamientoName) !== normalizedConvName) {
            continue;
        }

        const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff < smallestDaysDiff) {
            smallestDaysDiff = daysDiff;
            bestMatch = lanzamiento;
        }
    }
    return bestMatch;
}

/**
 * Finds a matching Lanzamiento for a given Practica.
 * Prioritizes direct ID link, then falls back to fuzzy matching on name, orientation, and date.
 */
function findLanzamientoForPractica(practica: Practica, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    // 1. Direct link is the most reliable
    const linkedId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
    if (linkedId) {
        return allLanzamientos.find(l => l.id === linkedId);
    }

    // 2. Fallback to fuzzy matching if no direct link
    const practicaInstitucion = getLookupName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
    const practicaOrientacion = practica[FIELD_ESPECIALIDAD_PRACTICAS];
    const practicaFechaInicio = parseToUTCDate(practica[FIELD_FECHA_INICIO_PRACTICAS]);
    
    if (!practicaInstitucion || !practicaOrientacion || !practicaFechaInicio) return undefined;

    const normalizedPracticaName = normalizeStringForComparison(practicaInstitucion);
    const normalizedPracticaOrientacion = normalizeStringForComparison(practicaOrientacion);

    let bestMatch: LanzamientoPPS | undefined;
    let smallestDaysDiff = 32; // Only match within a month's tolerance

    for (const lanzamiento of allLanzamientos) {
        const lanzamientoName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const lanzamientoOrientacion = lanzamiento[FIELD_ORIENTACION_LANZAMIENTOS];
        const lanzamientoFechaInicio = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        
        if (!lanzamientoName || !lanzamientoOrientacion || !lanzamientoFechaInicio) continue;

        if (normalizeStringForComparison(lanzamientoName) !== normalizedPracticaName) continue;
        if (normalizeStringForComparison(lanzamientoOrientacion) !== normalizedPracticaOrientacion) continue;

        const timeDiff = Math.abs(practicaFechaInicio.getTime() - lanzamientoFechaInicio.getTime());
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff < smallestDaysDiff) {
            smallestDaysDiff = daysDiff;
            bestMatch = lanzamiento;
        }
    }
    return bestMatch;
}

interface LinkDataParams {
    myEnrollments: Convocatoria[];
    allLanzamientos: LanzamientoPPS[];
    practicas: Practica[];
}

/**
 * Central function to process and link all data related to a student.
 * It determines enrollments, completed practices, and pending informe tasks.
 */
export function processAndLinkStudentData({ myEnrollments, allLanzamientos, practicas }: LinkDataParams) {
    const lanzamientosMap = new Map(allLanzamientos.map(l => [l.id, l]));
    
    // Step 1: Group all enrollments by their corresponding Lanzamiento ID.
    const enrollmentsByPpsId = new Map<string, Convocatoria[]>();
    myEnrollments.forEach(enrollment => {
        const pps = findLanzamientoForConvocatoria(enrollment, lanzamientosMap, allLanzamientos);
        if (pps) {
            if (!enrollmentsByPpsId.has(pps.id)) {
                enrollmentsByPpsId.set(pps.id, []);
            }
            enrollmentsByPpsId.get(pps.id)!.push(enrollment);
        }
    });

    // Step 2: For each group, find the one with the highest priority status.
    const enrollmentMap = new Map<string, Convocatoria>();
    const statusPriority: { [key: string]: number } = {
        'seleccionado': 3,
        'inscripto': 2,
        'no seleccionado': 1,
    };

    enrollmentsByPpsId.forEach((enrollmentGroup, ppsId) => {
        const bestEnrollment = enrollmentGroup.reduce((best, current) => {
            const bestStatus = normalizeStringForComparison(best[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]);
            const currentStatus = normalizeStringForComparison(current[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]);
            
            const bestPriority = statusPriority[bestStatus] || 0;
            const currentPriority = statusPriority[currentStatus] || 0;

            return currentPriority > bestPriority ? current : best;
        });
        
        enrollmentMap.set(ppsId, bestEnrollment);
    });

    // Step 3: Identify completed practices
    const completedLanzamientoIds = new Set<string>();
    const finalizadaStatuses = ['finalizada', 'pps realizada', 'convenio realizado'];
    practicas.forEach(practica => {
        const pps = findLanzamientoForPractica(practica, allLanzamientos);
        if (pps) {
            const estadoPractica = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
            if (finalizadaStatuses.includes(estadoPractica)) {
                completedLanzamientoIds.add(pps.id);
            }
        }
    });

    // Step 4: Generate informe tasks based on definitive enrollments and practices
    const informeTasks: InformeTask[] = [];
    const processedForInforme = new Set<string>();

    // From 'Seleccionado' enrollments in the definitive map
    for (const enrollment of enrollmentMap.values()) {
        if (normalizeStringForComparison(enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado') {
            const pps = findLanzamientoForConvocatoria(enrollment, lanzamientosMap, allLanzamientos);
            if (pps && pps[FIELD_INFORME_LANZAMIENTOS] && !processedForInforme.has(pps.id)) {
                const practica = practicas.find(p => (p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0] === pps.id);
                informeTasks.push({
                    convocatoriaId: enrollment.id,
                    practicaId: practica?.id,
                    ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
                    informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                    fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
                    informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
                    nota: practica?.[FIELD_NOTA_PRACTICAS],
                    fechaEntregaInforme: enrollment[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
                });
                processedForInforme.add(pps.id);
            }
        }
    }

    // From 'Finalizada' practicas that didn't have a 'Seleccionado' enrollment
    for (const practica of practicas) {
        const pps = findLanzamientoForPractica(practica, allLanzamientos);
        if (pps && finalizadaStatuses.includes(normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]))) {
            if (pps[FIELD_INFORME_LANZAMIENTOS] && !processedForInforme.has(pps.id)) {
                informeTasks.push({
                    convocatoriaId: `practica-${practica.id}`,
                    practicaId: practica.id,
                    ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
                    informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                    fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
                    informeSubido: !!(practica as any)[FIELD_INFORME_SUBIDO_CONVOCATORIAS], 
                    nota: practica[FIELD_NOTA_PRACTICAS],
                });
                processedForInforme.add(pps.id);
            }
        }
    }
    
    // Sort informe tasks: pending first, then by deadline
    informeTasks.sort((a, b) => {
        const aIsPending = !a.informeSubido;
        const bIsPending = !b.informeSubido;
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;

        const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
        const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
        return dateA - dateB;
    });

    return { enrollmentMap, completedLanzamientoIds, informeTasks };
}
