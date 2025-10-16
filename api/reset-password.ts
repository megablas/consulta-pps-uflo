import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, randomBytes } from 'crypto';
import { Buffer } from 'buffer';
import { 
    AIRTABLE_BASE_ID, 
    AIRTABLE_TABLE_NAME_AUTH_USERS, 
    FIELD_SALT_AUTH, 
    FIELD_PASSWORD_HASH_AUTH,
    FIELD_LEGAJO_AUTH,
    FIELD_NOMBRE_AUTH,
    FIELD_ROLE_AUTH,
    FIELD_ORIENTACIONES_AUTH
} from '../src/constants';

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

// Helper to process role
const getProcessedRole = (roleValue: any): 'Jefe' | 'SuperUser' | 'Directivo' | 'Estudiante Asistente' | 'AdminTester' | undefined => {
    if (!roleValue) return undefined;
    if (Array.isArray(roleValue)) roleValue = roleValue[0];
    if (typeof roleValue !== 'string') return undefined;
    const trimmedRole = roleValue.trim();
    const validRoles = ['Jefe', 'SuperUser', 'Directivo', 'Estudiante Asistente', 'AdminTester'];
    if (validRoles.includes(trimmedRole)) return trimmedRole as any;
    return undefined;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!AIRTABLE_PAT) {
        return res.status(500).json({ message: 'Airtable API token is not configured.' });
    }

    const { authUserId, newPassword } = req.body;

    if (!authUserId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required.' });
    }

    try {
        const newSalt = bufferToHex(randomBytes(16));
        const newPasswordHash = await hashPassword(newPassword, newSalt);

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_AUTH_USERS}/${authUserId}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    [FIELD_PASSWORD_HASH_AUTH]: newPasswordHash,
                    [FIELD_SALT_AUTH]: newSalt
                }
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Airtable API request failed with status ${response.status}`);
        }

        const updatedUserRecord = await response.json();

        // Prepare user payload to log them in immediately
        const user = updatedUserRecord.fields;
        const processedRole = getProcessedRole(user[FIELD_ROLE_AUTH]);
        const userPayload = {
            legajo: user[FIELD_LEGAJO_AUTH],
            nombre: user[FIELD_NOMBRE_AUTH],
            role: processedRole,
            orientaciones: user[FIELD_ORIENTACIONES_AUTH]?.split(',').map((o: string) => o.trim())
        };
        
        return res.status(200).json({ message: 'Password reset successfully.', user: userPayload });

    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ message: (error as Error).message || 'An unexpected server error occurred.' });
    }
}