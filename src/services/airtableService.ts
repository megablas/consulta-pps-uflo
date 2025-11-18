import { z } from 'zod';
import { AIRTABLE_BASE_ID, AIRTABLE_PAT } from '../constants';
import type { AirtableResponse, AirtableErrorResponse, AirtableRecord } from '../types';

// Función centralizada para construir la URL directa de la API de Airtable
function constructUrl(tableName: string, recordId?: string): string {
    // NOTE: This now calls the Airtable API directly. The serverless proxy is not used
    // because the deployment environment (e.g., GitHub Pages) does not support it.
    const pathSegments = [AIRTABLE_BASE_ID, encodeURIComponent(tableName)];
    if (recordId) {
        pathSegments.push(recordId);
    }
    const path = pathSegments.join('/');
    return `https://api.airtable.com/v0/${path}`;
}

const fetchDataGeneric = async <T>(url: string, queryParams?: URLSearchParams): Promise<{ data: AirtableResponse<T> | null, error: AirtableErrorResponse | null }> => {
    // The URL is now the direct Airtable API URL. Params go after '?'.
    const finalUrl = queryParams && queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    try {
        if (!AIRTABLE_PAT) {
            throw new Error("Airtable PAT is not configured.");
        }
        
        const response = await fetch(finalUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
            },
        });

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
                errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError || response.statusText}` } };
            }
            console.error('[fetchDataGeneric] Airtable API Error:', response.status, JSON.stringify(errorData), "URL:", finalUrl);
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
        console.error('[fetchDataGeneric] Network or Fetch Error:', networkError, "URL:", finalUrl);
        const errorMessage = `No se pudo conectar con el servidor. Revisa tu conexión a internet.`;
        return { data: null, error: { error: { type: 'NETWORK_ERROR', message: errorMessage } } };
    }
}

const postDataGeneric = async <TFields>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: any): Promise<{ data: any | null, error: AirtableErrorResponse | null }> => {
    try {
        if (!AIRTABLE_PAT) {
            throw new Error("Airtable PAT is not configured.");
        }

        const fetchOptions: RequestInit = {
            method: method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : null
        };

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
        
        if (method === 'DELETE') {
            const textResponse = await response.text();
            try {
                return { data: JSON.parse(textResponse), error: null };
            } catch (e) {
                return { data: { deleted: true }, error: null };
            }
        }

        const responseData = await response.json();
        console.log(`[postDataGeneric - ${method}] Airtable Success Response:`, responseData);
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
  
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const body = { records: chunk };
    const url = constructUrl(tableName);
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
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
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

            const url = constructUrl(tableName);
            const { data: pageData, error: pageError } = await fetchDataGeneric<any>(url, params);

            if (pageError || !pageData) {
                const errorToThrow = pageError || { error: { type: 'UNKNOWN_ERROR', message: 'An unknown error occurred during pagination.' } };
                throw errorToThrow;
            }

            allRecords = allRecords.concat(pageData.records);
            offset = pageData.offset;
        } while (offset);

        const validationResult = zodSchema.safeParse(allRecords);
        if (!validationResult.success) {
            console.error(`[Zod Validation Error in ${tableName}]:`, JSON.stringify(validationResult.error.issues, null, 2));
            const formattedErrors = validationResult.error.issues.map(issue => `  - Item #${String(issue.path[0])}, Campo '${issue.path.slice(1).join('.')}': ${issue.message}`).join('\n');
            const error: AirtableErrorResponse = { error: { type: 'ZOD_VALIDATION_ERROR', message: `Los datos recibidos para "${tableName}" no tienen el formato esperado.\nDetalles:\n${formattedErrors}` } };
            return { records: [], error };
        }

        return { records: validationResult.data, error: null };

    } catch (e: any) {
        const error: AirtableErrorResponse = e.error ? e : { error: { type: 'PAGINATION_ERROR', message: e.message || 'An error occurred while fetching all records.' } };
        console.error(`[fetchAllAirtableData] Error during pagination for table "${tableName}":`, JSON.stringify(error, null, 2));
        return { records: [], error };
    }
}


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
    
    const url = constructUrl(tableName);

    const { data, error } = await fetchDataGeneric<any>(url, params);
    if (error || !data) {
        return { records: [], error: error || { error: { type: 'UNKNOWN_ERROR', message: 'An unknown error occurred.'}} };
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