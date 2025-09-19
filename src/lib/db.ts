import * as airtable from '../services/airtableService';
import { schema } from './airtableSchema';
import type { 
    EstudianteFields, PracticaFields, AuthUserFields, ConvocatoriaFields, 
    LanzamientoPPSFields, InstitucionFields, PenalizacionFields, SolicitudPPSFields, FinalizacionPPSFields
} from '../types';

// A generic mapped type to extract developer-friendly field keys from a schema object
type DevFields<S> = {
  [K in keyof S as K extends '_tableName' ? never : K]?: any;
};

// Generic function to translate developer-friendly keys to Airtable field names
function translateFieldsToAirtable<TSchema extends object>(fields: Partial<DevFields<TSchema>>, tableSchema: TSchema): { [key: string]: any } {
    const airtableFields: { [key: string]: any } = {};
    const { _tableName, ...fieldMap } = tableSchema as any;

    for (const key in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
            const airtableKey = fieldMap[key];
            if (airtableKey) {
                airtableFields[airtableKey] = (fields as any)[key];
            } else {
                console.warn(`[DB] Key "${key}" not found in schema for table "${_tableName}". Passing it through directly.`);
                airtableFields[key] = (fields as any)[key];
            }
        }
    }
    return airtableFields;
}


// A factory function to create a typed interface for an Airtable table
function createTableInterface<TSchema extends { _tableName: string }, TAirtableFields extends object>(tableSchema: TSchema) {
    const { _tableName } = tableSchema;

    const service = {
        // READ operations pass through to airtableService but encapsulate the table name
        getAll: async (options?: { filterByFormula?: string; sort?: any[] }) => {
            const { records, error } = await airtable.fetchAllAirtableData<TAirtableFields>(_tableName, [], options?.filterByFormula, options?.sort);
            if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return records;
        },
        
        get: async (options?: { filterByFormula?: string; maxRecords?: number; sort?: any[] }) => {
             const { records, error } = await airtable.fetchAirtableData<TAirtableFields>(_tableName, [], options?.filterByFormula, options?.maxRecords, options?.sort);
            if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return records;
        },

        // WRITE operations use the field mapping for a better DX
        create: async (fields: DevFields<TSchema>) => {
            // FIX: Added type assertion to satisfy the generic constraint of TAirtableFields.
            const { record, error } = await airtable.createAirtableRecord<TAirtableFields>(_tableName, translateFieldsToAirtable(fields, tableSchema) as TAirtableFields);
            if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return record;
        },

        update: async (recordId: string, fields: Partial<DevFields<TSchema>>) => {
            // FIX: Added type assertion to satisfy the generic constraint of TAirtableFields.
            const { record, error } = await airtable.updateAirtableRecord<TAirtableFields>(_tableName, recordId, translateFieldsToAirtable(fields, tableSchema) as Partial<TAirtableFields>);
            if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return record;
        },

        updateMany: async (records: { id: string; fields: Partial<DevFields<TSchema>> }[]) => {
            const { records: updatedRecords, error } = await airtable.updateAirtableRecords<TAirtableFields>(
                _tableName,
                // FIX: Added type assertion to satisfy the generic constraint of TAirtableFields.
                records.map(r => ({ id: r.id, fields: translateFieldsToAirtable(r.fields, tableSchema) as Partial<TAirtableFields> }))
            );
            if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return updatedRecords;
        },
        
        delete: async (recordId: string) => {
            const { success, error } = await airtable.deleteAirtableRecord(_tableName, recordId);
             if (error) {
                const errorMsg = typeof error.error === 'string' ? error.error : error.error.message;
                throw new Error(errorMsg);
            }
            return success;
        },
    };
    return service;
}


// Export the db object with fully typed table interfaces
export const db = {
    estudiantes: createTableInterface<typeof schema.estudiantes, EstudianteFields>(schema.estudiantes),
    practicas: createTableInterface<typeof schema.practicas, PracticaFields>(schema.practicas),
    authUsers: createTableInterface<typeof schema.authUsers, AuthUserFields>(schema.authUsers),
    convocatorias: createTableInterface<typeof schema.convocatorias, ConvocatoriaFields>(schema.convocatorias),
    lanzamientos: createTableInterface<typeof schema.lanzamientos, LanzamientoPPSFields>(schema.lanzamientos),
    instituciones: createTableInterface<typeof schema.instituciones, InstitucionFields>(schema.instituciones),
    penalizaciones: createTableInterface<typeof schema.penalizaciones, PenalizacionFields>(schema.penalizaciones),
    solicitudes: createTableInterface<typeof schema.solicitudes, SolicitudPPSFields>(schema.solicitudes),
    finalizacion: createTableInterface<typeof schema.finalizacion, FinalizacionPPSFields>(schema.finalizacion),
};