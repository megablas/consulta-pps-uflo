import { Practica, Orientacion, CriteriosCalculados } from '../types';
import { 
  HORAS_OBJETIVO_TOTAL, 
  HORAS_OBJETIVO_ORIENTACION, 
  ROTACION_OBJETIVO_ORIENTACIONES,
  FIELD_HORAS_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
} from '../constants';
import { normalizeStringForComparison } from './formatters';

export const initialCriterios: CriteriosCalculados = {
    horasTotales: 0,
    horasFaltantes250: HORAS_OBJETIVO_TOTAL,
    cumpleHorasTotales: false,
    horasOrientacionElegida: 0,
    horasFaltantesOrientacion: HORAS_OBJETIVO_ORIENTACION,
    cumpleHorasOrientacion: false,
    orientacionesCursadasCount: 0,
    orientacionesUnicas: [],
    cumpleRotacion: false,
};

export const calculateCriterios = (
  allPracticas: Practica[], 
  selectedOrientacion: Orientacion | ""
): CriteriosCalculados => {
  if (allPracticas.length === 0) return initialCriterios;

  const horasTotales = allPracticas.reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
  const cumpleHorasTotales = horasTotales >= HORAS_OBJETIVO_TOTAL;

  const orientacionesUnicas = [...new Set(allPracticas.map(p => p[FIELD_ESPECIALIDAD_PRACTICAS]).filter(Boolean))] as string[];
  const cumpleRotacion = orientacionesUnicas.length >= ROTACION_OBJETIVO_ORIENTACIONES;
  
  let horasOrientacionElegida = 0;
  if (selectedOrientacion) {
    horasOrientacionElegida = allPracticas
      .filter(p => normalizeStringForComparison(p[FIELD_ESPECIALIDAD_PRACTICAS]) === normalizeStringForComparison(selectedOrientacion))
      .reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
  }
  const cumpleHorasOrientacion = horasOrientacionElegida >= HORAS_OBJETIVO_ORIENTACION;

  return {
    horasTotales,
    cumpleHorasTotales,
    horasOrientacionElegida,
    cumpleHorasOrientacion,
    orientacionesCursadasCount: orientacionesUnicas.length,
    orientacionesUnicas,
    cumpleRotacion,
    horasFaltantes250: Math.max(0, HORAS_OBJETIVO_TOTAL - horasTotales),
    horasFaltantesOrientacion: Math.max(0, HORAS_OBJETIVO_ORIENTACION - horasOrientacionElegida),
  };
};