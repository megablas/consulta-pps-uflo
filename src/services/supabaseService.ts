import { supabase } from '../lib/supabaseClient';
import { mapAirtableToSupabase, airtableToSupabaseMapping } from '../lib/schemaMapping';
import type { AirtableRecord } from '../types';

/**
 * Sincroniza un único registro de Airtable con Supabase.
 * Realiza un 'upsert': crea el registro si no existe, o lo actualiza si ya existe.
 * La existencia se determina por el 'airtable_record_id'.
 * @param airtableTableName - El nombre de la tabla en Airtable (e.g., 'Estudiantes').
 * @param airtableRecord - El objeto de registro completo de Airtable (incluyendo id y fields).
 */
export const syncRecord = async (airtableTableName: string, airtableRecord: AirtableRecord<any>) => {
    if (!airtableToSupabaseMapping[airtableTableName]) {
        console.warn(`[Supabase Sync] Skipping table "${airtableTableName}" as it has no mapping.`);
        return;
    }

    const { supabaseTable, supabaseData } = mapAirtableToSupabase(
        airtableTableName,
        airtableRecord.fields,
        airtableRecord.id
    );

    const { error } = await supabase
        .from(supabaseTable)
        .upsert(supabaseData, { onConflict: 'airtable_record_id' });

    if (error) {
        console.error(`[Supabase Sync Error] Failed to upsert record ${airtableRecord.id} into ${supabaseTable}:`, error);
        throw error;
    }
};

/**
 * Elimina un registro en Supabase basado en su Airtable Record ID.
 * @param airtableTableName - El nombre de la tabla en Airtable (e.g., 'Estudiantes').
 * @param airtableRecordId - El ID del registro de Airtable que fue eliminado.
 */
export const deleteRecord = async (airtableTableName: string, airtableRecordId: string) => {
    const mapping = airtableToSupabaseMapping[airtableTableName];
    if (!mapping) {
        console.warn(`[Supabase Sync] Skipping delete for table "${airtableTableName}" as it has no mapping.`);
        return;
    }

    const { supabaseTable } = mapping;

    const { error } = await supabase
        .from(supabaseTable)
        .delete()
        .eq('airtable_record_id', airtableRecordId);

    if (error) {
        console.error(`[Supabase Sync Error] Failed to delete record ${airtableRecordId} from ${supabaseTable}:`, error);
        throw error;
    }
};