import { fetchAllAirtableData } from './airtableService';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask, CriteriosCalculados, UserGender,
  PracticaFields, SolicitudPPSFields, LanzamientoPPSFields, ConvocatoriaFields, EstudianteFields,
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
  AIRTABLE_TABLE_NAME_PRACTICAS, AIRTABLE_TABLE_NAME_PPS, AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS, AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_LEGAJO_PPS,
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
  FIELD_NOTAS_INTERNAS_ESTUDIANTES,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  // FIX: Imported missing constant to resolve name error.
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_ESTADO_PRACTICA,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';

export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null; userGender: UserGender }> => {
  const { records, error } = await fetchAllAirtableData<EstudianteFields>(
    AIRTABLE_TABLE_NAME_ESTUDIANTES, [], `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`
  );

  if (error) {
    const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
    throw new Error(`Error fetching student data from Airtable: ${errorMsg}`);
  }
  
  const studentRecord = records[0];

  if (!studentRecord) {
    return { studentDetails: null, studentAirtableId: null, userGender: 'neutro' };
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
  
  const gender = studentDetails?.[FIELD_GENERO_ESTUDIANTES];
  let userGender: UserGender = 'neutro';
  if (gender === 'Mujer') userGender = 'femenino';
  else if (gender === 'Varon') userGender = 'masculino';
  
  return { studentDetails, studentAirtableId, userGender };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  const { records, error } = await fetchAllAirtableData<PracticaFields>(
    AIRTABLE_TABLE_NAME_PRACTICAS, [], `SEARCH('${legajo}', {${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} & '')`
  );
  if (error) {
    const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
    throw new Error(`Error fetching practicas: ${errorMsg}`);
  }

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
  // The formula is changed to use the student's `legajo` number, which is more reliable
  // and consistent with how other data types like `Practicas` are fetched.
  const formula = `SEARCH('${legajo}', {${FIELD_LEGAJO_PPS}} & '')`;

  const { records, error } = await fetchAllAirtableData<SolicitudPPSFields>(
    AIRTABLE_TABLE_NAME_PPS, 
    [], 
    formula, 
    [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
  );
  if (error) {
    const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
    throw new Error(`Error fetching solicitudes: ${errorMsg}`);
  }
  
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
    allLanzamientos: LanzamientoPPS[]
}> => {
  // This robust formula finds enrollments by precise record ID link OR by a text search of the legajo,
  // ensuring all relevant records are found even with minor data inconsistencies.
  const formula = studentAirtableId
    ? `OR(FIND('${studentAirtableId}', ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}})), SEARCH('${legajo}', {${FIELD_LEGAJO_CONVOCATORIAS}} & ''))`
    : `SEARCH('${legajo}', {${FIELD_LEGAJO_CONVOCATORIAS}} & '')`;


  // Fetches ALL convocatorias a student is enrolled in, regardless of status.
  const { records: convocatoriasResRecords, error: convocatoriasError } = await fetchAllAirtableData<ConvocatoriaFields>(
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, [], formula
  );

  // Fetches ALL lanzamientos. They will be filtered for the student view.
  const { records: lanzamientosResRecords, error: lanzamientosError } = await fetchAllAirtableData<LanzamientoPPSFields>(
      AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
      [],
      undefined,
      [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]
  );
  
  if (convocatoriasError || lanzamientosError) {
    const errorMsg = (convocatoriasError || lanzamientosError)?.error;
    const finalMessage = typeof errorMsg === 'string' ? errorMsg : errorMsg?.message || 'Error al cargar los datos de convocatorias.';
    throw new Error(finalMessage);
  }

  const myEnrollmentsValidation = convocatoriaArraySchema.safeParse(convocatoriasResRecords);
  if (!myEnrollmentsValidation.success) {
      const formattedErrors = myEnrollmentsValidation.error.issues.map(issue => 
        `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
      ).join('\n');
      console.error('[Zod Validation Error in MyEnrollments]:', myEnrollmentsValidation.error.issues);
      throw new Error(`Error de validación de datos en 'Mis Inscripciones':\n${formattedErrors}`);
  }

  const myEnrollments = myEnrollmentsValidation.data.map(r => ({ ...r.fields, id: r.id }));

  const lanzamientosValidation = lanzamientoPPSArraySchema.safeParse(lanzamientosResRecords);
  if (!lanzamientosValidation.success) {
    const formattedErrors = lanzamientosValidation.error.issues.map(issue => 
      `  - Registro #${String(issue.path[0])}, Campo '${issue.path.slice(1).map(String).join('.')}': ${issue.message}`
    ).join('\n');
    console.error('[Zod Validation Error in Lanzamientos]:', lanzamientosValidation.error.issues);
    throw new Error(`Error de validación de datos en 'Lanzamientos de PPS':\n${formattedErrors}`);
  }
  
  const allLanzamientosRecords = lanzamientosValidation.data.map(r => ({ ...r.fields, id: r.id }));
  
  const lanzamientos = isSuperUserMode ? allLanzamientosRecords : allLanzamientosRecords.filter(lanzamiento => {
    const estado = normalizeStringForComparison(lanzamiento[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
    
    // For students, explicitly hide any 'Oculto' convocatorias. All others ('Abierta', 'Cerrado', etc.) will be shown.
    if (estado === 'oculto') {
        return false;
    }
    return true;
  });

  return { lanzamientos, myEnrollments, allLanzamientos: allLanzamientosRecords };
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

export const fetchSeleccionados = async (lanzamientoId: string): Promise<GroupedSeleccionados | null> => {
    // 1. Fetch ALL 'seleccionado' convocatorias at once
    const { records: allSeleccionados, error: convError } = await fetchAllAirtableData<ConvocatoriaFields>(
        AIRTABLE_TABLE_NAME_CONVOCATORIAS,
        [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS],
        `LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado'`
    );

    if (convError) {
        throw new Error('Error al buscar los alumnos seleccionados.');
    }
    
    // 2. Filter them in memory for the target lanzamiento
    const relevantConvocatorias = allSeleccionados.filter(c => 
        (c.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamientoId)
    );

    if (relevantConvocatorias.length === 0) {
        return null;
    }

    // 3. Collect all unique student IDs from the relevant convocatorias
    const studentIds = [...new Set(relevantConvocatorias.flatMap(c => c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []))];

    if (studentIds.length === 0) {
        return null;
    }

    // 4. Fetch details for only those students in a single batch
    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        studentFormula
    );

    if (studentError) {
        throw new Error('Error al obtener los datos de los estudiantes.');
    }
    
    const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));

    // 5. Group students by horario
    const grouped: GroupedSeleccionados = {};

    relevantConvocatorias.forEach(conv => {
        const studentId = (conv.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        const student = studentId ? studentMap.get(studentId) : null;
        
        if (student) {
            const horario = conv.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
            if (!grouped[horario]) {
                grouped[horario] = [];
            }
            grouped[horario].push({
                nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            });
        }
    });
    
    // Sort students within each group
    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return grouped;
};