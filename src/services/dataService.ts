import { db } from '../lib/db';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask,
  EstudianteFields,
  GroupedSeleccionados,
  Orientacion
} from '../types';
import {
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_INFORME_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_LANZAMIENTOS, 
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
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
  // FIX: Added missing constants
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_EMPRESA_PPS_SOLICITUD,
  FIELD_ESTADO_PPS,
  FIELD_NOTAS_PPS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_DIRECCION_LANZAMIENTOS,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';

// --- MOCK DATA FOR TESTING USER ---
const mockStudentDetails: EstudianteFields = {
  [FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [FIELD_NOMBRE_ESTUDIANTES]: 'Usuario de Prueba',
  'Orientación Elegida': 'Clinica',
  'DNI': 12345678,
  'Correo': 'testing@uflo.edu.ar',
  'Teléfono': '1122334455',
  [FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
  { id: 'prac_mock_1', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Hospital Central', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 120, [FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-12-15', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '9' },
  { id: 'prac_mock_2', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Colegio San Martín', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-07-15', [FIELD_ESTADO_PRACTICA]: 'En curso' },
  { id: 'prac_mock_3', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Empresa Tech Solutions', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 50, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-10-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada' },
];

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora Global', [FIELD_ESTADO_PPS]: 'En conversaciones', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-20', [FIELD_NOTAS_PPS]: 'Se contactó para coordinar entrevista.' }
];

const today = new Date();
const startDateCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
const endDateCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hogar de Ancianos "Amanecer"', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Comunitaria', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Fundación "Crecer Juntos"', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Educacional', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-15', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_calendar', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'PPS para Calendario (Test)', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Clinica', [FIELD_FECHA_INICIO_LANZAMIENTOS]: startDateCurrentMonth, [FIELD_FECHA_FIN_LANZAMIENTOS]: endDateCurrentMonth, [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [FIELD_DIRECCION_LANZAMIENTOS]: 'Venezuela 1501, Cipolletti, Río Negro' },
];

const mockMyEnrollments: Convocatoria[] = [
    { id: 'conv_mock_1', [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_mock_2'], [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15' },
    { id: 'conv_mock_calendar', [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_mock_calendar'], [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: 'Martes y Jueves 14 a 18hs' }
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

  if (!studentRecord || !(studentRecord.fields as any)[FIELD_LEGAJO_ESTUDIANTES] || !(studentRecord.fields as any)[FIELD_NOMBRE_ESTUDIANTES]) {
    return { studentDetails: null, studentAirtableId: null };
  }
  
  return { studentDetails: studentRecord.fields as EstudianteFields, studentAirtableId: studentRecord.id };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockPracticas);
  }

  const records = await db.practicas.getAll({ filterByFormula: `SEARCH('${legajo}', {${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} & '')` });
  return records.map(r => ({ ...(r.fields as any), id: r.id }));
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

  return records.map(r => ({ ...(r.fields as any), id: r.id }));
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

  const convocatoriaFields = [
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  ];

  const [convocatoriasRecords, lanzamientosRecords, institutionsRecords] = await Promise.all([
      db.convocatorias.getAll({ filterByFormula: formula, fields: convocatoriaFields }),
      db.lanzamientos.getAll({ sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }] }),
      db.instituciones.getAll()
  ]);
  
  const myEnrollments = convocatoriasRecords.map(r => ({ ...(r.fields as any), id: r.id }));
  const allLanzamientosRecords = lanzamientosRecords.map(r => ({ ...(r.fields as any), id: r.id }));
  
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

