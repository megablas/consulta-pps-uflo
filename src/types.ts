import {
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_REVISADO_CONVENIO_2025_INSTITUCIONES,
} from "./constants";

export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface SolicitudPPSFields {
  [key: string]: any; // Allow other fields
  'Legajo'?: string | number | boolean | (string|number)[]; // Changed to flexible lookup type
  'Estado de seguimiento'?: string;
  'Nombre de la Institución'?: string;
  'Nombre Busqueda'?: string; // Lookup field
  'Notas'?: string;
  'Actualización'?: string; // Date string
}

export interface PracticaFields {
  [key:string]: any; // Allow other fields
  'Legajo Busqueda'?: string | number | boolean | (string | number)[]; // Lookup field, can be array of strings or numbers
  'Nombre (de Institución)'?: string | number | boolean | (string | number)[]; // Lookup field
  'Horas Realizadas'?: number;
  'Fecha de Inicio'?: string; // Date string
  'Fecha de Finalización'?: string; // Date string
  'Estado'?: string;
  'Especialidad'?: string;
  'Nota'?: string;
}

export interface EstudianteFields {
  [key: string]: any;
  'Legajo'?: string;
  'Nombre'?: string;
  'Nombre (Separado)'?: string;
  'Apellido (Separado)'?: string;
  'Género'?: 'Varon' | 'Mujer' | 'Otro';
  'Orientación Elegida'?: string;
  'DNI'?: number;
  'Fecha de Nacimiento'?: string; // Date string
  'Correo'?: string;
  'Teléfono'?: string;
  'Notas Internas'?: string;
  'Fecha de Finalización'?: string; // Date string
  'Finalizaron'?: boolean;
  'Creada'?: string;
}

export interface AuthUserFields {
  [key: string]: any;
  'Legajo'?: string;
  'Nombre'?: string;
  'PasswordHash'?: string;
  'Salt'?: string;
  'Role'?: 'Jefe' | 'SuperUser';
  'Orientaciones'?: string; // Comma-separated list
}

export interface LanzamientoPPSFields {
  [key: string]: any;
  'Nombre PPS'?: string;
  'Fecha de Inicio'?: string;
  'Fecha de Finalización'?: string;
  'Dirección'?: string;
  'Horario Seleccionado'?: string;
  'Orientación'?: string;
  'Horas Acreditadas'?: number;
  'Cupos disponibles'?: number;
  'Estado de Convocatoria'?: string;
  'Plazo Inscripción (días)'?: number;
  'Plantilla Seguro'?: { url: string }[];
  'Informe'?: string; // Link to report submission
  'Estado de Gestión'?: string;
  'Notas de Gestión'?: string;
  'Fecha de Relanzamiento'?: string; // Date string for confirmed relaunches
  'Teléfono (from Instituciones)'?: string | number | boolean | (string | number)[]; // Lookup from Instituciones table
}

export interface InstitucionFields {
  [key: string]: any;
  'Nombre'?: string;
  'Teléfono'?: string;
  [FIELD_CONVENIO_NUEVO_INSTITUCIONES]?: boolean;
  [FIELD_REVISADO_CONVENIO_2025_INSTITUCIONES]?: boolean;
}

export interface ConvocatoriaFields {
  [key: string]: any;
  'Lanzamiento Vinculado'?: string[]; // Link to Lanzamientos de PPS record
  'Nombre PPS'?: string;
  'Estudiante Inscripto'?: string[]; // Array of record IDs from 'Estudiante Inscripto'
  'Nombre (de Estudiante Inscripto)'?: string | number | boolean | (string | number)[]; // Lookup field from Estudiante
  'Fecha de Inicio'?: string; // Date string
  'Fecha de Finalización'?: string; // Date string
  'Dirección'?: string;
  'Horario'?: string; // Text field to store selected schedule(s)
  'Horas Acreditadas'?: number;
  'Cupos disponibles'?: number;
  'Estado de Convocatoria'?: string; // e.g. 'Abierta', 'Cerrada'
  'Estado'?: string; // e.g., 'No seleccionado', 'Seleccionado', 'Inscripto'
  'Orientación'?: string;
  // FIX: Made '¿Terminó de cursar?' optional to align with schema and usage, resolving multiple type errors.
  '¿Terminó de cursar?'?: string;
  'Cursando Materias Electivas'?: string;
  'Finales que adeuda'?: string;
  'Otra situación académica'?: string;
  'DNI'?: number;
  'Correo'?: string;
  'Fecha de Nacimiento'?: string;
  'Teléfono'?: string;
  'Legajo'?: number;
  'Informe Subido'?: boolean;
  'Fecha_Entrega_Informe'?: string;
}

