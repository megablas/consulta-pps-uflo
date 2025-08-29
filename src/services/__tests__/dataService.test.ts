import { describe, it, expect, jest } from '@jest/globals';
import * as airtableService from '../airtableService';
import { getDashboardData, fetchSeleccionados } from '../dataService';
import {
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_PPS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_HORAS_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
  FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
  FIELD_INFORME_SUBIDO_CONVOCATORIAS,
  FIELD_INFORME_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS
} from '../../constants';
import type { EstudianteFields, PracticaFields, SolicitudPPSFields, ConvocatoriaFields, LanzamientoPPSFields } from '../../types';

// Mock del servicio de Airtable
jest.mock('../airtableService');
const mockedAirtableService = airtableService as jest.Mocked<typeof airtableService>;

const mockStudent: EstudianteFields = {
    [FIELD_LEGAJO_ESTUDIANTES]: '12345',
    [FIELD_NOMBRE_ESTUDIANTES]: 'Juan Perez',
    [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: 'Clinica'
};

const mockPracticas: PracticaFields[] = [
    { [FIELD_HORAS_PRACTICAS]: 100, [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica' },
    { [FIELD_HORAS_PRACTICAS]: 80, [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional' },
    { [FIELD_HORAS_PRACTICAS]: 75, [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral' },
];

const mockLanzamientos: LanzamientoPPSFields[] = [
    { id: 'lanz1', [FIELD_INFORME_LANZAMIENTOS]: 'http://informe.com', [FIELD_FECHA_FIN_LANZAMIENTOS]: '2023-10-10', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'PPS Test' }
];

const mockConvocatorias: ConvocatoriaFields[] = [
    { [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz1'], [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true }
];

describe('Data Service - getDashboardData', () => {
    it('should fetch and process data correctly for a student', async () => {
        // Configurar mocks para devolver datos simulados
        mockedAirtableService.fetchAllAirtableData.mockImplementation(async (tableName) => {
            switch (tableName) {
                case AIRTABLE_TABLE_NAME_ESTUDIANTES:
                    return { records: [{ id: 'stu1', fields: mockStudent }], error: null } as any;
                case AIRTABLE_TABLE_NAME_PRACTICAS:
                    return { records: mockPracticas.map((p, i) => ({ id: `p${i}`, fields: p })), error: null } as any;
                case AIRTABLE_TABLE_NAME_PPS:
                    return { records: [], error: null } as any;
                case AIRTABLE_TABLE_NAME_CONVOCATORIAS:
                     return { records: mockConvocatorias.map((c, i) => ({ id: `c${i}`, fields: c })), error: null } as any;
                case AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS:
                     return { records: mockLanzamientos.map((l, i) => ({ id: `l${i}`, fields: l })), error: null } as any;
                default:
                    return { records: [], error: null } as any;
            }
        });

        const data = await getDashboardData('12345');
        
        // Verificar que los datos del estudiante se procesaron
        expect(data.studentAirtableId).toBe('stu1');
        expect(data.studentDetails).toEqual(mockStudent);
        expect(data.practicas.length).toBe(3);

        // Verificar los criterios calculados
        expect(data.criterios.horasTotales).toBe(255); // 100 + 80 + 75
        expect(data.criterios.cumpleHorasTotales).toBe(true);
        expect(data.criterios.horasOrientacionElegida).toBe(100);
        expect(data.criterios.cumpleHorasOrientacion).toBe(true);
        expect(data.criterios.orientacionesCursadasCount).toBe(3);
        expect(data.criterios.cumpleRotacion).toBe(true);

        // Verificar las tareas de informe
        expect(data.informeTasks.length).toBe(1);
        expect(data.informeTasks[0].informeSubido).toBe(true);
        expect(data.informeTasks[0].ppsName).toBe('PPS Test');
    });
});


describe('Data Service - fetchSeleccionados', () => {
  it('should robustly fetch and filter selected students by a specific lanzamientoId', async () => {
    const targetLanzamientoId = 'lanz_A';

    // Mock a response that includes 'seleccionado' students from MULTIPLE lanzamientos
    const mockAllSeleccionadosConvocatorias = [
      { id: 'conv1', fields: { [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [targetLanzamientoId], [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_A1'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Mañana' } },
      { id: 'conv2', fields: { [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_B_other'], [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_B1'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Tarde' } },
      { id: 'conv3', fields: { [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [targetLanzamientoId], [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_A2'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Tarde' } },
      { id: 'conv4', fields: { [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_B_other'], [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['stu_B2'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Mañana' } },
    ];

    const mockStudentsResponse = [
      { id: 'stu_A1', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Ana Manana', [FIELD_LEGAJO_ESTUDIANTES]: '1111' } },
      { id: 'stu_A2', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Bruno Tarde', [FIELD_LEGAJO_ESTUDIANTES]: '2222' } },
      { id: 'stu_B1', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Carlos Otro', [FIELD_LEGAJO_ESTUDIANTES]: '3333' } },
      { id: 'stu_B2', fields: { [FIELD_NOMBRE_ESTUDIANTES]: 'Diana Otro', [FIELD_LEGAJO_ESTUDIANTES]: '4444' } },
    ];
    
    mockedAirtableService.fetchAllAirtableData.mockImplementation(async (tableName, fields, formula) => {
      // First call: get ALL 'seleccionado' convocatorias
      if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS) {
        const expectedFormula = `LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado'`;
        expect(formula).toEqual(expectedFormula);
        return { records: mockAllSeleccionadosConvocatorias, error: null } as any;
      }
      
      // Second call: get details for the FILTERED students
      if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
        // The formula should now only contain student IDs for lanz_A
        const expectedStudentFormula = "OR(RECORD_ID()='stu_A1',RECORD_ID()='stu_A2')";
        expect(formula?.replace(/\s+/g, '')).toEqual(expectedStudentFormula.replace(/\s+/g, ''));
        // Return only the relevant students for the test to be accurate
        return { records: mockStudentsResponse.filter(s => s.id === 'stu_A1' || s.id === 'stu_A2'), error: null } as any;
      }
      
      return { records: [], error: null } as any;
    });

    const result = await fetchSeleccionados(targetLanzamientoId);
    
    // The final result should only contain students from `lanz_A`, correctly grouped.
    expect(result).toEqual({
      'Mañana': [
        { nombre: 'Ana Manana', legajo: '1111' },
      ],
      'Tarde': [
        { nombre: 'Bruno Tarde', legajo: '2222' },
      ],
    });
    
    // Verify the correct calls were made.
    expect(mockedAirtableService.fetchAllAirtableData).toHaveBeenCalledWith(
      AIRTABLE_TABLE_NAME_CONVOCATORIAS,
      expect.any(Array),
      expect.stringContaining("LOWER({Estado}) = 'seleccionado'")
    );
    expect(mockedAirtableService.fetchAllAirtableData).toHaveBeenCalledWith(
      AIRTABLE_TABLE_NAME_ESTUDIANTES,
      expect.any(Array),
      expect.stringContaining("OR(RECORD_ID()='stu_A1',RECORD_ID()='stu_A2')")
    );
  });
});