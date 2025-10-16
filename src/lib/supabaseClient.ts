import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// ADVERTENCIA: Asegúrate de que RLS esté habilitado en tus tablas de Supabase
// si estas credenciales están expuestas en una aplicación de cliente.

if ((SUPABASE_URL as string) === 'https://tu-proyecto-url.supabase.co' || (SUPABASE_ANON_KEY as string) === 'tu_supabase_anon_key') {
    console.warn("Supabase credentials are not set in src/constants.ts. Supabase features will not work.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);