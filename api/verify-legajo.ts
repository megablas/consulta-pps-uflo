import type { VercelRequest, VercelResponse } from '@vercel/node';

const { AIRTABLE_BASE_ID, AIRTABLE_PAT } = process.env;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const TABLE_AUTH_USERS = 'Auth Users';
const TABLE_ESTUDIANTES = 'Estudiantes';
const FIELD_LEGAJO_AUTH = 'Legajo';
const FIELD_LEGAJO_ESTUDIANTES = 'Legajo';

async function airtableApi(path: string, options: RequestInit = {}) {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${path}`;
    const response = await fetch(url, {
        ...options,
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, ...options.headers },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Airtable error: ${response.status}`);
    }
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    if (!AIRTABLE_BASE_ID || !AIRTABLE_PAT) {
        return res.status(500).json({ message: 'Server environment is not configured.' });
    }

    const { legajo } = req.body;
    if (!legajo) {
        return res.status(400).json({ message: 'Legajo is required.' });
    }

    try {
        const authFormula = `{${FIELD_LEGAJO_AUTH}} = '${legajo}'`;
        const studentFormula = `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`;

        const [authRes, studentRes] = await Promise.all([
            airtableApi(`${encodeURIComponent(TABLE_AUTH_USERS)}?filterByFormula=${encodeURIComponent(authFormula)}&maxRecords=1`),
            airtableApi(`${encodeURIComponent(TABLE_ESTUDIANTES)}?filterByFormula=${encodeURIComponent(studentFormula)}&maxRecords=1`)
        ]);

        if (authRes.records.length === 0) {
             return res.status(404).json({ message: 'No existe una cuenta para este legajo. Por favor, completa el proceso de registro primero.' });
        }
        
        if (studentRes.records.length === 0) {
             return res.status(404).json({ message: 'No se encontraron datos de estudiante para verificar la identidad.' });
        }

        // Both records exist, so the user can proceed to the reset step.
        return res.status(200).json({ success: true, message: 'Legajo verificado.' });

    } catch (error: any) {
        console.error("[API Verify Legajo Error]", error);
        return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
    }
}
