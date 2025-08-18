import { AIRTABLE_PAT, AIRTABLE_BASE_ID } from '../constants';
import type { AirtableResponse, AirtableErrorResponse, AirtableRecord } from '../types';

// Use window.location.hostname to determine if in development,
// as import.meta.env is not available in the project's setup.
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = isDevelopment
    ? `/airtable-api/v0/${AIRTABLE_BASE_ID}`
    : `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const fetchDataGeneric = async <T>(url: string): Promise<{ data: AirtableResponse<T> | null, error: AirtableErrorResponse | null }> => {
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
        });

        if (!response.ok) {
            let errorData: AirtableErrorResponse;
            try {
                // Try to parse as JSON first
                const jsonError = await response.json();
                errorData = jsonError as AirtableErrorResponse; 
                if (typeof errorData.error !== 'object' && typeof errorData.error !== 'string') {
                    // If errorData.error is not in expected format, construct one
                     errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${response.statusText}. Response not a valid error JSON.` }};
                }
            } catch (e) {
                // If JSON parsing fails, use text
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

const createAirtableRecord = async <TFields>(
  tableName: string,
  fields: TFields
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
  
  const url = `${API_BASE}/${encodeURIComponent(tableName)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{ fields }]
      })
    });

    if (!response.ok) {
       let errorData: AirtableErrorResponse;
       try {
           const jsonError = await response.json();
           errorData = jsonError as AirtableErrorResponse;
       } catch (e) {
           const textError = await response.text().catch(() => "Could not read error response body.");
           errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError}` } };
       }
       console.error('[createAirtableRecord] Airtable API Error:', response.status, JSON.stringify(errorData));
       return { record: null, error: errorData };
    }

    const data = await response.json() as AirtableResponse<TFields>;
    if (data.records && data.records.length > 0) {
      return { record: data.records[0], error: null };
    } else {
      return { record: null, error: { error: { type: 'CREATE_FAILED', message: 'La creación del registro no devolvió el registro esperado.' } } };
    }

  } catch (networkError) {
    console.error('[createAirtableRecord] Network or Fetch Error:', networkError);
    return { record: null, error: { error: { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' } } };
  }
}

const updateAirtableRecord = async <TFields>(
  tableName: string,
  recordId: string,
  fields: Partial<TFields>
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
  
  const url = `${API_BASE}/${encodeURIComponent(tableName)}/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
       let errorData: AirtableErrorResponse;
       try {
           const jsonError = await response.json();
           errorData = jsonError as AirtableErrorResponse;
       } catch (e) {
           const textError = await response.text().catch(() => "Could not read error response body.");
           errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError}` } };
       }
       console.error('[updateAirtableRecord] Airtable API Error:', response.status, JSON.stringify(errorData));
       return { record: null, error: errorData };
    }

    const record = await response.json() as AirtableRecord<TFields>;
    return { record, error: null };

  } catch (networkError) {
    console.error('[updateAirtableRecord] Network or Fetch Error:', networkError);
    return { record: null, error: { error: { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' } } };
  }
}


const updateAirtableRecords = async <TFields>(
  tableName: string,
  records: { id: string; fields: Partial<TFields> }[]
): Promise<{ records: AirtableRecord<TFields>[] | null, error: AirtableErrorResponse | null }> => {
  
  const url = `${API_BASE}/${encodeURIComponent(tableName)}`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records })
    });

    if (!response.ok) {
       let errorData: AirtableErrorResponse;
       try {
           const jsonError = await response.json();
           errorData = jsonError as AirtableErrorResponse;
       } catch (e) {
           const textError = await response.text().catch(() => "Could not read error response body.");
           errorData = { error: { type: `HTTP_ERROR_${response.status}`, message: `Error ${response.status}: ${textError}` } };
       }
       console.error('[updateAirtableRecords] Airtable API Error:', response.status, JSON.stringify(errorData));
       return { records: null, error: errorData };
    }

    const data = await response.json() as AirtableResponse<TFields>;
    return { records: data.records, error: null };

  } catch (networkError) {
    console.error('[updateAirtableRecords] Network or Fetch Error:', networkError);
    return { records: null, error: { error: { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' } } };
  }
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
            if (offset) params.set('offset', offset);
            if (sort && sort.length > 0) {
                sort.forEach((sortObject, index) => {
                    params.append(`sort[${index}][field]`, sortObject.field);
                    params.append(`sort[${index}][direction]`, sortObject.direction);
                });
            }

            const url = `${API_BASE}/${encodeURIComponent(tableName)}?${params.toString()}`;
            
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
        console.error('[fetchAllAirtableData] Error:', error);
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
    
    let url = `${API_BASE}/${encodeURIComponent(tableName)}`;
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
    
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    const { data, error } = await fetchDataGeneric<TFields>(url);
    if (error || !data) {
        return { records: [], error: error || { error: { type: 'UNKNOWN_ERROR', message: 'An unknown error occurred.'}} };
    }
    return { records: data.records, error: null };
}

export {
    createAirtableRecord,
    updateAirtableRecord,
    updateAirtableRecords,
    fetchAllAirtableData,
    fetchAirtableData,
};