export interface SolicitudPPS extends SolicitudPPSFields {
  id: string; // Added for React keys
}

export interface Practica extends PracticaFields {
  id: string; // Added for React keys
}

export interface LanzamientoPPS extends LanzamientoPPSFields {
  id: string;
}

export interface Convocatoria extends ConvocatoriaFields {
  id: string;
}

export interface FinalizacionPPSFields {
  [key: string]: any;
  'Estudiante'?: string[];
}

export interface FinalizacionPPS extends FinalizacionPPSFields {
    id: string;
    createdTime: string;
}

export enum Orientacion {
  CLINICA = "Clinica",
  LABORAL = "Laboral",
  EDUCACIONAL = "Educacional",
  COMUNITARIA = "Comunitaria", // Assuming this might be one of the 4 for rotation
  OTRA = "Otra"
}

export const ALL_ORIENTACIONES: Orientacion[] = [
  Orientacion.CLINICA,
  Orientacion.LABORAL,
  Orientacion.EDUCACIONAL,
  Orientacion.COMUNITARIA
];


export interface CriteriosCalculados {
  horasTotales: number;
  horasFaltantes250: number;
  cumpleHorasTotales: boolean;
  horasOrientacionElegida: number;
  horasFaltantesOrientacion: number;
  cumpleHorasOrientacion: boolean;
  orientacionesCursadasCount: number;
  orientacionesUnicas: string[];
  cumpleRotacion: boolean;
}

export interface ModalInfo {
  title: string;
  message: string;
}

// For SeleccionadosModal
export interface SelectedStudent {
  nombre: string;
  legajo: string;
}

export interface GroupedSeleccionados {
  [horario: string]: SelectedStudent[];
}

// For Airtable API responses
export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

export interface AirtableErrorObject {
  type: string;
  message: string;
}

export interface AirtableErrorResponse {
  error: AirtableErrorObject | string; // Airtable sometimes returns a string error
}

// For the new "Informes" feature
export interface InformeTask {
    convocatoriaId: string;
    practicaId?: string;
    ppsName: string;
    informeLink: string;
    fechaFinalizacion: string;
    informeSubido: boolean;
    nota?: string;
    fechaEntregaInforme?: string;
}

// For the new "Corrección de Informes" feature
export interface InformeCorreccionStudent {
  studentId: string;
  studentName: string;
  convocatoriaId: string;
  practicaId?: string;
  informeSubido: boolean;
  nota: string;
  lanzamientoId: string;
  orientacion?: string;
  fechaInicio?: string;
  fechaFinalizacionPPS?: string;
  fechaEntregaInforme?: string;
}

export interface InformeCorreccionPPS {
  lanzamientoId: string;
  ppsName: string;
  orientacion: string;
  students: InformeCorreccionStudent[];
  informeLink?: string;
  fechaFinalizacion?: string;
}

// For the new "Correccion Rapida" feature
export interface FlatCorreccionStudent extends InformeCorreccionStudent {
  ppsName: string;
  informeLink?: string;
  correctionDeadline?: string;
}

// Tab identifier for the student dashboard
export type TabId = 'convocatorias' | 'informes' | 'solicitudes' | 'practicas' | 'profile';

// Gender identifier for personalization
export type UserGender = 'masculino' | 'femenino' | 'neutro';

export interface ExecutiveReportData {
    period: {
        current: { start: string, end: string },
        previous: { start: string, end: string },
    };
    summary: string;
    kpis: {
        activeStudents: { current: number, previous: number };
        studentsWithoutPpsExcludingRelevamiento: { current: number, previous: number };
        studentsWithoutAnyPps: { current: number, previous: number };
        finishedStudents: { current: number, previous: number };
        newStudents: { current: number, previous: number };
        newPpsLaunches: { current: number, previous: number };
        totalOfferedSpots: { current: number, previous: number };
        newAgreements: { current: number, previous: number };
    };
// FIX: Added 'date' and 'orientation' to the ppsLaunchedInPeriod type to match the data structure created in useExecutiveReportData.ts, fixing errors in PrintableExecutiveReport.tsx.
    ppsLaunchedInPeriod: { name: string; spots: number; date: string; orientation: string; }[];
    newAgreementsList: string[];
}