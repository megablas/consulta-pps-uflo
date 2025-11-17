import { z } from 'zod';
import {
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOTAS_INTERNAS_ESTUDIANTES,
    FIELD_GENERO_ESTUDIANTES,
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_FECHA_FINALIZACION_ESTUDIANTES,

    FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_INSTITUCION_LINK_PRACTICAS,

    FIELD_LEGAJO_PPS,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_NOTAS_PPS,

    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS,
    FIELD_PLANTILLA_SEGURO_LANZAMIENTOS,
    FIELD_INFORME_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS,
    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
    FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS,
    FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS,

    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS,
    FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
    FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_ORIENTACION_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_LEGAJO_CONVOCATORIAS,
    FIELD_DNI_CONVOCATORIAS,
    FIELD_CORREO_CONVOCATORIAS,
    FIELD_FECHA_NACIMIENTO_CONVOCATORIAS,
    FIELD_TELEFONO_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_CERTIFICADO_CONVOCATORIAS,

    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_TELEFONO_INSTITUCIONES,
    FIELD_DIRECCION_INSTITUCIONES,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    FIELD_TUTOR_INSTITUCIONES,

    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_TIPO,
    FIELD_PENALIZACION_FECHA,
    FIELD_PENALIZACION_NOTAS,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_PENALIZACION_CONVOCATORIA_LINK,

    FIELD_ESTUDIANTE_FINALIZACION,

    FIELD_LEGAJO_AUTH,
    FIELD_NOMBRE_AUTH,
    FIELD_PASSWORD_HASH_AUTH,
    FIELD_SALT_AUTH,
    FIELD_ROLE_AUTH,
    FIELD_ORIENTACIONES_AUTH,

} from './constants';

export const ALL_ORIENTACIONES = ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'] as const;

