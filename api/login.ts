import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { Buffer } from 'buffer';
import { AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME_AUTH_USERS, FIELD_LEGAJO_AUTH, FIELD_SALT_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_NOMBRE_AUTH, FIELD_ROLE_AUTH, FIELD_ORIENTACIONES_AUTH } from '../src/constants';

// --- Funciones de Hashing (ahora en el servidor) ---
function bufferToHex(buffer: Buffer): string {
    return [...new Uint8Array(buffer)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
}
  
async function hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordWithSalt = encoder.encode(password + salt);
    // Node.js crypto en lugar de window.crypto
    const hash = createHmac('sha256', salt).update(passwordWithSalt).digest();
    return bufferToHex(hash as unknown as Buffer);
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
    const newHash = await hashPassword(password, salt);
    return newHash === storedHash;
}

// Helper para procesar el rol
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

    const { legajo, password } = req.body;
    if (!legajo || !password) {
        return res.status(400).json({ message: 'Legajo y contraseña son requeridos.' });
    }

    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    if (!AIRTABLE_PAT) {
        return res.status(500).json({ message: 'Airtable API token no está configurado en el servidor.' });
    }

    try {
        const filterByFormula = encodeURIComponent(`{${FIELD_LEGAJO_AUTH}} = '${legajo}'`);
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_AUTH_USERS}?filterByFormula=${filterByFormula}&maxRecords=1`;

        const airtableResponse = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
            },
        });

        if (!airtableResponse.ok) {
            const errorData = await airtableResponse.json();
            console.error("Airtable error:", errorData);
            return res.status(airtableResponse.status).json({ message: 'Error al contactar la base de datos de usuarios.' });
        }

        const { records } = await airtableResponse.json();

        if (records.length === 0) {
            return res.status(401).json({ message: 'Legajo o contraseña incorrectos.' });
        }

        const user = records[0].fields;
        const salt = user[FIELD_SALT_AUTH];
        const storedHash = user[FIELD_PASSWORD_HASH_AUTH];

        if (!salt || !storedHash) {
            return res.status(401).json({ message: 'Esta cuenta no tiene una contraseña configurada. Por favor, regístrate para crear una.' });
        }

        const isValid = await verifyPassword(password, salt, storedHash);

        if (isValid) {
            const processedRole = getProcessedRole(user[FIELD_ROLE_AUTH]);
            const userPayload = {
                legajo: legajo,
                nombre: user[FIELD_NOMBRE_AUTH],
                role: processedRole,
                orientaciones: user[FIELD_ORIENTACIONES_AUTH]?.split(',').map((o: string) => o.trim())
            };
            return res.status(200).json({ message: 'Login exitoso', user: userPayload });
        } else {
            return res.status(401).json({ message: 'Legajo o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.' });
    }
}