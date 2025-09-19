import { describe, it, expect, jest } from '@jest/globals';
import * as airtableService from '../airtableService';
import { fetchSeleccionados } from '../dataService';
import {
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
} from '../../constants';
import type { LanzamientoPPS } from '../../types';

// Mock del servicio de Airtable
jest.mock('../airtableService');
const mockedAirtableService = airtableService as jest.Mocked<typeof airtableService>;

describe('Data Service - fetchSeleccionados', () => {
  // FIX: Rewrote test to match the new server-side filtering logic of `fetchSeleccionados`.
  // It now passes a full LanzamientoPPS object and mocks the API calls based on a name-based formula.
  it('should fetch and filter selected students by the PPS name', async () => {
    const targetLanzamiento: LanzamientoPPS = {
      id: 'lanz_A',
      [FIELD_NOMBRE_PPS_LANZAMIENTOS]: "Hospital Alpha"
    };

    const mockConvocatoriasResponse = [
      { id: 'conv1', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_A1'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Mañana' } },
      { id: 'conv3', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_A2'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Tarde' } },
    ];

    const mockStudentsResponse = [
      { id: 'stu_A1', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Ana Manana', [FIELD_LEGAJO_ESTUDIANTES]: '1111' } },
      { id: 'stu_A2', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Bruno Tarde', [FIELD_LEGAJO_ESTUDIANTES]: '2222' } },
    ];
    
    mockedAirtableService.fetchAllAirtableData.mockImplementation(async (tableName, fields, formula) => {
      if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS) {
        // Check that the formula correctly filters by PPS name and status
        expect(formula).toContain(`{${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado'`);
        expect(formula).toContain(`{${FIELD_NOMBRE_PPS_CONVOCATORIAS}} = 'Hospital Alpha'`);
        return { records: mockConvocatoriasResponse, error: null } as any;
      }
      
      if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
        // Check that the student fetch is for the correct student IDs
        const expectedStudentFormula = "OR(RECORD_ID()='stu_A1',RECORD_ID()='stu_A2')";
        expect(formula?.replace(/\s+/g, '')).toEqual(expectedStudentFormula.replace(/\s+/g, ''));
        return { records: mockStudentsResponse, error: null } as any;
      }
      
      return { records: [], error: null } as any;
    });

    const result = await fetchSeleccionados(targetLanzamiento);
    
    // The final result should only contain students from the mocked "Hospital Alpha" convocatoria
    expect(result).toEqual({
      'Mañana': [
        { nombre: 'Ana Manana', legajo: '1111' },
      ],
      'Tarde': [
        { nombre: 'Bruno Tarde', legajo: '2222' },
      ],
    });
    
    expect(mockedAirtableService.fetchAllAirtableData).toHaveBeenCalledTimes(2);
  });
});
