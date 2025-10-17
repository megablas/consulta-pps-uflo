import { db } from '../lib/db';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask,
  EstudianteFields,
  GroupedSeleccionados
} from '../types';
import {
    solicitudPPSArraySchema,
    practicaArraySchema,
    lanzamientoPPSArraySchema,
    convocatoriaArraySchema,
    estudianteSchema
} from '../schemas';
import {
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_INFORME_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_FECHA_INICIO_PRACTICAS, FIELD_NOTA_PRACTICAS, FIELD_ULTIMA_ACTUALIZACION_PPS,
  FIELD_LEGAJO_ESTUDIANTES, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS,
  FIELD_GENERO_ESTUDIANTES,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
  FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_ESTADO_PRACTICA,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_DIRECCION_INSTITUCIONES,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_LEGAJO_PPS,
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_EMPRESA_PPS_SOLICITUD,
  FIELD_ESTADO_PPS,
  FIELD_NOTAS_PPS,
  FIELD_ORIENTACION_LANZAMIENTOS,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';

// --- MOCK DATA FOR TESTING USER ---
const mockStudentDetails: EstudianteFields = {
  [FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [FIELD_NOMBRE_ESTUDIANTES]: 'Usuario de Prueba',
  'Orientación Elegida': 'Clinica',
  [FIELD_DNI_ESTUDIANTES]: 12345678,
  [FIELD_CORREO_ESTUDIANTES]: 'testing@uflo.edu.ar',
  [FIELD_TELEFONO_ESTUDIANTES]: '1122334455',
  [FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
  { id: 'prac_mock_1', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: ['Hospital Central'], [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 120, [FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-12-15', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '9' },
  { id: 'prac_mock_2', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: ['Colegio San Martín'], [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-07-15', [FIELD_ESTADO_PRACTICA]: 'En curso' },
  { id: 'prac_mock_3', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: ['Empresa Tech Solutions'], [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 50, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-10-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada' },
];

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora Global', [FIELD_ESTADO_PPS]: 'En conversaciones', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-20', [FIELD_NOTAS_PPS]: 'Se contactó para coordinar entrevista.' }
];

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hogar de Ancianos "Amanecer"', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Comunitaria', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Fundación "Crecer Juntos"', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Educacional', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-15', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
];

const mockMyEnrollments: Convocatoria[] = [
    { id: 'conv_mock_1', [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_mock_2'], [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15' }
];


export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null; }> => {
  if (legajo === '99999') {
    return Promise.resolve({
      studentDetails: mockStudentDetails,
      studentAirtableId: 'recTestingUser123',
    });
  }

  const records = await db.estudiantes.get({ filterByFormula: `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`, maxRecords: 1 });
  
  const studentRecord = records[0];

  if (!studentRecord) {
    return { studentDetails: null, studentAirtableId: null };
  }

  const validationResult = estudianteSchema.safeParse(studentRecord);
  if (!validationResult.success) {
    const formattedErrors = validationResult.error.issues.map(issue => 
        `  - Campo '${issue.path.join('.')}': ${issue.message}`
    ).join('\n');
    console.error('[Zod Validation Error in Estudiantes]:', validationResult.error.issues);
    throw new Error(`Error de validación de datos del estudiante:\n${formattedErrors}`);
  }

  const validatedStudent = validationResult.data;
  const studentDetails = validatedStudent.fields;
  const studentAirtableId = validatedStudent.id;
  
  return { studentDetails, studentAirtableId };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockPracticas);
  }

  const records = await db.practicas.getAll({ filterByFormula: `SEARCH('${legajo}', {${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} & '')` });

  const validationResult = practicaArraySchema.safeParse(records);
  if (!validationResult.success) {
      const formattedErrors = validationResult.error.issues.map(issue => 
        `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
      ).join('\n');
      console.error('[Zod Validation Error in Prácticas]:', validationResult.error.issues);
      throw new Error(`Error de validación de datos en 'Prácticas':\n${formattedErrors}`);
  }

  return validationResult.data.map(r => ({ ...r.fields, id: r.id }));
};

export const fetchSolicitudes = async (legajo: string, studentAirtableId: string | null): Promise<SolicitudPPS[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockSolicitudes);
  }

  const formula = `SEARCH('${legajo}', {${FIELD_LEGAJO_PPS}} & '')`;
  const records = await db.solicitudes.getAll({ 
    filterByFormula: formula, 
    sort: [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
  });
  
  const validationResult = solicitudPPSArraySchema.safeParse(records);
  if (!validationResult.success) {
      const formattedErrors = validationResult.error.issues.map(issue => 
        `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
      ).join('\n');
      console.error('[Zod Validation Error in Solicitud de PPS]:', validationResult.error.issues);
      throw new Error(`Error de validación de datos en 'Solicitud de PPS':\n${formattedErrors}`);
  }

  return validationResult.data.map(r => ({ ...r.fields, id: r.id }));
};

export const fetchConvocatoriasData = async (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean): Promise<{
    lanzamientos: LanzamientoPPS[],
    myEnrollments: Convocatoria[],
    allLanzamientos: LanzamientoPPS[],
    institutionAddressMap: Map<string, string>,
}> => {
  if (legajo === '99999') {
    return Promise.resolve({
      lanzamientos: mockLanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] !== 'Oculto'),
      myEnrollments: mockMyEnrollments,
      allLanzamientos: mockLanzamientos,
      institutionAddressMap: new Map(),
    });
  }

  const formula = studentAirtableId
    ? `OR(FIND('${studentAirtableId}', ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}})), SEARCH('${legajo}', {${FIELD_LEGAJO_CONVOCATORIAS}} & ''))`
    : `SEARCH('${legajo}', {${FIELD_LEGAJO_CONVOCATORIAS}} & '')`;

  const [convocatoriasRecords, lanzamientosRecords, institutionsRecords] = await Promise.all([
      db.convocatorias.getAll({ filterByFormula: formula }),
      db.lanzamientos.getAll({ sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }] }),
      db.instituciones.getAll()
  ]);
  
  const myEnrollmentsValidation = convocatoriaArraySchema.safeParse(convocatoriasRecords);
  if (!myEnrollmentsValidation.success) {
      const formattedErrors = myEnrollmentsValidation.error.issues.map(issue => 
        `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
      ).join('\n');
      console.error('[Zod Validation Error in MyEnrollments]:', myEnrollmentsValidation.error.issues);
      throw new Error(`Error de validación de datos en 'Mis Inscripciones':\n${formattedErrors}`);
  }
  const myEnrollments = myEnrollmentsValidation.data.map(r => ({ ...r.fields, id: r.id }));

  const lanzamientosValidation = lanzamientoPPSArraySchema.safeParse(lanzamientosRecords);
  if (!lanzamientosValidation.success) {
    const formattedErrors = lanzamientosValidation.error.issues.map(issue => 
      `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
    ).join('\n');
    console.error('[Zod Validation Error in Lanzamientos]:', lanzamientosValidation.error.issues);
    throw new Error(`Error de validación de datos en 'Lanzamientos de PPS':\n${formattedErrors}`);
  }
  const allLanzamientosRecords = lanzamientosValidation.data.map(r => ({ ...r.fields, id: r.id }));
  
  const lanzamientos = allLanzamientosRecords.filter(lanzamiento => {
    const estado = normalizeStringForComparison(lanzamiento[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
    return estado !== 'oculto';
  });

  const institutionAddressMap = new Map<string, string>();
  institutionsRecords.forEach(record => {
      const name = record.fields[FIELD_NOMBRE_INSTITUCIONES];
      const address = record.fields[FIELD_DIRECCION_INSTITUCIONES];
      if (name && address) {
          institutionAddressMap.set(normalizeStringForComparison(name), address);
      }
  });

  return { lanzamientos, myEnrollments, allLanzamientos: allLanzamientosRecords, institutionAddressMap };
};

export const processInformeTasks = (myEnrollments: Convocatoria[], allLanzamientos: LanzamientoPPS[], practicas: Practica[]): InformeTask[] => {
  const tasks: InformeTask[] = [];
  const processedLanzamientoIds = new Set<string>();

  // --- Path 1: Process from formal "Seleccionado" enrollments ---
  const selectedEnrollments = myEnrollments.filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado');

  for (const enrollment of selectedEnrollments) {
    let pps: LanzamientoPPS | undefined;
    const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
    
    if (lanzamientoId) {
        pps = allLanzamientos.find(l => l.id === lanzamientoId);
    } else {
        // Fallback logic if direct link fails or is missing
        const convPpsNameRaw = enrollment[FIELD_NOMBRE_PPS_CONVOCATORIAS];
        const ppsNameToMatch = Array.isArray(convPpsNameRaw) ? convPpsNameRaw[0] : convPpsNameRaw;
        const convStartDate = parseToUTCDate(enrollment[FIELD_FECHA_INICIO_CONVOCATORIAS]);

        if (ppsNameToMatch && convStartDate) {
            pps = allLanzamientos.find(l => {
                const lanzamientoStartDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                if (!lanzamientoStartDate) return false;
                
                const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
                const daysDiff = timeDiff / (1000 * 3600 * 24);

                const normLanzamientoName = normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
                const normConvocatoriaName = normalizeStringForComparison(ppsNameToMatch as string);
                const namesMatch = normLanzamientoName.includes(normConvocatoriaName) || normConvocatoriaName.includes(normLanzamientoName);

                return namesMatch && daysDiff <= 31;
            });
        }
    }
    
    if (pps && pps[FIELD_INFORME_LANZAMIENTOS]) {
        processedLanzamientoIds.add(pps.id);
        
        // Primary linking method for practica
        let linkedPractica = practicas.find(p => ((p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0]) === pps!.id);

        // Fallback linking method if direct link fails
        if (!linkedPractica) {
            const ppsName = pps[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            const ppsStartDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);

            if (ppsName && ppsStartDate) {
                const normalizedPpsName = normalizeStringForComparison(ppsName);
                linkedPractica = practicas.find(p => {
                    const practicaNameRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                    const practicaName = Array.isArray(practicaNameRaw) ? practicaNameRaw[0] : practicaNameRaw;
                    if (!practicaName || normalizeStringForComparison(practicaName as string) !== normalizedPpsName) {
                        return false;
                    }

                    const practicaStartDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
                    if (!practicaStartDate) return false;

                    const timeDiff = Math.abs(practicaStartDate.getTime() - ppsStartDate.getTime());
                    const daysDiff = timeDiff / (1000 * 3600 * 24);
                    return daysDiff <= 31; // Match within a month's tolerance
                });
            }
        }

        tasks.push({
            convocatoriaId: enrollment.id,
            practicaId: linkedPractica?.id,
            ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
            informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
            fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
            informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
            nota: linkedPractica?.[FIELD_NOTA_PRACTICAS],
            fechaEntregaInforme: enrollment[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
        });
    }
  }

  // --- Path 2: Process from "Finalizada" practices that might not have a formal enrollment ---
  const finalizadaStatuses = ['finalizada', 'pps realizada', 'convenio realizado'];
  for (const practica of practicas) {
      const estadoPractica = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
      if (!finalizadaStatuses.includes(estadoPractica)) {
          continue;
      }

      let pps: LanzamientoPPS | undefined;
      const lanzamientoId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
      
      if (lanzamientoId) {
          if (processedLanzamientoIds.has(lanzamientoId)) continue; // Already processed via Path 1
          pps = allLanzamientos.find(l => l.id === lanzamientoId);
      } else {
          const ppsNameRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
          const ppsNameToMatch = Array.isArray(ppsNameRaw) ? ppsNameRaw[0] : ppsNameRaw;
          const practicaStartDate = parseToUTCDate(practica[FIELD_FECHA_INICIO_PRACTICAS]);

          if (ppsNameToMatch && practicaStartDate) {
              pps = allLanzamientos.find(l => {
                  if (processedLanzamientoIds.has(l.id)) return false;
                  const lanzamientoStartDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                  if (!lanzamientoStartDate) return false;
                  const timeDiff = Math.abs(lanzamientoStartDate.getTime() - practicaStartDate.getTime());
                  const daysDiff = timeDiff / (1000 * 3600 * 24);
                  return normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]) === normalizeStringForComparison(ppsNameToMatch as string) && daysDiff <= 31;
              });
          }
      }
      
      if (pps && pps[FIELD_INFORME_LANZAMIENTOS] && !processedLanzamientoIds.has(pps.id)) {
          tasks.push({
              convocatoriaId: `practica-${practica.id}`,
              practicaId: practica.id,
              ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
              informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
              fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
              informeSubido: !!practica[FIELD_INFORME_SUBIDO_CONVOCATORIAS], 
              nota: practica[FIELD_NOTA_PRACTICAS],
          });
          processedLanzamientoIds.add(pps.id);
      }
  }

  // Sort tasks: pending first, then by deadline
  return tasks.sort((a, b) => {
    const aIsPending = !a.informeSubido;
    const bIsPending = !b.informeSubido;
    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;

    const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
    const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
    return dateA - dateB;
  });
};

export const fetchSeleccionados = async (lanzamiento: LanzamientoPPS): Promise<GroupedSeleccionados | null> => {
    // --- MOCK FOR TESTING USER ---
    if (lanzamiento.id === 'lanz_mock_2') {
        return Promise.resolve({
            'Turno Mañana': [
                { nombre: 'Ana Rodriguez', legajo: '99901' },
                { nombre: 'Carlos Gomez', legajo: '99902' },
            ],
            'Turno Tarde': [
                { nombre: 'Lucia Fernandez', legajo: '99903' },
            ],
        });
    }
    // --- END MOCK ---

    const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
    const startDate = lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]; // e.g., '2024-08-05'

    if (!ppsName || !startDate) {
        console.warn('fetchSeleccionados called without a PPS name or start date in the lanzamiento object.');
        return null;
    }
    
    // Escape single quotes for Airtable formula
    const escapedPpsName = ppsName.replace(/'/g, "\\'");

    // The start date from 'lanzamiento' is already in YYYY-MM-DD format.
    // We use DATETIME_FORMAT on the Airtable field to ensure we compare only the date part,
    // ignoring any time components, which makes the match robust and accurate.
    const formula = `AND(
        LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado',
        {${FIELD_NOMBRE_PPS_CONVOCATORIAS}} = '${escapedPpsName}',
        DATETIME_FORMAT({${FIELD_FECHA_INICIO_CONVOCATORIAS}}, 'YYYY-MM-DD') = '${startDate}'
    )`;

    const convocatoriasRecords = await db.convocatorias.getAll({
        filterByFormula: formula,
        fields: [
            FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
            FIELD_HORARIO_FORMULA_CONVOCATORIAS
        ]
    });

    if (convocatoriasRecords.length === 0) return null;

    const studentIds = [...new Set(convocatoriasRecords.flatMap(c => c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []))];
    if (studentIds.length === 0) return null;

    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const studentRecords = await db.estudiantes.getAll({ 
        filterByFormula: studentFormula,
        fields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES]
    });
    
    const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));

    const grouped: GroupedSeleccionados = {};
    convocatoriasRecords.forEach(convRecord => {
        const studentId = (convRecord.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        const student = studentId ? studentMap.get(studentId) : null;
        
        if (student) {
            const horario = convRecord.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
            if (!grouped[horario]) {
                grouped[horario] = [];
            }
            grouped[horario].push({
                nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            });
        }
    });
    
    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return grouped;
};