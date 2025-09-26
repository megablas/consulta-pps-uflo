import React, { useState } from 'react';
import Card from './Card';
import { fetchAllAirtableData } from '../services/airtableService';
import { airtableToSupabaseMapping, mapAirtableToSupabase } from '../lib/schemaMapping';
import { supabase } from '../lib/supabaseClient';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    AIRTABLE_TABLE_NAME_AUTH_USERS, 
    AIRTABLE_TABLE_NAME_PRACTICAS,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_AUTH,
} from '../constants';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type TableSyncState = {
    status: SyncStatus;
    message: string;
};

const tablesToSync = [
    AIRTABLE_TABLE_NAME_ESTUDIANTES,
    AIRTABLE_TABLE_NAME_AUTH_USERS,
    AIRTABLE_TABLE_NAME_PRACTICAS,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
];

const SyncManager: React.FC = () => {
    const [syncState, setSyncState] = useState<Record<string, TableSyncState>>(() =>
        Object.fromEntries(tablesToSync.map(name => [name, { status: 'idle', message: 'Pendiente' }]))
    );
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    
    const handleSyncTable = async (tableName: string) => {
        setSyncState(prev => ({ ...prev, [tableName]: { status: 'syncing', message: 'Iniciando...' } }));

        try {
            setSyncState(prev => ({ ...prev, [tableName]: { status: 'syncing', message: 'Obteniendo datos de Airtable...' } }));
            
            const { records, error: fetchError } = await fetchAllAirtableData(tableName);
            if (fetchError) throw new Error(`Error en Airtable: ${typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message}`);
            
            if (records.length === 0) {
                setSyncState(prev => ({ ...prev, [tableName]: { status: 'success', message: 'No se encontraron registros para sincronizar.' } }));
                return;
            }

            let validRecords = records;
            let skippedCount = 0;
            let skipReason = '';

            // Data validation and filtering before mapping
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                const originalCount = records.length;
                validRecords = records.filter(record => {
                    const legajo = record.fields[FIELD_LEGAJO_ESTUDIANTES];
                    return legajo != null && String(legajo).trim() !== '';
                });
                skippedCount = originalCount - validRecords.length;
                if (skippedCount > 0) skipReason = 'por tener legajo vacío';
            } else if (tableName === AIRTABLE_TABLE_NAME_AUTH_USERS) {
                const originalCount = records.length;
                validRecords = records.filter(record => {
                    const nombre = record.fields[FIELD_NOMBRE_AUTH];
                    return nombre != null && String(nombre).trim() !== '';
                });
                skippedCount = originalCount - validRecords.length;
                if (skippedCount > 0) skipReason = 'por tener nombre vacío';
            }
            
            if (validRecords.length === 0) {
                 const message = skippedCount > 0 
                    ? `Se omitieron ${skippedCount} registros ${skipReason}. No quedaron registros válidos para sincronizar.`
                    : 'No se encontraron registros para sincronizar.';
                setSyncState(prev => ({ ...prev, [tableName]: { status: 'success', message } }));
                return;
            }

            const mappingMessage = skippedCount > 0
                ? `Mapeando ${validRecords.length} registros (se omitieron ${skippedCount} ${skipReason})...`
                : `Mapeando ${validRecords.length} registros...`;

            setSyncState(prev => ({ ...prev, [tableName]: { status: 'syncing', message: mappingMessage } }));
            
            const supabaseRecords = validRecords.map(record => {
                return mapAirtableToSupabase(tableName, record.fields, record.id).supabaseData;
            });

            const { supabaseTable } = airtableToSupabaseMapping[tableName];

            setSyncState(prev => ({ ...prev, [tableName]: { status: 'syncing', message: `Enviando a Supabase (${supabaseTable})...` } }));
            
            const CHUNK_SIZE = 500;
            for (let i = 0; i < supabaseRecords.length; i += CHUNK_SIZE) {
                const chunk = supabaseRecords.slice(i, i + CHUNK_SIZE);
                const { error: upsertError } = await supabase.from(supabaseTable).upsert(chunk, { onConflict: 'airtable_record_id' });
                if (upsertError) throw new Error(`Error en Supabase: ${upsertError.message}`);
            }

            setSyncState(prev => ({ ...prev, [tableName]: { status: 'success', message: `Éxito: ${validRecords.length} registros sincronizados.` } }));

        } catch (error: any) {
            setSyncState(prev => ({ ...prev, [tableName]: { status: 'error', message: `Error: ${error.message}` } }));
            // Re-throw to stop the "Sync All" process
            throw error;
        }
    };

    const handleSyncAll = async () => {
         if (!window.confirm('Esta acción sincronizará todos los datos de Airtable a Supabase, sobrescribiendo los datos existentes. ¿Estás seguro de que quieres continuar?')) {
            return;
        }
        
        setIsSyncingAll(true);
        for (const tableName of tablesToSync) {
            try {
                await handleSyncTable(tableName);
            } catch (error) {
                console.error(`Fallo la sincronización para la tabla ${tableName}, deteniendo el proceso.`, error);
                break; // Stop on first error
            }
        }
        setIsSyncingAll(false);
    }

    const getStatusVisuals = (status: SyncStatus) => {
        switch (status) {
            case 'syncing': return { icon: 'sync', color: 'text-blue-500 animate-spin' };
            case 'success': return { icon: 'check_circle', color: 'text-emerald-500' };
            case 'error': return { icon: 'error', color: 'text-rose-500' };
            default: return { icon: 'hourglass_empty', color: 'text-slate-400' };
        }
    };

    return (
        <Card
            icon="sync_alt"
            title="Sincronización con Supabase"
            description="Herramienta para forzar la sincronización de datos desde Airtable (fuente de verdad) hacia Supabase. Puedes sincronizar tablas individualmente o todas en secuencia."
        >
            <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700">
                <div className="flex justify-end mb-6">
                     <button
                        onClick={handleSyncAll}
                        disabled={isSyncingAll}
                        className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 shadow-md hover:bg-blue-700 hover:-translate-y-px flex items-center gap-2 justify-center disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        <span className="material-icons">sync</span>
                        <span>{isSyncingAll ? 'Sincronizando Todo...' : 'Sincronizar Todo'}</span>
                    </button>
                </div>
                <div className="space-y-4">
                    {tablesToSync.map(tableName => {
                        const { status, message } = syncState[tableName];
                        const { icon, color } = getStatusVisuals(status);
                        const isTableSyncing = status === 'syncing';
                        
                        return (
                            <div key={tableName} className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <span className={`material-icons ${color}`}>{icon}</span>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{tableName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSyncTable(tableName)}
                                    disabled={isSyncingAll || isTableSyncing}
                                    className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                                >
                                    Sincronizar
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default SyncManager;
