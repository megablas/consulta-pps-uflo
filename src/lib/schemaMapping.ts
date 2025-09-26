import {
  AIRTABLE_TABLE_NAME_AUTH_USERS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES, FIELD_GENERO_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOTAS_INTERNAS_ESTUDIANTES, FIELD_FECHA_FINALIZACION_ESTUDIANTES,
  FIELD_LEGAJO_AUTH, FIELD_NOMBRE_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_ROLE_AUTH, FIELD_ORIENTACIONES_AUTH,
  FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_ESPECIALIDAD_PRACTICAS, FIELD_NOTA_PRACTICAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS,
  FIELD_NOMBRE_INSTITUCIONES, FIELD_TELEFONO_INSTITUCIONES, FIELD_DIRECCION_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_ESTADO_GESTION_LANZAMIENTOS, FIELD_NOTAS_GESTION_LANZAMIENTOS, FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS
} from "../constants";

// --- TRANSFORMATION HELPERS ---

const getFirst = (value: any): any => (Array.isArray(value) ? value[0] : value);
const toString = (value: any): string | null => {
    const singleValue = getFirst(value);
    return singleValue != null ? String(singleValue) : null;
};
const toNumber = (value: any): number | null => {
    const singleValue = getFirst(value);
    if (singleValue == null || singleValue === '') return null;
    const num = Number(singleValue);
    return isNaN(num) ? null : num;
};
const toBoolean = (value: any): boolean | null => {
    const singleValue = getFirst(value);
    if (singleValue == null) return null;
    return singleValue === true;
};
const toIsoDate = (value: any): string | null => {
    const dateStr = toString(value);
    if (!dateStr) return null;
    const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
        return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.split('T')[0];
    }
    return null;
};
const toArray = (value: any): string[] | null => {
    if (value == null) return null;
    return Array.isArray(value) ? value : [String(value)];
}
const toSingleId = (value: any): string | null => {
    if (value == null) return null;
    return Array.isArray(value) ? value[0] : String(value);
}

// --- SCHEMA MAPPING DEFINITION ---

