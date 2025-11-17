import { db } from '../lib/db';
import type {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask,
  EstudianteFields,
  ConvocatoriaFields,
  GroupedSeleccionados,
  Orientacion,
  AirtableRecord,
} from '../types';
import {
// FIX: Import missing table name constants.
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
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
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_EMPRESA_PPS_SOLICITUD,
  FIELD_ESTADO_PPS,
  FIELD_NOTAS_PPS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_DIRECCION_LANZAMIENTOS,
  IS_PREVIEW_MODE,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate, formatDate } from '../utils/formatters';
import { fetchAllAirtableData } from './airtableService'; // Import generic fetcher
import { convocatoriaArraySchema, estudianteArraySchema } from '../schemas';

// --- MOCK DATA FOR TESTING USER ---
const mockStudentDetails: EstudianteFields = {
  [FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [FIELD_NOMBRE_ESTUDIANTES]: 'Admin de Prueba',
  'Orientación Elegida': 'Clinica',
  'DNI': 99999999,
  'Correo': 'testing@uflo.edu.ar',
  'Teléfono': '1122334455',
  [FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
    { id: 'p_mock_1', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 100, [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Hospital de Simulación', [FIELD_FECHA_INICIO_PRACTICAS]: '2023-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-07-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '8' },
    { id: 'p_mock_2', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80, [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Escuela de Prueba', [FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-11-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '9' },
    { id: 'p_mock_3', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 70, [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Empresa Ficticia S.A.', [FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-07-01', [FIELD_ESTADO_PRACTICA]: 'En curso', [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' },
];

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [FIELD_EMPRESA_PPS_SOLICITUD]: 'ONG Desarrollo Social', [FIELD_ESTADO_PPS]: 'En conversaciones', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-10', [FIELD_NOTAS_PPS]: 'Se envió correo para coordinar una reunión.' },
    { id: 'sol_mock_2', [FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora de RRHH', [FIELD_ESTADO_PPS]: 'Convenio Realizado', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-04-20', [FIELD_NOTAS_PPS]: 'Convenio firmado, se procederá a crear el lanzamiento.' },
];

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'ONG Desarrollo Social', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Comunitaria', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta' },
    { id: 'lanz_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Empresa Ficticia S.A.', [FIELD_ORIENTACION_LANZAMIENTOS]: 'Laboral', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado' },
];

// --- DATA FETCHING FUNCTIONS ---

export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null }> => {
    if (IS_PREVIEW_MODE && legajo === '99999') {
        return { studentDetails: mockStudentDetails, studentAirtableId: 'rec_mock_student_99999' };
    }

    const { records, error } = await fetchAllAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        estudianteArraySchema,
        undefined, // Fetch all fields for the student
        `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`
    );

    if (error) {
        throw new Error(typeof error.error === 'string' ? error.error : error.error.message);
    }
    const studentRecord = records[0];
    return {
        studentDetails: studentRecord ? studentRecord.fields : null,
        studentAirtableId: studentRecord ? studentRecord.id : null,
    };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
    if (IS_PREVIEW_MODE && legajo === '99999') {
        return mockPracticas; // Return mock data for the test user
    }

    // For real users, fetch from Airtable
    const filterByFormula = `SEARCH('${legajo}', {${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} & '')`;
    // FIX: The `db.practicas.getAll` method returns records directly or throws on error.
    // It does not return an object with `records` and `error` properties.
    try {
        const records = await db.practicas.getAll({ filterByFormula });
        return records.map(r => ({ ...(r.fields as any), id: r.id }));
    } catch (e: any) {
        console.error("Error fetching practicas:", e);
        throw new Error('Error al cargar las prácticas.');
    }
};

export const fetchSolicitudes = async (legajo: string, studentAirtableId: string | null): Promise<SolicitudPPS[]> => {
    if (IS_PREVIEW_MODE && legajo === '99999') {
        return mockSolicitudes; // Return mock data for the test user
    }
    // For real users, fetch from Airtable
    const filterByFormula = `{${FIELD_LEGAJO_PPS}} = '${legajo}'`;
    // FIX: The `db.solicitudes.getAll` method returns records directly or throws on error.
    // It does not return an object with `records` and `error` properties.
    try {
        const records = await db.solicitudes.getAll({ 
            filterByFormula,
            sort: [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
        });
        return records.map(r => ({ ...(r.fields as any), id: r.id }));
    } catch (e: any) {
        console.error("Error fetching solicitudes:", e);
        throw new Error('Error al cargar las solicitudes.');
    }
};

export const fetchConvocatoriasData = async (legajo: string, studentAirtableId: string | null, isSuperUser: boolean): Promise<{
    lanzamientos: LanzamientoPPS[];
    myEnrollments: Convocatoria[];
    allLanzamientos: LanzamientoPPS[];
    institutionAddressMap: Map<string, string>;
}> => {
    if (IS_PREVIEW_MODE && legajo === '99999') {
        const addressMap = new Map<string, string>();
        mockLanzamientos.forEach(l => {
            const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (name) {
                addressMap.set(normalizeStringForComparison(name), 'Dirección de Prueba 123');
            }
        });
        return { 
            lanzamientos: mockLanzamientos, 
            myEnrollments: [], 
            allLanzamientos: mockLanzamientos,
            institutionAddressMap: addressMap,
        };
    }
    
    // For real users
    try {
        const [lanzamientosRes, convocatoriasRes, institucionesRes] = await Promise.all([
            db.lanzamientos.getAll({ sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }] }),
            studentAirtableId ? db.convocatorias.getAll({ filterByFormula: `RECORD_ID(ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}})) = '${studentAirtableId}'` }) : Promise.resolve([]),
            db.instituciones.getAll({ fields: [FIELD_NOMBRE_INSTITUCIONES, FIELD_DIRECCION_INSTITUCIONES] })
        ]);
        
        const myEnrollments = convocatoriasRes.map(r => ({ ...r.fields, id: r.id } as Convocatoria));
        const allLanzamientos = lanzamientosRes.map(r => ({ ...r.fields, id: r.id } as LanzamientoPPS));

        const institutionAddressMap = new Map<string, string>();
        institucionesRes.forEach(inst => {
            const name = inst.fields[FIELD_NOMBRE_INSTITUCIONES];
            const address = inst.fields[FIELD_DIRECCION_INSTITUCIONES];
            if (name && address) {
                institutionAddressMap.set(normalizeStringForComparison(name as string), address as string);
            }
        });
        
        // The visibility logic is now the same for all users: show everything that is not 'Oculto'.
        // The UI components will handle role-specific actions (like editing or enrolling).
        const lanzamientosParaMostrar = allLanzamientos.filter(l => {
            const estado = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
            return estado !== 'oculto';
        });
        
        return { 
            lanzamientos: lanzamientosParaMostrar,
            myEnrollments,
            allLanzamientos,
            institutionAddressMap,
        };
    } catch (e: any) {
        console.error('Error fetching convocatorias data:', e);
        throw new Error('No se pudo cargar la información de las convocatorias.');
    }
};


export const fetchSeleccionados = async (lanzamiento: LanzamientoPPS): Promise<GroupedSeleccionados | null> => {
    const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
    const startDate = lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS];

    if (!ppsName || !startDate) {
        console.warn('fetchSeleccionados called without a PPS name or start date in the lanzamiento object.');
        return null;
    }

    const escapedPpsName = ppsName.replace(/'/g, "\\'");
    // Use ARRAYJOIN and SEARCH for robust lookup field matching
    const formula = `AND(
        LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = "seleccionado",
        SEARCH('${escapedPpsName}', ARRAYJOIN({${FIELD_NOMBRE_PPS_CONVOCATORIAS}})),
        DATETIME_FORMAT({${FIELD_FECHA_INICIO_CONVOCATORIAS}}, 'YYYY-MM-DD') = '${startDate}'
    )`;
    
    const { records: convocatorias, error: convError } = await fetchAllAirtableData<ConvocatoriaFields>(
        AIRTABLE_TABLE_NAME_CONVOCATORIAS, 
        convocatoriaArraySchema,
        [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS],
        formula
    );

    if (convError || convocatorias.length === 0) {
        return null;
    }

    const studentIds = convocatorias.flatMap(c => c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []);
    if (studentIds.length === 0) return null;

    const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        estudianteArraySchema,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        studentFormula
    );

    if (studentError || studentRecords.length === 0) return null;

    const studentMap = new Map(studentRecords.map(r => [r.id, r.fields]));
    const grouped: GroupedSeleccionados = {};

    convocatorias.forEach(conv => {
        const studentId = (conv.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        if (!studentId) return;

        const student = studentMap.get(studentId);
        if (!student) return;
        
        const horario = conv.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
        if (!grouped[horario]) {
            grouped[horario] = [];
        }
        grouped[horario].push({
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
            legajo: String(student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A')
        });
    });

    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return Object.keys(grouped).length > 0 ? grouped : null;
};