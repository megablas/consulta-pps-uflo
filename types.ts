export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface SolicitudPPSFields {
  [key: string]: any; // Allow other fields
  'Legajo'?: string;
  'Estado de seguimiento'?: string;
  'Nombre de la Institución'?: string;
  'Nombre Busqueda'?: string; // Lookup field
  'Notas'?: string;
  'Actualización'?: string; // Date string
}

export interface PracticaFields {
  [key:string]: any; // Allow other fields
  'Nombre busqueda'?: string[]; // Lookup field, can be array
  'Nombre (de Institución)'?: string[]; // Lookup field
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
  'DNI'?: string;
  'Fecha de Nacimiento'?: string; // Date string
  'Correo'?: string;
  'Teléfono'?: string;
}

export interface AuthUserFields {
  [key: string]: any;
  'Legajo'?: string;
  'Nombre'?: string;
  'PasswordHash'?: string;
  'Salt'?: string;
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
}

export interface InstitucionFields {
  [key: string]: any;
  'Nombre'?: string;
}

export interface ConvocatoriaFields {
  [key: string]: any;
  'Lanzamiento Vinculado'?: string[]; // Link to Lanzamientos de PPS record
  'Nombre PPS'?: string;
  'Estudiante Inscripto'?: string[]; // Array of record IDs from 'Estudiante Inscripto'
  'Nombre (de Estudiante Inscripto)'?: string[]; // Lookup field from Estudiante
  'Fecha de Inicio'?: string; // Date string
  'Fecha de Finalización'?: string; // Date string
  'Dirección'?: string;
  'Horario'?: string; // Text field to store selected schedule(s)
  'Horas Acreditadas'?: number;
  'Cupos disponibles'?: number;
  'Estado de Convocatoria'?: string; // e.g. 'Abierta', 'Cerrada'
  'Estado'?: string; // e.g. 'No seleccionado', 'Seleccionado', 'Inscripto'
  'Orientación'?: string;
  '¿Terminó de cursar?'?: string;
  'Cursando Materias Electivas'?: string;
  'Finales que adeuda'?: string;
  'Otra situación académica'?: string;
  'DNI'?: string;
  'Correo'?: string;
  'Fecha de Nacimiento'?: string;
  'Teléfono'?: string;
  'Legajo'?: number;
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