export const fetchSeleccionados = async (lanzamiento: LanzamientoPPS): Promise<GroupedSeleccionados | null> => {
    if (lanzamiento.id === 'lanz_mock_2') {
        return Promise.resolve({'Turno Mañana': [{ nombre: 'Ana Rodriguez', legajo: '99901' }, { nombre: 'Carlos Gomez', legajo: '99902' }], 'Turno Tarde': [{ nombre: 'Lucia Fernandez', legajo: '99903' }]});
    }

    const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
    const startDate = lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS];

    if (!ppsName || !startDate) {
        console.warn('fetchSeleccionados called without a PPS name or start date in the lanzamiento object.');
        return null;
    }
    
    const escapedPpsName = ppsName.replace(/'/g, "\\'");
    const formula = `AND(LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = 'seleccionado', {${FIELD_NOMBRE_PPS_CONVOCATORIAS}} = '${escapedPpsName}', DATETIME_FORMAT({${FIELD_FECHA_INICIO_CONVOCATORIAS}}, 'YYYY-MM-DD') = '${startDate}')`;
    const convocatoriasRecords = await db.convocatorias.getAll({ filterByFormula: formula, fields: [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS] });

    if (convocatoriasRecords.length === 0) return null;

    const studentIds = [...new Set(convocatoriasRecords.flatMap(c => c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []))];
    if (studentIds.length === 0) return null;

    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const studentRecords = await db.estudiantes.getAll({ filterByFormula: studentFormula, fields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES] });
    
    const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));

    const grouped: GroupedSeleccionados = {};
    convocatoriasRecords.forEach(convRecord => {
        const studentId = (convRecord.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        const student = studentId ? studentMap.get(studentId) : null;
        
        if (student) {
            const horario = convRecord.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
            if (!grouped[horario]) grouped[horario] = [];
            grouped[horario].push({ nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' });
        }
    });
    
    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    if (Object.keys(grouped).length === 0) return null;

    return grouped;
};

function getLookupName(fieldValue: any): string | null {
    if (Array.isArray(fieldValue)) return typeof fieldValue[0] === 'string' ? fieldValue[0] : null;
    return typeof fieldValue === 'string' ? fieldValue : null;
}

function findLanzamientoForConvocatoria(convocatoria: Convocatoria, lanzamientosMap: Map<string, LanzamientoPPS>, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    const linkedId = (convocatoria[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
    if (linkedId && lanzamientosMap.has(linkedId)) return lanzamientosMap.get(linkedId);

    const convPpsName = getLookupName(convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS]);
    const convStartDate = parseToUTCDate(convocatoria[FIELD_FECHA_INICIO_CONVOCATORIAS]);
    if (!convPpsName || !convStartDate) return undefined;

    const normalizedConvName = normalizeStringForComparison(convPpsName);
    let bestMatch: LanzamientoPPS | undefined;
    let smallestDaysDiff = 32;

    for (const lanzamiento of allLanzamientos) {
        const lanzamientoName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        
        if (!lanzamientoName || !lanzamientoStartDate || normalizeStringForComparison(lanzamientoName) !== normalizedConvName) continue;

        const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff < smallestDaysDiff) {
            smallestDaysDiff = daysDiff;
            bestMatch = lanzamiento;
        }
    }
    return bestMatch;
}

function findLanzamientoForPractica(practica: Practica, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    const linkedId = (practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] as string[] | undefined)?.[0];
    if (linkedId) return allLanzamientos.find(l => l.id === linkedId);

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

export const processInformeTasks = (myEnrollments: Convocatoria[], practicas: Practica[], allLanzamientos: LanzamientoPPS[]): InformeTask[] => {
    const lanzamientosMap = new Map(allLanzamientos.map(l => [l.id, l]));
    const informeTasks: InformeTask[] = [];
    const processedForInforme = new Set<string>();

    const selectedEnrollments = myEnrollments.filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado');
    for (const enrollment of selectedEnrollments) {
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

    const finalizadaStatuses = ['finalizada', 'pps realizada', 'convenio realizado'];
    for (const practica of practicas) {
        const pps = findLanzamientoForPractica(practica, allLanzamientos);
        if (pps) {
            const estadoPractica = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
            if (finalizadaStatuses.includes(estadoPractica) && pps[FIELD_INFORME_LANZAMIENTOS] && !processedForInforme.has(pps.id)) {
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
    
    informeTasks.sort((a, b) => {
        const aIsPending = !a.informeSubido;
        const bIsPending = !b.informeSubido;
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;

        const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
        const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
        return dateA - dateB;
    });

    return informeTasks;
};