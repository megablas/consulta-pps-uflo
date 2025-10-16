import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, randomBytes } from 'crypto';
import { Buffer } from 'buffer';
import { 
    AIRTABLE_BASE_ID, 
    AIRTABLE_TABLE_NAME_AUTH_USERS, 
    FIELD_LEGAJO_AUTH, 
    FIELD_NOMBRE_AUTH, 
    FIELD_SALT_AUTH, 
    FIELD_PASSWORD_HASH_AUTH,
    AIRTABLE_TABLE_NAME_ESTUDIANTES
} from '../src/constants';
import type { EstudianteFields } from '../src/types';

// --- Hashing Functions ---
function bufferToHex(buffer: Buffer): string {
    return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}
  
async function hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordWithSalt = encoder.encode(password + salt);
    const hash = createHmac('sha256', salt).update(passwordWithSalt).digest();
    return bufferToHex(hash as unknown as Buffer);
}

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;

// Helper to make API calls to Airtable
async function airtableApiCall(url: string, method: string, body?: any) {
    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Airtable API Error:", errorData);
        throw new Error(errorData.error?.message || `Airtable API request failed with status ${response.status}`);
    }
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!AIRTABLE_PAT) {
        return res.status(500).json({ message: 'Airtable API token is not configured.' });
    }

    const { legajo, password, foundAuthUserId, foundStudentId, studentName, newData } = req.body;

    if (!legajo || !password) {
        return res.status(400).json({ message: 'Legajo y contraseña son requeridos.' });
    }

    try {
        const salt = bufferToHex(randomBytes(16));
        const passwordHash = await hashPassword(password, salt);

        let userRecord;

        if (foundAuthUserId) {
            // Update existing Auth User record (for pre-registered users)
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_AUTH_USERS}/${foundAuthUserId}`;
            const { records } = await airtableApiCall(url, 'PATCH', {
                fields: {
                    [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                    [FIELD_SALT_AUTH]: salt
                }
            });
            userRecord = records && records.length > 0 ? records[0] : null;
        } else {
            // Create a new Auth User record
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_AUTH_USERS}`;
            const { records } = await airtableApiCall(url, 'POST', {
                records: [{
                    fields: {
                        [FIELD_LEGAJO_AUTH]: legajo,
                        [FIELD_NOMBRE_AUTH]: studentName,
                        [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                        [FIELD_SALT_AUTH]: salt
                    }
                }]
            });
            userRecord = records && records.length > 0 ? records[0] : null;
        }
        
        if (!userRecord) {
            throw new Error('Failed to create or update user authentication record.');
        }

        // If new student data was collected, update the Estudiantes table
        if (foundStudentId && newData && Object.keys(newData).length > 0) {
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_ESTUDIANTES}/${foundStudentId}`;
            await airtableApiCall(url, 'PATCH', { fields: newData as Partial<EstudianteFields> });
        }
        
        const finalUserName = userRecord.fields[FIELD_NOMBRE_AUTH] || studentName;
        const userPayload = { legajo, nombre: finalUserName };
        
        return res.status(201).json({ message: 'Usuario registrado exitosamente', user: userPayload });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: (error as Error).message || 'Ocurrió un error inesperado en el servidor.' });
    }
}