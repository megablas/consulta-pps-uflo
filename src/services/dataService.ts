import { fetchAllAirtableData } from './airtableService';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask, CriteriosCalculados, UserGender,
  PracticaFields, SolicitudPPSFields, LanzamientoPPSFields, ConvocatoriaFields, EstudianteFields,
  GroupedSeleccionados
} from '../types';
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
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS
} from '../constants';
import { calculateCriterios } from '../utils/criteriaCalculations';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';

export interface DashboardData {
  practicas: Practica[];
  solicitudes: SolicitudPPS[];
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
  informeTasks: InformeTask[];
  criterios: CriteriosCalculados;
  studentDetails: EstudianteFields | null;
  studentAirtableId: string | null;
  userGender: UserGender;
}

const isCorrectorRole = (role?: 'Jefe' | 'SuperUser') => role === 'SuperUser' || role === 'Jefe';

/**
 * Fetches and processes all necessary data for the student/admin dashboard.
 * This service acts as a single source of truth for dashboard data,
 * abstracting away the complexities of Airtable queries and data transformations.
 */
export const getDashboardData = async (legajo: string, role?: 'Jefe' | 'SuperUser'): Promise<DashboardData> => {
  const isCorrector = isCorrectorRole(role);

  // 1. Fetch student record first to get their unique Airtable ID.
  const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
    AIRTABLE_TABLE_NAME_ESTUDIANTES, [], `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`
  );

  if (studentError) {
    const errorMsg = typeof studentError.error === 'string' ? studentError.error : studentError.error.message;
    throw new Error(`Error fetching student data from Airtable: ${errorMsg}`);
  }
  
  const studentRecord = studentRecords[0];
  const studentAirtableId = studentRecord?.id ?? null;

  // 2. Build the formula for fetching convocatorias, now more robustly.
  const convocatoriasFormula = (isCorrector || !studentAirtableId)
    ? undefined // No need to fetch for correctors or if student ID is missing
    : `OR(
        {${FIELD_LEGAJO_CONVOCATORIAS}} = ${legajo},
        FIND('${studentAirtableId}', ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}}))
    )`;


  // 3. Fetch all other data, using the student's Airtable ID for precise queries.
  const [
    practicasRes,
    solicitudesRes,
    convocatoriasRes,
    lanzamientosRes
  ] = await Promise.all([
    fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [], `SEARCH('${legajo}', ARRAYJOIN({${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}}))`),
    isCorrector || !studentAirtableId
      ? Promise.resolve({ records: [], error: null })
      : fetchAllAirtableData<SolicitudPPSFields>(
          AIRTABLE_TABLE_NAME_PPS, 
          [], 
          `SEARCH('${legajo}', ARRAYJOIN({${FIELD_LEGAJO_PPS}}))`, 
          [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
        ),
    fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [], convocatoriasFormula),
    fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [], undefined, [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }])
  ]);
  
  const error = practicasRes.error || solicitudesRes.error || convocatoriasRes.error || lanzamientosRes.error;
  if (error) {
    const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
    throw new Error(`Error fetching data from Airtable: ${errorMsg}`);
  }

  // 4. Map raw records to structured data types
  const studentDetails = studentRecord?.fields ?? null;

  const gender = studentDetails?.[FIELD_GENERO_ESTUDIANTES];
  let userGender: UserGender = 'neutro';
  if (gender === 'Mujer') userGender = 'femenino';
  else if (gender === 'Varon') userGender = 'masculino';

  const practicas = practicasRes.records.map(r => ({ ...r.fields, id: r.id }));
  const solicitudes = solicitudesRes.records.map(r => ({ ...r.fields, id: r.id }));
  const myEnrollments = convocatoriasRes.records.map(r => ({ ...r.fields, id: r.id }));
  const allLanzamientos = lanzamientosRes.records.map(r => ({ ...r.fields, id: r.id }));

  // 5. Process and derive data (business logic)
  const selectedOrientacion = (studentDetails?.['Orientación Elegida'] as any) || "";
  const criterios = calculateCriterios(practicas, selectedOrientacion);

  const lanzamientos = allLanzamientos.filter(l => {
      const ppsName = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
      if (!(typeof ppsName === 'string' && ppsName.trim())) return false;
      if (isCorrector) return true;

      const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
      if (status === 'oculto') return false;

      const isEnrolled = myEnrollments.some(e => (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(l.id));
      if (isEnrolled) return true;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (status === 'abierta' || status === 'abierto') return true;
      
      const endDate = parseToUTCDate(l[FIELD_FECHA_FIN_LANZAMIENTOS]);
      if (endDate && endDate.getTime() >= today.getTime()) return true;

      if (status === 'cerrado' && endDate) {
          const gracePeriodEndDate = new Date(endDate.getTime());
          gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 7);
          if (today <= gracePeriodEndDate) return true;
      }
      
      return false;
  });

  const informeTasks: InformeTask[] = myEnrollments
    .map((enrollment): InformeTask | null => {
        const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
        const lanzamiento = allLanzamientos.find(l => l.id === lanzamientoId);
        
        const isSeleccionado = normalizeStringForComparison(enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado';

        if (!lanzamiento || !lanzamiento[FIELD_INFORME_LANZAMIENTOS] || !lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS] || !isSeleccionado) {
            return null;
        }

        // New, robust method: find by linked record
        let practicaVinculada = practicas.find(p => (p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0] === lanzamientoId);
        
        // Fallback to old method if no linked record is found
        if (!practicaVinculada) {
            practicaVinculada = practicas.find(p => {
                const ppsName = (p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as string[] | undefined)?.[0] ?? '';
                const practicaStartDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
                const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return normalizeStringForComparison(ppsName) === normalizeStringForComparison(lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]) &&
                       practicaStartDate?.getTime() === lanzamientoStartDate?.getTime();
            });
        }

        return {
            convocatoriaId: enrollment.id,
            ppsName: lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A',
            informeLink: lanzamiento[FIELD_INFORME_LANZAMIENTOS],
            fechaFinalizacion: lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
            informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
            nota: practicaVinculada?.[FIELD_NOTA_PRACTICAS] || 'Sin calificar',
        };
    })
    .filter((task): task is InformeTask => task !== null)
    .sort((a, b) => new Date(a.fechaFinalizacion).getTime() - new Date(b.fechaFinalizacion).getTime());

  // 6. Return clean, structured data object
  return {
    practicas,
    solicitudes,
    lanzamientos,
    myEnrollments,
    informeTasks,
    criterios,
    studentDetails,
    studentAirtableId,
    userGender
  };
};


