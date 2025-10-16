import { AIRTABLE_PAT, AIRTABLE_BASE_ID } from '../constants';
import type { AirtableResponse, AirtableErrorResponse, AirtableRecord } from '../types';

const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Función centralizada para construir la URL correcta según el entorno
function constructUrl(tableName: string, recordId?: string, queryParams?: URLSearchParams): string {
    const pathSegments = [AIRTABLE_BASE_ID, encodeURIComponent(tableName)];
    if (recordId) {
        pathSegments.push(recordId);
    }
    const path = pathSegments.join('/');
    
    if (isDevelopment) {
        // En desarrollo, usamos el proxy de Vite
        const viteProxyUrl = `/airtable-api/v0/${path}`;
        return queryParams ? `${viteProxyUrl}?${queryParams.toString()}` : viteProxyUrl;
    } else {
        // En producción, usamos la función serverless de Vercel
        const prodParams = new URLSearchParams(queryParams);
        prodParams.set('airtablePath', path);
        return `/api/airtable-proxy?${prodParams.toString()}`;
    }
}

const fetchDataGeneric = async <T>(url: string): Promise<{ data: AirtableResponse<T> | null, error: AirtableErrorResponse | null }> => {
    try {
        const fetchOptions: RequestInit = {};
        // En desarrollo, el proxy de Vite no añade la autorización, así que la añadimos aquí.
        // En producción, la función serverless de Vercel añade la autorización, así que no la necesitamos en el cliente.
        if (isDevelopment) {
            fetchOptions.headers = { 'Authorization': `Bearer ${AIRTABLE_PAT}` };
        }
        
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData: AirtableErrorResponse;
            try {
                const jsonError = await response.json();
                errorData = jsonError as AirtableErrorResponse; 
                if (typeof errorData.error !== 'object' && typeof errorData.error !== 'string') {
                     errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${response.statusText}. Response not a valid error JSON.` }};
                }
            } catch (e) {
                const textError = await response.text().catch(() => "Could not read error response body.");
                errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError}` } };
            }
            console.error('[fetchDataGeneric] Airtable API Error:', response.status, JSON.stringify(errorData), "URL:", url);
            return { data: null, error: errorData };
        }
        
        const textResponse = await response.text();
        if (!textResponse) {
            return { data: { records: [] }, error: null };
        }

        try {
            const jsonData = JSON.parse(textResponse) as AirtableResponse<T>;
            return { data: { records: jsonData.records || [], offset: jsonData.offset }, error: null };
        } catch (jsonParseError) {
            console.error('[fetchDataGeneric] JSON Parse Error:', jsonParseError, "Response Text:", textResponse);
            return { data: null, error: { error: { type: 'JSON_PARSE_ERROR', message: 'La respuesta del servidor no pudo ser procesada (JSON inválido).' } } };
        }

    } catch (networkError) {
        console.error('[fetchDataGeneric] Network or Fetch Error:', networkError, "URL:", url);
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet. Si el problema persiste, intenta desactivar extensiones del navegador (ej: bloqueadores de anuncios).' } } };
    }
}

