import { z } from 'zod';
import type { AirtableResponse, AirtableErrorResponse, AirtableRecord } from '../types';
import { AIRTABLE_PAT, AIRTABLE_BASE_ID, IS_PREVIEW_MODE } from '../constants';

// --- IMPLEMENTATION 1: Direct Client-Side API Calls (for Preview Mode) ---

const clientFetchDataGeneric = async <T>(tableName: string, queryParams?: URLSearchParams): Promise<{ data: AirtableResponse<T> | null, error: AirtableErrorResponse | null }> => {
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || AIRTABLE_PAT.includes('pat...')) {
        const errorMessage = 'Las credenciales de Airtable no están configuradas. Por favor, añádelas a tu archivo .env para probar la aplicación.';
        return { data: null, error: { error: { type: 'CONFIG_ERROR', message: errorMessage } } };
    }
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    if (queryParams) queryParams.forEach((value, key) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${response.statusText}` } }));
            return { data: null, error: errorData };
        }
        return { data: await response.json(), error: null };
    } catch (e: any) {
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: e.message || 'Error de red.' } } };
    }
};

const clientPostDataGeneric = async (method: 'POST' | 'PATCH' | 'DELETE', tableName: string, body?: any, recordId?: string): Promise<{ data: any | null, error: AirtableErrorResponse | null }> => {
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
        return { data: null, error: { error: { type: 'CONFIG_ERROR', message: 'Credenciales no configuradas.' } } };
    }
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
    if (recordId) url += `/${recordId}`;

    try {
        const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : null });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}` } }));
            return { data: null, error: errorData };
        }
        if (response.status === 204 || response.headers.get('content-length') === '0') return { data: { success: true }, error: null };
        return { data: await response.json(), error: null };
    } catch (e: any) {
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: e.message } } };
    }
};

// --- IMPLEMENTATION 2: Serverless Proxy API Calls (for Vercel/Production) ---

const proxyFetchDataGeneric = async <T>(tableName: string, queryParams?: URLSearchParams): Promise<{ data: AirtableResponse<T> | null, error: AirtableErrorResponse | null }> => {
    const url = new URL('/api/airtable-proxy', window.location.origin);
    url.searchParams.set('table', tableName);
    if (queryParams) queryParams.forEach((value, key) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url.toString());
        const data = await response.json();
        if (!response.ok) return { data: null, error: { error: data } };
        return { data: data as AirtableResponse<T>, error: null };
    } catch (e: any) {
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: e.message || 'Error de red con el proxy.' } } };
    }
};

const proxyPostDataGeneric = async (method: 'POST' | 'PATCH' | 'DELETE', tableName: string, body?: any, recordId?: string): Promise<{ data: any | null, error: AirtableErrorResponse | null }> => {
    let url = `/api/airtable-proxy?table=${encodeURIComponent(tableName)}`;
    if (recordId) url += `&recordId=${recordId}`;

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : null });
        const data = await response.json();
        if (!response.ok) return { data: null, error: { error: data } };
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: e.message } } };
    }
};

// --- UNIFIED API (Switches based on environment) ---

const fetchDataGeneric = IS_PREVIEW_MODE ? clientFetchDataGeneric : proxyFetchDataGeneric;
const postDataGeneric = IS_PREVIEW_MODE ? clientPostDataGeneric : proxyPostDataGeneric;

const createAirtableRecord = async <TFields>(tableName: string, fields: TFields) => {
    const body = { records: [{ fields }] };
    const { data, error } = await postDataGeneric('POST', tableName, body);
    if (error || !data?.records?.[0]) {
        return { record: null, error: error || { error: { type: 'CREATE_FAILED', message: 'La creación del registro falló.' } } };
    }
    return { record: data.records[0] as AirtableRecord<TFields>, error: null };
};

const updateAirtableRecord = async <TFields>(tableName: string, recordId: string, fields: Partial<TFields>) => {
    const { data, error } = await postDataGeneric('PATCH', tableName, { fields }, recordId);
    return { record: data as AirtableRecord<TFields> | null, error };
};

const updateAirtableRecords = async <TFields>(tableName: string, records: { id: string; fields: Partial<TFields> }[]) => {
    const { data, error } = await postDataGeneric('PATCH', tableName, { records });
    return { records: data?.records as AirtableRecord<TFields>[] | null, error };
};

