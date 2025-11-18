import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Type definition for type safety
type AuthUser = {
  legajo: string;
  nombre: string;
  role?: 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
  orientaciones?: string[];
};

const { AIRTABLE_PAT, AIRTABLE_BASE_ID, JWT_SECRET } = process.env;

const fetchAirtable = async (method: string, path: string, body?: any) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${path}`;

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse Airtable error response' } }));
        throw { status: response.status, message: errorData.error?.message || 'Airtable API error' };
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
    }

    return response.json();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !JWT_SECRET) {
        return res.status(500).json({ message: 'Server environment is not configured.' });
    }

    const token = req.cookies.auth;
    if (!token) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    let user: AuthUser;
    try {
        user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
    
    const { table, recordId, ...queryParams } = req.query;

    console.log(`--- [Airtable Proxy Log] ---`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request for table: "${table}"`);
    console.log('Incoming Query Params:', queryParams);

    const isSuperUser = user.role === 'SuperUser' || user.role === 'Jefe' || user.role === 'Directivo' || user.role === 'AdminTester' || user.role === 'Reportero';
    
    if (typeof table !== 'string') {
        return res.status(400).json({ message: 'Table name is required.' });
    }
    
    // --- SECURITY RULES ---
    if (!isSuperUser) {
        let formula = queryParams.filterByFormula as string | undefined;
        const studentLegajo = String(user.legajo);
        let legajoFilter = '';

        if (table === 'Estudiantes') {
            formula = `{Legajo} = '${studentLegajo}'`;
        } else if (table === 'Prácticas') {
            legajoFilter = `SEARCH('${studentLegajo}', {Legajo Busqueda} & '')`;
        } else if (table === 'Solicitud de PPS' || table === 'Convocatorias') {
            legajoFilter = `SEARCH('${studentLegajo}', {Legajo} & '')`;
        }
        
        if (legajoFilter) {
             formula = formula ? `AND(${formula}, ${legajoFilter})` : legajoFilter;
        }

        queryParams.filterByFormula = formula ?? '';
        console.log(`Applied Security Filter for user ${user.legajo}: ${queryParams.filterByFormula}`);
    }

    try {
        const fetchAll = queryParams.fetchAll === 'true';
        if (fetchAll) {
            delete queryParams.fetchAll;
        }

        let path = `${encodeURIComponent(table)}`;
        if (recordId && typeof recordId === 'string') {
            path += `/${recordId}`;
        }
        
        const buildQueryString = (params: typeof queryParams): string => {
            const queryStringParts: string[] = [];
            for (const key in params) {
                const value = params[key];
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        queryStringParts.push(`${key}=${encodeURIComponent(v)}`);
                    });
                } else if (value !== undefined) {
                    queryStringParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
                }
            }
            return queryStringParts.join('&');
        };

        if (req.method !== 'GET' || !fetchAll) {
            const queryString = buildQueryString(queryParams);
            if (queryString) {
                path += `?${queryString}`;
            }
            console.log(`Executing single request to Airtable: /${path}`);
            const data = await fetchAirtable(req.method || 'GET', path, req.body);
            console.log('Airtable response (single):', data);
            return res.status(200).json(data);
        }
        
        let allRecords: any[] = [];
        let offset: string | undefined = undefined;

        do {
            const currentParams: { [key: string]: any } = { ...queryParams };
            if (offset) {
                currentParams.offset = offset;
            }
            const queryString = buildQueryString(currentParams);
            let currentPath = path;
            if (queryString) {
                currentPath += `?${queryString}`;
            }

            console.log(`Executing paginated request to Airtable: /${currentPath}`);
            const pageData: any = await fetchAirtable('GET', currentPath);
            
            if (pageData.records) {
                allRecords = allRecords.concat(pageData.records);
            }
            offset = pageData.offset;
        } while (offset);
        
        console.log(`Total records received from Airtable: ${allRecords.length}`);
        if (allRecords.length > 0) {
            console.log('Structure of first record received:', JSON.stringify(allRecords[0], null, 2));
        }

        return res.status(200).json({ records: allRecords });

    } catch (error: any) {
        console.error(`[Airtable Proxy Error] for table "${table}":`, error);
        return res.status(error.status || 500).json({ message: error.message || 'An internal error occurred.' });
    }
}