export const estudianteFieldsSchema = z.object({
  [FIELD_LEGAJO_ESTUDIANTES]: z.coerce.string().optional(),
  [FIELD_NOMBRE_ESTUDIANTES]: z.string().optional(),
  [FIELD_NOMBRE_SEPARADO_ESTUDIANTES]: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  [FIELD_APELLIDO_SEPARADO_ESTUDIANTES]: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  [FIELD_GENERO_ESTUDIANTES]: z.enum(['Varon', 'Mujer', 'Otro']).optional().nullable(),
  [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_DNI_ESTUDIANTES]: z.number().optional().nullable(),
  [FIELD_FECHA_NACIMIENTO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_CORREO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_TELEFONO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: z.string().optional().nullable(),
  'Finalizaron': z.boolean().optional().nullable(),
  'Creada': z.string().optional().nullable(),
}).passthrough();

export const practicaFieldsSchema = z.object({
  [FIELD_NOMBRE_BUSQUEDA_PRACTICAS]: z.array(z.union([z.string(), z.number()])).optional(),
  [FIELD_ESTUDIANTE_LINK_PRACTICAS]: z.array(z.string()).optional(),
  [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  [FIELD_HORAS_PRACTICAS]: z.number().optional().nullable(),
  [FIELD_FECHA_INICIO_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_FECHA_FIN_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_ESTADO_PRACTICA]: z.string().optional().nullable(),
  [FIELD_ESPECIALIDAD_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_NOTA_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: z.array(z.string()).optional(),
  [FIELD_INSTITUCION_LINK_PRACTICAS]: z.array(z.string()).optional(),
}).passthrough();

export const solicitudPPSFieldsSchema = z.object({
    [FIELD_LEGAJO_PPS]: z.union([z.array(z.string()), z.array(z.number()), z.string(), z.number()]).optional().nullable(),
    [FIELD_EMPRESA_PPS_SOLICITUD]: z.string().optional().nullable(),
    [FIELD_ESTADO_PPS]: z.string().optional().nullable(),
    [FIELD_ULTIMA_ACTUALIZACION_PPS]: z.string().optional().nullable(),
    [FIELD_NOTAS_PPS]: z.string().optional().nullable(),
}).passthrough();

export const lanzamientoPPSFieldsSchema = z.object({
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_INICIO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_FIN_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_DIRECCION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_ORIENTACION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_PLANTILLA_SEGURO_LANZAMIENTOS]: z.array(z.any()).optional().nullable(),
    [FIELD_INFORME_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_ESTADO_GESTION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_NOTAS_GESTION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS]: z.boolean().optional().nullable(),
}).passthrough();

export const convocatoriaFieldsSchema = z.object({
    [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: z.array(z.string()).optional(),
    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: z.array(z.string()).optional(),
    [FIELD_FECHA_INICIO_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_FECHA_FIN_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_DIRECCION_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: z.union([z.number(), z.array(z.number())]).optional().nullable(),
    [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: z.union([z.number(), z.array(z.number())]).optional().nullable(),
    [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_ORIENTACION_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_OTRA_SITUACION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_LEGAJO_CONVOCATORIAS]: z.union([z.number(), z.array(z.number())]).optional().nullable(),
    [FIELD_DNI_CONVOCATORIAS]: z.union([z.number(), z.array(z.number())]).optional().nullable(),
    [FIELD_CORREO_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_TELEFONO_CONVOCATORIAS]: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: z.boolean().optional().nullable(),
    [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_CERTIFICADO_CONVOCATORIAS]: z.array(z.any()).optional().nullable(),
}).passthrough();

export const institucionFieldsSchema = z.object({
    [FIELD_NOMBRE_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_DIRECCION_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_TELEFONO_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_CONVENIO_NUEVO_INSTITUCIONES]: z.boolean().optional().nullable(),
    [FIELD_TUTOR_INSTITUCIONES]: z.string().optional().nullable(),
}).passthrough();

export const penalizacionFieldsSchema = z.object({
    [FIELD_PENALIZACION_ESTUDIANTE_LINK]: z.array(z.string()).optional(),
    [FIELD_PENALIZACION_TIPO]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_FECHA]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_NOTAS]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_PUNTAJE]: z.number().optional().nullable(),
    [FIELD_PENALIZACION_CONVOCATORIA_LINK]: z.array(z.string()).optional(),
}).passthrough();

export const finalizacionPPSFieldsSchema = z.object({
    [FIELD_ESTUDIANTE_FINALIZACION]: z.array(z.string()).optional(),
}).passthrough();

export const authUserFieldsSchema = z.object({
    [FIELD_LEGAJO_AUTH]: z.string().optional(),
    [FIELD_NOMBRE_AUTH]: z.string().optional(),
    [FIELD_PASSWORD_HASH_AUTH]: z.string().optional(),
    [FIELD_SALT_AUTH]: z.string().optional(),
    [FIELD_ROLE_AUTH]: z.union([z.string(), z.array(z.string())]).optional(),
    [FIELD_ORIENTACIONES_AUTH]: z.string().optional(),
}).passthrough();

// Schemas for array responses
const airtableRecord = <T extends z.ZodTypeAny>(fieldsSchema: T) => z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: fieldsSchema,
});

export const estudianteArraySchema = z.array(airtableRecord(estudianteFieldsSchema));
export const practicaArraySchema = z.array(airtableRecord(practicaFieldsSchema));
export const solicitudPPSArraySchema = z.array(airtableRecord(solicitudPPSFieldsSchema));
export const lanzamientoPPSArraySchema = z.array(airtableRecord(lanzamientoPPSFieldsSchema));
export const convocatoriaArraySchema = z.array(airtableRecord(convocatoriaFieldsSchema));
export const institucionArraySchema = z.array(airtableRecord(institucionFieldsSchema));
export const penalizacionArraySchema = z.array(airtableRecord(penalizacionFieldsSchema));
export const finalizacionPPSArraySchema = z.array(airtableRecord(finalizacionPPSFieldsSchema));
export const authUserArraySchema = z.array(airtableRecord(authUserFieldsSchema));