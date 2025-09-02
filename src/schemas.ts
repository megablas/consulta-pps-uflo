import { z } from 'zod';

// A flexible schema for Airtable lookup fields which can return string, number, or arrays of them, or be empty.
// It preprocesses the value to handle objects or arrays of non-primitives by stringifying them,
// preventing validation errors from unexpected complex data structures.
const flexibleLookupSchema = z.preprocess(
    (val) => {
        if (val === null || val === undefined) return null;
        if (Array.isArray(val)) {
            const isPrimitiveArray = val.every(
                item => typeof item === 'string' || typeof item === 'number' || item === null || item === undefined
            );
            if (isPrimitiveArray) {
                return val.filter(item => item !== null && item !== undefined);
            }
            return val.map(String).join(', ');
        }
        if (typeof val === 'object') {
            return String(val);
        }
        return val;
    },
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number()]))
    ]).optional().nullable()
);


// A robust schema for fields that should be strings but might be other primitive types from Airtable,
// including lookups that return as single-element or multi-element arrays.
const robustStringSchema = z.preprocess(
    (val) => {
        if (Array.isArray(val)) {
            // Filter out null/undefined, convert each item to string, then join.
            return val
                .filter(item => item !== null && item !== undefined)
                .map(String) // This will handle objects by converting them to "[object Object]" instead of failing on .join
                .join(', ');
        }
        return val !== null && val !== undefined ? String(val) : null;
    },
    z.string().optional().nullable()
);

// A robust schema for fields that should be numbers but might be strings or lookups from Airtable.
// It safely attempts to convert values to numbers before validation.
const robustNumberSchema = z.preprocess(
  (val) => {
    let firstVal = val;
    if (Array.isArray(val)) {
        // Find the first non-null/undefined value in the array
        firstVal = val.find(item => item !== null && item !== undefined);
    }
    // If it's empty, null, or undefined after potentially picking from an array, treat as null.
    if (firstVal === null || firstVal === undefined || firstVal === '') return null;
    
    const n = Number(firstVal);
    return isNaN(n) ? null : n;
  },
  z.number().optional().nullable()
);


// Schema for 'Solicitud de PPS'
export const solicitudPPSFieldsSchema = z.object({
  'Legajo': flexibleLookupSchema,
  'Estado de seguimiento': robustStringSchema,
  'Nombre de la Institución': robustStringSchema,
  'Nombre Busqueda': robustStringSchema,
  'Notas': robustStringSchema,
  'Actualización': robustStringSchema, // Date is a string
}).catchall(z.any());
export const solicitudPPSSchema = z.object({
  id: z.string(),
  fields: solicitudPPSFieldsSchema,
});
export const solicitudPPSArraySchema = z.array(solicitudPPSSchema);

// Schema for 'Prácticas'
export const practicaFieldsSchema = z.object({
    'Legajo Busqueda': flexibleLookupSchema,
    'Nombre (de Institución)': flexibleLookupSchema,
    'Horas Realizadas': robustNumberSchema,
    'Fecha de Inicio': robustStringSchema,
    'Fecha de Finalización': robustStringSchema,
    'Estado': robustStringSchema,
    'Especialidad': robustStringSchema,
    'Nota': robustStringSchema,
    'Lanzamiento Vinculado': z.array(z.string()).optional().nullable(),
    'Estudiante Inscripto': z.array(z.string()).optional().nullable(),
}).catchall(z.any());
export const practicaSchema = z.object({
  id: z.string(),
  fields: practicaFieldsSchema,
});
export const practicaArraySchema = z.array(practicaSchema);

// Schema for 'Estudiantes'
export const estudianteFieldsSchema = z.object({
  'Legajo': robustStringSchema,
  'Nombre': robustStringSchema,
  'Nombre (Separado)': robustStringSchema,
  'Apellido (Separado)': robustStringSchema,
  'Género': z.enum(['Varon', 'Mujer', 'Otro']).optional().nullable(),
  'Orientación Elegida': robustStringSchema,
  'DNI': robustNumberSchema,
  'Fecha de Nacimiento': robustStringSchema,
  'Correo': robustStringSchema,
  'Teléfono': robustStringSchema,
  'Notas Internas': robustStringSchema,
}).catchall(z.any());
export const estudianteSchema = z.object({
    id: z.string(),
    fields: estudianteFieldsSchema
});


// Schema for 'Lanzamientos de PPS'
export const lanzamientoPPSFieldsSchema = z.object({
  'Nombre PPS': robustStringSchema,
  'Fecha de Inicio': robustStringSchema,
  'Fecha de Finalización': robustStringSchema,
  'Dirección': robustStringSchema,
  'Horario Seleccionado': robustStringSchema,
  'Orientación': robustStringSchema,
  'Horas Acreditadas': robustNumberSchema,
  'Cupos disponibles': robustNumberSchema,
  'Estado de Convocatoria': robustStringSchema,
  'Plazo Inscripción (días)': robustNumberSchema,
  'Plantilla Seguro': z.array(z.object({ url: z.string() }).catchall(z.any())).optional().nullable(),
  'Informe': robustStringSchema,
  'Estado de Gestión': robustStringSchema,
  'Notas de Gestión': robustStringSchema,
  'Fecha de Relanzamiento': robustStringSchema,
  'Teléfono (from Instituciones)': flexibleLookupSchema,
}).catchall(z.any());
export const lanzamientoPPSSchema = z.object({
    id: z.string(),
    fields: lanzamientoPPSFieldsSchema,
});
export const lanzamientoPPSArraySchema = z.array(lanzamientoPPSSchema);


// Schema for 'Convocatorias'
export const convocatoriaFieldsSchema = z.object({
  'Lanzamiento Vinculado': z.array(z.string()).optional().nullable(),
  'Nombre PPS': robustStringSchema,
  'Estudiante Inscripto': z.array(z.string()).optional().nullable(),
  'Nombre (de Estudiante Inscripto)': flexibleLookupSchema,
  'Fecha de Inicio': robustStringSchema,
  'Fecha de Finalización': robustStringSchema,
  'Dirección': robustStringSchema,
  'Horario': robustStringSchema,
  'Horas Acreditadas': robustNumberSchema,
  'Cupos disponibles': robustNumberSchema,
  'Estado de Convocatoria': robustStringSchema,
  'Estado': robustStringSchema,
  'Orientación': robustStringSchema,
  '¿Terminó de cursar?': robustStringSchema,
  'Cursando Materias Electivas': robustStringSchema,
  'Finales que adeuda': robustStringSchema,
  'Otra situación académica': robustStringSchema,
  'DNI': robustNumberSchema,
  'Correo': robustStringSchema,
  'Fecha de Nacimiento': robustStringSchema,
  'Teléfono': robustStringSchema,
  'Legajo': robustNumberSchema,
  'Informe Subido': z.boolean().optional().nullable(),
  'Fecha_Entrega_Informe': robustStringSchema,
}).catchall(z.any());
export const convocatoriaSchema = z.object({
    id: z.string(),
    fields: convocatoriaFieldsSchema,
});
export const convocatoriaArraySchema = z.array(convocatoriaSchema);

// Schema for 'Finalizacion PPS'
export const finalizacionPPSFieldsSchema = z.object({
  'Estudiante': z.array(z.string()).optional().nullable(),
}).catchall(z.any());

export const finalizacionPPSSchema = z.object({
  id: z.string(),
  createdTime: z.string(),
  fields: finalizacionPPSFieldsSchema,
});

export const finalizacionPPSArraySchema = z.array(finalizacionPPSSchema);