const fetchAllAirtableData = async <TFields>(
    tableName: string,
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
    fields: string[] = [],
    filterByFormula?: string,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    const allRecords: AirtableRecord<TFields>[] = [];
    let offset: string | undefined = undefined;

    const baseParams = new URLSearchParams();
    fields.forEach(field => baseParams.append('fields[]', field));
    if (filterByFormula) baseParams.set('filterByFormula', filterByFormula);
    if (sort) sort.forEach((s, i) => {
        baseParams.append(`sort[${i}][field]`, s.field);
        baseParams.append(`sort[${i}][direction]`, s.direction);
    });
    
    // The proxy handles pagination itself if `fetchAll` is true.
    if (!IS_PREVIEW_MODE) {
        baseParams.set('fetchAll', 'true');
        const { data, error } = await fetchDataGeneric<TFields>(tableName, baseParams);
        if (error || !data) {
            return { records: [], error };
        }
        const validationResult = zodSchema.safeParse(data.records);
         if (!validationResult.success) {
            console.error(`[Zod Validation Error in ${tableName}]:`, JSON.stringify(validationResult.error.issues, null, 2));
            const formattedErrors = validationResult.error.issues.map(issue => `  - Item #${String(issue.path[0])}, Campo '${issue.path.slice(1).join('.')}': ${issue.message}`).join('\n');
            const validationError: AirtableErrorResponse = { error: { type: 'ZOD_VALIDATION_ERROR', message: `Los datos recibidos para "${tableName}" no tienen el formato esperado.\nDetalles:\n${formattedErrors}` } };
            return { records: [], error: validationError };
        }
        return { records: validationResult.data, error: null };
    }

    // Client-side pagination logic for preview mode
    try {
        do {
            const currentParams = new URLSearchParams(baseParams);
            if (offset) currentParams.set('offset', offset);
            const { data, error } = await fetchDataGeneric<TFields>(tableName, currentParams);
            if (error || !data) return { records: [], error: error || { error: { type: 'PAGINATION_ERROR', message: 'Error durante la paginación.' } } };
            allRecords.push(...data.records);
            offset = data.offset;
        } while (offset);

        const validationResult = zodSchema.safeParse(allRecords);
        if (!validationResult.success) {
            console.error(`[Zod Validation Error in ${tableName}]:`, JSON.stringify(validationResult.error.issues, null, 2));
            const formattedErrors = validationResult.error.issues.map(issue => `  - Item #${String(issue.path[0])}, Campo '${issue.path.slice(1).join('.')}': ${issue.message}`).join('\n');
            return { records: [], error: { error: { type: 'ZOD_VALIDATION_ERROR', message: `Los datos para "${tableName}" no tienen el formato esperado.\n${formattedErrors}` } } };
        }
        return { records: validationResult.data, error: null };
    } catch (e: any) {
        return { records: [], error: { error: { type: 'FETCH_ALL_ERROR', message: e.message } } };
    }
};


const fetchAirtableData = async <TFields>(
    tableName: string, 
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
    fields: string[] = [], 
    filterByFormula?: string,
    maxRecords?: number,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    
    const params = new URLSearchParams();
    fields.forEach(field => params.append('fields[]', field));
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (maxRecords) params.set('maxRecords', maxRecords.toString());
    if (sort) sort.forEach((s, i) => {
        params.append(`sort[${i}][field]`, s.field);
        params.append(`sort[${i}][direction]`, s.direction);
    });
    
    const { data, error } = await fetchDataGeneric<TFields>(tableName, params);
    if (error || !data) {
        return { records: [], error };
    }

    const validationResult = zodSchema.safeParse(data.records);
    if (!validationResult.success) {
        console.error(`[Zod Validation Error in ${tableName}]:`, JSON.stringify(validationResult.error.issues, null, 2));
        const formattedErrors = validationResult.error.issues.map(issue => `  - Item #${String(issue.path[0])}, Campo '${issue.path.slice(1).join('.')}': ${issue.message}`).join('\n');
        return { records: [], error: { error: { type: 'ZOD_VALIDATION_ERROR', message: `Los datos para "${tableName}" no tienen el formato esperado.\n${formattedErrors}` } } };
    }

    return { records: validationResult.data, error: null };
};

const deleteAirtableRecord = async (tableName: string, recordId: string) => {
    const { data, error } = await postDataGeneric('DELETE', tableName, null, recordId);
    return { success: !!data?.success, error };
};

export {
    createAirtableRecord,
    updateAirtableRecord,
    updateAirtableRecords,
    fetchAllAirtableData,
    fetchAirtableData,
    deleteAirtableRecord,
};