export const airtableToSupabaseMapping: { [key: string]: { supabaseTable: string; fields: { [key: string]: { supabaseKey: string; transform: (value: any) => any; } } } } = {
    [AIRTABLE_TABLE_NAME_ESTUDIANTES]: {
        supabaseTable: 'students',
        fields: {
            [FIELD_LEGAJO_ESTUDIANTES]: { supabaseKey: 'legajo', transform: toString },
            [FIELD_NOMBRE_ESTUDIANTES]: { supabaseKey: 'nombre_completo', transform: toString },
            [FIELD_NOMBRE_SEPARADO_ESTUDIANTES]: { supabaseKey: 'nombre', transform: toString },
            [FIELD_APELLIDO_SEPARADO_ESTUDIANTES]: { supabaseKey: 'apellido', transform: toString },
            [FIELD_GENERO_ESTUDIANTES]: { supabaseKey: 'genero', transform: toString },
            [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: { supabaseKey: 'orientacion_elegida', transform: toString },
            [FIELD_DNI_ESTUDIANTES]: { supabaseKey: 'dni', transform: toNumber },
            [FIELD_FECHA_NACIMIENTO_ESTUDIANTES]: { supabaseKey: 'fecha_nacimiento', transform: toIsoDate },
            [FIELD_CORREO_ESTUDIANTES]: { supabaseKey: 'correo', transform: toString },
            [FIELD_TELEFONO_ESTUDIANTES]: { supabaseKey: 'telefono', transform: toString },
            [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: { supabaseKey: 'notas_internas', transform: toString },
            'Finalizaron': { supabaseKey: 'finalizaron', transform: toBoolean },
            [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: { supabaseKey: 'fecha_finalizacion', transform: toIsoDate },
            'Creada': { supabaseKey: 'fecha_creacion_airtable', transform: toIsoDate },
        }
    },
    [AIRTABLE_TABLE_NAME_AUTH_USERS]: {
        supabaseTable: 'auth_users',
        fields: {
            [FIELD_LEGAJO_AUTH]: { supabaseKey: 'legajo', transform: toString },
            [FIELD_NOMBRE_AUTH]: { supabaseKey: 'nombre', transform: toString },
            [FIELD_PASSWORD_HASH_AUTH]: { supabaseKey: 'password_hash', transform: toString },
            [FIELD_SALT_AUTH]: { supabaseKey: 'salt', transform: toString },
            [FIELD_ROLE_AUTH]: { supabaseKey: 'role', transform: getFirst },
            [FIELD_ORIENTACIONES_AUTH]: { supabaseKey: 'orientaciones', transform: toString },
        }
    },
    [AIRTABLE_TABLE_NAME_PRACTICAS]: {
        supabaseTable: 'practices',
        fields: {
            [FIELD_ESTUDIANTE_LINK_PRACTICAS]: { supabaseKey: 'student_airtable_ids', transform: toArray },
            [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: { supabaseKey: 'launch_airtable_ids', transform: toArray },
            [FIELD_HORAS_PRACTICAS]: { supabaseKey: 'horas_realizadas', transform: toNumber },
            [FIELD_FECHA_INICIO_PRACTICAS]: { supabaseKey: 'fecha_inicio', transform: toIsoDate },
            [FIELD_FECHA_FIN_PRACTICAS]: { supabaseKey: 'fecha_fin', transform: toIsoDate },
            [FIELD_ESTADO_PRACTICA]: { supabaseKey: 'estado', transform: toString },
            [FIELD_ESPECIALIDAD_PRACTICAS]: { supabaseKey: 'especialidad', transform: toString },
            [FIELD_NOTA_PRACTICAS]: { supabaseKey: 'nota', transform: toString },
        }
    },
    [AIRTABLE_TABLE_NAME_INSTITUCIONES]: {
        supabaseTable: 'institutions',
        fields: {
            [FIELD_NOMBRE_INSTITUCIONES]: { supabaseKey: 'nombre', transform: toString },
            [FIELD_TELEFONO_INSTITUCIONES]: { supabaseKey: 'telefono', transform: toString },
            [FIELD_DIRECCION_INSTITUCIONES]: { supabaseKey: 'direccion', transform: toString },
            [FIELD_CONVENIO_NUEVO_INSTITUCIONES]: { supabaseKey: 'convenio_nuevo', transform: toBoolean },
        }
    },
    [AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS]: {
        supabaseTable: 'launches',
        fields: {
            [FIELD_NOMBRE_PPS_LANZAMIENTOS]: { supabaseKey: 'nombre_pps', transform: toString },
            [FIELD_FECHA_INICIO_LANZAMIENTOS]: { supabaseKey: 'fecha_inicio', transform: toIsoDate },
            [FIELD_FECHA_FIN_LANZAMIENTOS]: { supabaseKey: 'fecha_fin', transform: toIsoDate },
            [FIELD_ORIENTACION_LANZAMIENTOS]: { supabaseKey: 'orientacion', transform: toString },
            [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: { supabaseKey: 'horas_acreditadas', transform: toNumber },
            [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: { supabaseKey: 'cupos_disponibles', transform: toNumber },
            [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: { supabaseKey: 'estado_convocatoria', transform: toString },
            [FIELD_ESTADO_GESTION_LANZAMIENTOS]: { supabaseKey: 'estado_gestion', transform: toString },
            [FIELD_NOTAS_GESTION_LANZAMIENTOS]: { supabaseKey: 'notas_gestion', transform: toString },
            [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: { supabaseKey: 'fecha_relanzamiento', transform: toIsoDate },
        }
    },
    [AIRTABLE_TABLE_NAME_CONVOCATORIAS]: {
        supabaseTable: 'enrollments',
        fields: {
            [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: { supabaseKey: 'student_airtable_id', transform: toSingleId },
            [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: { supabaseKey: 'launch_airtable_id', transform: toSingleId },
            [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: { supabaseKey: 'estado', transform: toString },
            [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: { supabaseKey: 'horario_seleccionado', transform: toString },
            [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: { supabaseKey: 'informe_subido', transform: toBoolean },
            [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: { supabaseKey: 'fecha_entrega_informe', transform: toIsoDate },
            [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: { supabaseKey: 'termino_cursar', transform: toString },
            [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: { supabaseKey: 'cursando_electivas', transform: toString },
            [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: { supabaseKey: 'finales_adeuda', transform: toString },
            [FIELD_OTRA_SITUACION_CONVOCATORIAS]: { supabaseKey: 'otra_situacion_academica', transform: toString },
        }
    }
};

/**
 * Transforms an Airtable record into an object ready to be inserted/updated in Supabase.
 * @param airtableTableName - The name of the table in Airtable (e.g., 'Estudiantes').
 * @param airtableFields - The `fields` object from the Airtable record.
 * @param recordId - The Airtable record ID.
 * @returns An object with the Supabase table name and the transformed data.
 */
export const mapAirtableToSupabase = (
    airtableTableName: string,
    airtableFields: { [key: string]: any },
    recordId: string
): { supabaseTable: string; supabaseData: { [key: string]: any } } => {
    const mapping = airtableToSupabaseMapping[airtableTableName];
    if (!mapping) {
        throw new Error(`Mapping not found for Airtable table: ${airtableTableName}`);
    }

    const supabaseData: { [key: string]: any } = {
        airtable_record_id: recordId, // Crucial field for synchronization
    };

    for (const airtableKey in airtableFields) {
        const fieldMapping = mapping.fields[airtableKey];
        if (fieldMapping) {
            const transformedValue = fieldMapping.transform(airtableFields[airtableKey]);
            supabaseData[fieldMapping.supabaseKey] = transformedValue;
        }
    }
    
    return { supabaseTable: mapping.supabaseTable, supabaseData };
};
