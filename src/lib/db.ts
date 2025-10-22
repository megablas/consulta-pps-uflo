import * as airtable from '../services/airtableService';
import { schema } from './airtableSchema';
import type { 
    EstudianteFields, PracticaFields, AuthUserFields, ConvocatoriaFields, 
    LanzamientoPPSFields, InstitucionFields, PenalizacionFields, SolicitudPPSFields, FinalizacionPPSFields,
    AirtableErrorResponse
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
        getAll: async (options?: { filterByFormula?: string; sort?: any[]; fields?: string[] }) => {
            const { records, error } = await airtable.fetchAllAirtableData<TAirtableFields>(_tableName, options?.fields || [], options?.filterByFormula, options?.sort);
            if (error) throw error;
            return records;
        },
        
        get: async (options?: { filterByFormula?: string; maxRecords?: number; sort?: any[] }) => {
             const { records, error } = await airtable.fetchAirtableData<TAirtableFields>(_tableName, [], options?.filterByFormula, options?.maxRecords, options?.sort);
            if (error) throw error;
            return records;
        },

        // WRITE operations use the field mapping for a better DX
        create: async (fields: DevFields<TSchema>) => {
            const { record: airtableRecord, error } = await airtable.createAirtableRecord<TAirtableFields>(_tableName, translateFieldsToAirtable(fields, tableSchema) as TAirtableFields);
            if (error) throw error;
            return airtableRecord;
        },

        update: async (recordId: string, fields: Partial<DevFields<TSchema>>) => {
            const { record: airtableRecord, error } = await airtable.updateAirtableRecord<TAirtableFields>(_tableName, recordId, translateFieldsToAirtable(fields, tableSchema) as Partial<TAirtableFields>);
            if (error) throw error;
            return airtableRecord;
        },

        updateMany: async (records: { id: string; fields: Partial<DevFields<TSchema>> }[]) => {
            const { records: updatedRecords, error } = await airtable.updateAirtableRecords<TAirtableFields>(
                _tableName,
                records.map(r => ({ id: r.id, fields: translateFieldsToAirtable(r.fields, tableSchema) as Partial<TAirtableFields> }))
            );
            if (error) throw error;
            return updatedRecords;
        },
        
        delete: async (recordId: string) => {
            const { success, error } = await airtable.deleteAirtableRecord(_tableName, recordId);
             if (error) throw error;
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
