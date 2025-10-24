import { z } from 'zod';

// Single source of truth for orientations
export const ALL_ORIENTACIONES = ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'] as const;

// --- Reusable Zod types for common Airtable patterns ---
const optionalString = z.string().optional().nullable();
const optionalNumber = z.number().optional().nullable();
const optionalBoolean = z.boolean().optional().nullable();

// Preprocessor to safely convert any value to a string.
const stringFromAnything = z.preprocess(
  (val) => (val !== null && val !== undefined ? String(val) : null),
  z.string().nullable()
);

// Handles lookups (arrays of values) and single values gracefully by taking the first element.
const robustString = z.preprocess((val) => {
    const firstVal = Array.isArray(val) ? val.find(item => item != null) : val;
    return firstVal != null ? String(firstVal) : null;
}, optionalString);

const robustNumber = z.preprocess((val) => {
  const firstVal = Array.isArray(val) ? val.find(item => item != null) : val;
  if (firstVal === null || firstVal === undefined || firstVal === '') return null;
  const n = Number(firstVal);
  return isNaN(n) ? null : n;
}, optionalNumber);

// Handles linked records which can be undefined, null, a single string ID, or an array of string IDs.
const linkToRecord = z.preprocess((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(item => typeof item === 'string' && item.startsWith('rec'));
    if (typeof val === 'string' && val.startsWith('rec')) return [val];
    return [];
}, z.array(z.string()).optional());

// --- Main Schemas ---

export const estudianteFieldsSchema = z.object({
  'Legajo': stringFromAnything.optional(), // Made optional and converts numbers to strings
  'Nombre': optionalString, // Made optional to handle bad data
  'Nombre (Separado)': optionalString,
  'Apellido (Separado)': optionalString,
  'Género': z.enum(['Varon', 'Mujer', 'Otro']).optional().nullable(),
  'Orientación Elegida': z.enum(ALL_ORIENTACIONES).or(z.literal("")).optional().nullable(),
  'DNI': robustNumber,
  'Fecha de Nacimiento': optionalString,
  'Correo': optionalString,
  'Teléfono': optionalString,
  'Notas Internas': optionalString,
  'Fecha de Finalización': optionalString,
  'Finalizaron': optionalBoolean,
  'Creada': optionalString,
}).passthrough();

export const practicaFieldsSchema = z.object({
  'Legajo Busqueda': linkToRecord,
  'Estudiante Inscripto': linkToRecord,
  'Nombre (de Institución)': robustString,
  'Horas Realizadas': robustNumber,
  'Fecha de Inicio': optionalString,
  'Fecha de Finalización': optionalString,
  'Estado': robustString, // Changed to robustString
  'Especialidad': optionalString,
  'Nota': optionalString,
  'Lanzamiento Vinculado': linkToRecord,
  'Institución': linkToRecord,
}).passthrough();

export const solicitudPPSFieldsSchema = z.object({
    'Legajo': linkToRecord,
    'Nombre de la Institución': optionalString,
    'Estado de seguimiento': robustString, // Changed to robustString
    'Actualización': optionalString,
    'Notas': optionalString,
}).passthrough();

export const lanzamientoPPSFieldsSchema = z.object({
  'Nombre PPS': optionalString,
  'Fecha Inicio': optionalString,
  'Fecha Finalización': optionalString,
  'Dirección': optionalString,
  'Horario Seleccionado': optionalString,
  'Orientación': robustString,
  'Horas Acreditadas': robustNumber,
  'Cupos disponibles': robustNumber,
  'Estado de Convocatoria': optionalString,
  'Plazo Inscripción (días)': robustNumber,
  'Plantilla Seguro': z.array(z.object({ url: z.string() }).passthrough()).optional().nullable(),
  'Informe': optionalString,
  'Estado de Gestión': optionalString,
  'Notas de Gestión': optionalString,
  'Fecha de Relanzamiento': optionalString,
  'Teléfono (from Instituciones)': linkToRecord,
  'Permite Certificado': optionalBoolean,
}).passthrough();

export const convocatoriaFieldsSchema = z.object({
  'Lanzamiento Vinculado': linkToRecord,
  'Nombre PPS': robustString,
  'Estudiante Inscripto': linkToRecord,
  'Fecha Inicio': optionalString,
  'Fecha Finalización': optionalString,
  'Dirección': robustString,
  'Horario': optionalString,
  'Horas Acreditadas': robustNumber,
  'Cupos disponibles': robustNumber,
  'Estado': robustString,
  'Orientación': robustString,
  '¿Terminó de cursar?': optionalString,
  'Cursando Materias Electivas': optionalString,
  'Finales que adeuda': optionalString,
  'Otra situación académica': optionalString,
  'Legajo': robustNumber,
  'DNI': robustNumber,
  'Correo': robustString,
  'Fecha de Nacimiento': robustString,
  'Teléfono': robustString,
  'Informe Subido': optionalBoolean,
  'Fecha_Entrega_Informe': optionalString,
  'Certificado': z.array(z.object({ url: z.string() })).optional().nullable(),
}).passthrough();

export const institucionFieldsSchema = z.object({
    'Nombre': optionalString,
    'Teléfono': optionalString,
    'Dirección': optionalString,
    'Convenio Nuevo': optionalBoolean,
}).passthrough();

export const finalizacionPPSFieldsSchema = z.object({
    'Nombre': linkToRecord,
}).passthrough();

export const penalizacionFieldsSchema = z.object({
    'Estudiante': linkToRecord,
    'Tipo de Incumplimiento': optionalString,
    'Fecha del Incidente': optionalString,
    'Notas': optionalString,
    'Puntaje Penalización': robustNumber,
    'Convocatoria Afectada': linkToRecord,
}).passthrough();

// --- Schemas for full Airtable records (used for parsing arrays) ---
const airtableRecord = (fieldsSchema: z.ZodType) => z.object({ id: z.string(), createdTime: z.string(), fields: fieldsSchema });

export const estudianteSchema = airtableRecord(estudianteFieldsSchema);
export const practicaSchema = airtableRecord(practicaFieldsSchema);
export const solicitudPPSSchema = airtableRecord(solicitudPPSFieldsSchema);
export const lanzamientoPPSSchema = airtableRecord(lanzamientoPPSFieldsSchema);
export const convocatoriaSchema = airtableRecord(convocatoriaFieldsSchema);
export const institucionSchema = airtableRecord(institucionFieldsSchema);
export const penalizacionSchema = airtableRecord(penalizacionFieldsSchema);
export const finalizacionPPSSchema = airtableRecord(finalizacionPPSFieldsSchema);

// --- Schemas for arrays of records ---
export const estudianteArraySchema = z.array(estudianteSchema);
export const practicaArraySchema = z.array(practicaSchema);
export const solicitudPPSArraySchema = z.array(solicitudPPSSchema);
export const lanzamientoPPSArraySchema = z.array(lanzamientoPPSSchema);
export const convocatoriaArraySchema = z.array(convocatoriaSchema);
export const institucionArraySchema = z.array(institucionSchema);
export const penalizacionArraySchema = z.array(penalizacionSchema);
export const finalizacionPPSArraySchema = z.array(finalizacionPPSSchema);