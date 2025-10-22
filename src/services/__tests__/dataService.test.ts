import { describe, it, expect, jest, beforeEach } from '@jest/globals';
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
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
} from '../../constants';
import type { LanzamientoPPS } from '../../types';

// Mock the entire airtableService
jest.mock('../airtableService');
const mockedAirtable = airtableService as jest.Mocked<typeof airtableService>;

describe('fetchSeleccionados', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    const mockLanzamiento: LanzamientoPPS = {
        id: 'recLanzamiento1',
        [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hospital Central',
        [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-05',
    };

    it('should return grouped selected students correctly', async () => {
        
        mockedAirtable.fetchAllAirtableData.mockImplementation(async (tableName: string, fields?: string[], filterByFormula?: string): Promise<any> => {
            if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS) {
                return {
                    records: [
                        { id: 'recConv1', createdTime: '', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudent1'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Turno Mañana' } },
                        { id: 'recConv2', createdTime: '', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudent2'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Turno Tarde' } },
                        { id: 'recConv3', createdTime: '', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudent3'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Turno Mañana' } },
                    ],
                    error: null
                };
            }
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                return {
                    records: [
                        { id: 'recStudent1', createdTime: '', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Ana Perez', [FIELD_LEGAJO_ESTUDIANTES]: '11111' } },
                        { id: 'recStudent2', createdTime: '', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Juan Garcia', [FIELD_LEGAJO_ESTUDIANTES]: '22222' } },
                        { id: 'recStudent3', createdTime: '', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Carla Rossi', [FIELD_LEGAJO_ESTUDIANTES]: '33333' } },
                    ],
                    error: null
                };
            }
            return { records: [], error: null };
        });

        const result = await fetchSeleccionados(mockLanzamiento);

        expect(result).toEqual({
            'Turno Mañana': [
                { nombre: 'Ana Perez', legajo: '11111' },
                { nombre: 'Carla Rossi', legajo: '33333' },
            ],
            'Turno Tarde': [
                { nombre: 'Juan Garcia', legajo: '22222' },
            ]
        });
    });

    it('should return null if no convocatorias are found', async () => {
        mockedAirtable.fetchAllAirtableData.mockResolvedValue({ records: [], error: null });

        const result = await fetchSeleccionados(mockLanzamiento);
        expect(result).toBeNull();
    });
    
    it('should return null if no students are found for the convocatorias', async () => {
        mockedAirtable.fetchAllAirtableData.mockImplementation(async (tableName: string): Promise<any> => {
            if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS) {
                return {
                    records: [
                        { id: 'recConv1', createdTime: '', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudent1'] } }
                    ],
                    error: null
                };
            }
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                 return { records: [], error: null }; // No students
            }
            return { records: [], error: null };
        });

        const result = await fetchSeleccionados(mockLanzamiento);
        expect(result).toBeNull();
    });

    it('should group students under "No especificado" if horario is missing', async () => {
        mockedAirtable.fetchAllAirtableData.mockImplementation(async (tableName: string): Promise<any> => {
            if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS) {
                return {
                    records: [
                        { id: 'recConv1', createdTime: '', fields: { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudent1'] } }, // No horario field
                    ],
                    error: null
                };
            }
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                return {
                    records: [
                        { id: 'recStudent1', createdTime: '', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Ana Perez', [FIELD_LEGAJO_ESTUDIANTES]: '11111' } },
                    ],
                    error: null
                };
            }
            return { records: [], error: null };
        });

        const result = await fetchSeleccionados(mockLanzamiento);
        expect(result).toEqual({
            'No especificado': [
                { nombre: 'Ana Perez', legajo: '11111' },
            ]
        });
    });
});