const postDataGeneric = async <TFields>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: any): Promise<{ data: any | null, error: AirtableErrorResponse | null }> => {
    try {
        const fetchOptions: RequestInit = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : null
        };

        if (isDevelopment) {
            fetchOptions.headers = {
                ...fetchOptions.headers,
                'Authorization': `Bearer ${AIRTABLE_PAT}`
            };
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData: AirtableErrorResponse;
            try {
                const jsonError = await response.json();
                errorData = jsonError as AirtableErrorResponse;
            } catch (e) {
                const textError = await response.text().catch(() => "Could not read error response body.");
                errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError}` } };
            }
            console.error(`[postDataGeneric - ${method}] Airtable API Error:`, response.status, JSON.stringify(errorData));
            return { data: null, error: errorData };
        }

        const responseData = await response.json();
        return { data: responseData, error: null };

    } catch (networkError) {
        console.error(`[postDataGeneric - ${method}] Network or Fetch Error:`, networkError);
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' } } };
    }
};


const createAirtableRecord = async <TFields>(
  tableName: string,
  fields: TFields
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
  const url = constructUrl(tableName);
  const body = { records: [{ fields }] };
  const { data, error } = await postDataGeneric<TFields>(url, 'POST', body);
  if (error || !data || !data.records || data.records.length === 0) {
      return { record: null, error: error || { error: { type: 'CREATE_FAILED', message: 'La creación del registro no devolvió el registro esperado.' } } };
  }
  return { record: data.records[0], error: null };
}

const updateAirtableRecord = async <TFields>(
  tableName: string,
  recordId: string,
  fields: Partial<TFields>
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
    const url = constructUrl(tableName, recordId);
    const body = { fields };
    const { data, error } = await postDataGeneric<TFields>(url, 'PATCH', body);
    if (error || !data) {
        return { record: null, error: error || { error: { type: 'UPDATE_FAILED', message: 'La actualización falló.'}}};
    }
    return { record: data as AirtableRecord<TFields>, error: null };
}


const updateAirtableRecords = async <TFields>(
  tableName: string,
  records: { id: string; fields: Partial<TFields> }[]
): Promise<{ records: AirtableRecord<TFields>[] | null, error: AirtableErrorResponse | null }> => {
  const CHUNK_SIZE = 10;
  let allUpdatedRecords: AirtableRecord<TFields>[] = [];
  const url = constructUrl(tableName);

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const body = { records: chunk };
    const { data, error } = await postDataGeneric<TFields>(url, 'PATCH', body);
    if (error) {
         return { records: allUpdatedRecords.length > 0 ? allUpdatedRecords : null, error };
    }
    if (data && data.records) {
        allUpdatedRecords.push(...data.records);
    }
  }

  return { records: allUpdatedRecords, error: null };
}

const fetchAllAirtableData = async <TFields>(
    tableName: string,
    fields: string[] = [],
    filterByFormula?: string,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    let allRecords: AirtableRecord<TFields>[] = [];
    let offset: string | undefined;

    try {
        do {
            const params = new URLSearchParams();
            fields.forEach(field => params.append('fields[]', field));
            if (filterByFormula) params.set('filterByFormula', filterByFormula);
            if (offset) {
                params.set('offset', offset);
                await new Promise(resolve => setTimeout(resolve, 250));
            }
            if (sort && sort.length > 0) {
                sort.forEach((sortObject, index) => {
                    params.append(`sort[${index}][field]`, sortObject.field);
                    params.append(`sort[${index}][direction]`, sortObject.direction);
                });
            }

            const url = constructUrl(tableName, undefined, params);
            const { data: pageData, error: pageError } = await fetchDataGeneric<TFields>(url);

            if (pageError || !pageData) {
                const errorToThrow = pageError || { error: { type: 'UNKNOWN_ERROR', message: 'An unknown error occurred during pagination.' } };
                throw errorToThrow;
            }

            allRecords = allRecords.concat(pageData.records);
            offset = pageData.offset;
        } while (offset);

        return { records: allRecords, error: null };

    } catch (e: any) {
        const error: AirtableErrorResponse = e.error ? e : { error: { type: 'PAGINATION_ERROR', message: e.message || 'An error occurred while fetching all records.' } };
        console.error(`[fetchAllAirtableData] Error during pagination for table "${tableName}":`, JSON.stringify(error, null, 2));
        return { records: [], error };
    }
}


const fetchAirtableData = async <TFields>(
    tableName: string, 
    fields: string[] = [], 
    filterByFormula?: string,
    maxRecords?: number,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    
    const params = new URLSearchParams();

    fields.forEach(field => params.append('fields[]', field));
    if (filterByFormula) {
        params.set('filterByFormula', filterByFormula);
    }
    if (maxRecords) {
        params.set('maxRecords', maxRecords.toString());
    }
    if (sort && sort.length > 0) {
        sort.forEach((sortObject, index) => {
            params.append(`sort[${index}][field]`, sortObject.field);
            params.append(`sort[${index}][direction]`, sortObject.direction);
        });
    }
    
    const url = constructUrl(tableName, undefined, params);

    const { data, error } = await fetchDataGeneric<TFields>(url);
    if (error || !data) {
        return { records: [], error: error || { error: { type: 'UNKNOWN_ERROR', message: 'An unknown error occurred.'}} };
    }
    return { records: data.records, error: null };
}

const deleteAirtableRecord = async (
  tableName: string,
  recordId: string
): Promise<{ success: boolean, error: AirtableErrorResponse | null }> => {
    const url = constructUrl(tableName, recordId);
    const { data, error } = await postDataGeneric(url, 'DELETE');
    if (error || !data) {
        return { success: false, error: error || { error: { type: 'DELETE_FAILED', message: 'La eliminación falló.' }}};
    }
    return { success: (data as { deleted: boolean }).deleted, error: null };
}

export {
    createAirtableRecord,
    updateAirtableRecord,
    updateAirtableRecords,
    fetchAllAirtableData,
    fetchAirtableData,
    deleteAirtableRecord,
};