/**
 * Fetches the list of selected students for a specific PPS launch.
 * This function is now more robust. It fetches all "seleccionado" students and then filters
 * them on the client side by the linked record ID, avoiding complex and unreliable Airtable formulas.
 */
export const fetchSeleccionados = async (lanzamientoId: string): Promise<GroupedSeleccionados | null> => {
    // Step 1: Fetch all convocatorias where the status is 'seleccionado'. This is a simple and reliable query.
    const formula = `LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado'`;

    const { records: allSeleccionados, error: convocatoriaError } = await fetchAllAirtableData<ConvocatoriaFields>(
      AIRTABLE_TABLE_NAME_CONVOCATORIAS,
      [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS],
      formula
    );

    if (convocatoriaError) {
        console.error("fetchSeleccionados: Error fetching convocatoria records:", convocatoriaError);
        throw new Error("No se pudo obtener la información de la convocatoria.");
    }
    
    // Step 2: Filter these records on the client-side to find those matching the specific lanzamientoId.
    const convocatoriaRecords = allSeleccionados.filter(record => 
        (record.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamientoId)
    );

    if (convocatoriaRecords.length === 0) {
        return null; // No selected students found for this launch.
    }

    // Step 3: Extract all unique student IDs and their corresponding horarios.
    const studentHorarioMap = new Map<string, string>();
    const studentIds = convocatoriaRecords.flatMap(record => (record.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []).map(studentId => {
      const horario = record.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
      studentHorarioMap.set(studentId, horario);
      return studentId;
    }));

    if (studentIds.length === 0) return null;

    // Step 4: Fetch details for all unique students.
    const uniqueStudentIds = [...new Set(studentIds)];
    const studentFormula = `OR(${uniqueStudentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    
    const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
      AIRTABLE_TABLE_NAME_ESTUDIANTES,
      [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
      studentFormula
    );

    if (studentError) {
      console.error("fetchSeleccionados: Error fetching student records:", studentError);
      throw new Error("No se pudo cargar la lista de estudiantes seleccionados.");
    }
    
    // Step 5: Map student details and group them by horario.
    const studentInfoList = studentRecords.map(student => ({
      nombre: student.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Nombre no encontrado',
      legajo: student.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      horario: studentHorarioMap.get(student.id) || 'Horario no especificado',
    }));

    return studentInfoList.reduce((acc, student) => {
      const { horario, ...rest } = student;
      if (!acc[horario]) acc[horario] = [];
      acc[horario].push(rest);
      return acc;
    }, {} as GroupedSeleccionados);
};