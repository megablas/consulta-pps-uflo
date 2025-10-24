import { describe, it, expect } from '@jest/globals';
import { calculateCriterios } from '../criteriaCalculations';
// FIX: Corrected relative import path
import type { Practica, Orientacion } from '../types';
// FIX: Corrected relative import path
import { FIELD_HORAS_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS } from '../constants';

// Mock data
const mockPracticas: Practica[] = [
  { id: 'p1', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 100 },
  { id: 'p2', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80 },
  { id: 'p3', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 70 },
  { id: 'p4', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 20 },
];

describe('calculateCriterios', () => {
  it('should return initial state for no practicas', () => {
    const result = calculateCriterios([], 'Clinica');
    expect(result.horasTotales).toBe(0);
    expect(result.cumpleHorasTotales).toBe(false);
    expect(result.orientacionesCursadasCount).toBe(0);
    expect(result.cumpleRotacion).toBe(false);
  });

  it('should correctly calculate total hours', () => {
    // 100 + 80 + 70 + 20 = 270
    const result = calculateCriterios(mockPracticas, 'Clinica');
    expect(result.horasTotales).toBe(270);
    expect(result.cumpleHorasTotales).toBe(true);
  });
  
  it('should correctly calculate unique orientations and rotation criteria', () => {
    const result = calculateCriterios(mockPracticas, 'Clinica');
    expect(result.orientacionesCursadasCount).toBe(3);
    expect(result.orientacionesUnicas).toEqual(['Clinica', 'Educacional', 'Laboral']);
    expect(result.cumpleRotacion).toBe(true);
  });

  it('should not meet rotation criteria with less than 3 unique orientations', () => {
      const practicasInsuficientes: Practica[] = [
        { id: 'p1', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 100 },
        { id: 'p2', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80 },
      ];
      const result = calculateCriterios(practicasInsuficientes, 'Clinica');
      expect(result.orientacionesCursadasCount).toBe(2);
      expect(result.cumpleRotacion).toBe(false);
  });

  it('should calculate hours for a selected orientation', () => {
    const result = calculateCriterios(mockPracticas, 'Clinica');
    // 100 (p1) + 20 (p4) = 120
    expect(result.horasOrientacionElegida).toBe(120);
    expect(result.cumpleHorasOrientacion).toBe(true);
  });

  it('should handle case-insensitivity for selected orientation', () => {
    const result = calculateCriterios(mockPracticas, 'clinica' as Orientacion);
    expect(result.horasOrientacionElegida).toBe(120);
    expect(result.cumpleHorasOrientacion).toBe(true);
  });

  it('should not meet orientation hours criteria if below threshold', () => {
    const result = calculateCriterios(mockPracticas, 'Laboral');
    expect(result.horasOrientacionElegida).toBe(70);
    expect(result.cumpleHorasOrientacion).toBe(true); // 70 is the threshold

    const result2 = calculateCriterios(mockPracticas, 'Educacional');
    expect(result2.horasOrientacionElegida).toBe(80);
    expect(result2.cumpleHorasOrientacion).toBe(true);

    const practicasInsuficientes: Practica[] = [
        { id: 'p1', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 50 },
    ];
    const result3 = calculateCriterios(practicasInsuficientes, 'Clinica');
    expect(result3.horasOrientacionElegida).toBe(50);
    expect(result3.cumpleHorasOrientacion).toBe(false);
  });

  it('should return 0 for orientation hours if no orientation is selected', () => {
    const result = calculateCriterios(mockPracticas, "");
    expect(result.horasOrientacionElegida).toBe(0);
    expect(result.cumpleHorasOrientacion).toBe(false);
  });
});