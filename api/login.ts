import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import { 
    AIRTABLE_BASE_ID, 
    AIRTABLE_TABLE_NAME_AUTH_USERS, 
    FIELD_LEGAJO_AUTH, 
    FIELD_SALT_AUTH, 
    FIELD_PASSWORD_HASH_AUTH, 
    FIELD_NOMBRE_AUTH, 
    FIELD_ROLE_AUTH, 
    FIELD_ORIENTACIONES_AUTH 
} from '../src/constants';

// --- Funciones de Hashing (ahora en el servidor) ---
async function hashPassword(password: string, salt: string): Promise<string> {
    const passwordWithSalt = password + salt;
    const hash = createHash('sha256').update(passwordWithSalt).digest('hex');
    return hash;
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
    const newHash = await hashPassword(password, salt);
    return newHash === storedHash;
}

// Helper para procesar el rol
const getProcessedRole = (roleValue: any): 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | undefined => {
    if (!roleValue) return undefined;
    if (Array.isArray(roleValue)) roleValue = roleValue[0];
    if (typeof roleValue !== 'string') return undefined;
    const trimmedRole = roleValue.trim();
    const validRoles = ['Jefe', 'SuperUser', 'Directivo', 'AdminTester'];
    if (validRoles.includes(trimmedRole)) return trimmedRole as any;
    return undefined;
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { legajo, password } = req.body;
    console.log(`[LOGIN_API] Received request for legajo: ${legajo}`);
    
    if (!legajo || !password) {
        console.error('[LOGIN_API] Missing legajo or password.');
        return res.status(400).json({ message: 'Legajo y contraseña son requeridos.' });
    }

    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    if (!AIRTABLE_PAT) {
        console.error('[LOGIN_API] Missing AIRTABLE_PAT on server.');
        return res.status(500).json({ message: 'Airtable API token no está configurado en el servidor.' });
    }

    try {
        const filterByFormula = encodeURIComponent(`{${FIELD_LEGAJO_AUTH}} = '${legajo}'`);
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME_AUTH_USERS}?filterByFormula=${filterByFormula}&maxRecords=1`;

        console.log(`[LOGIN_API] Fetching user from Airtable for legajo: ${legajo}`);
        const airtableResponse = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
            },
        });

        if (!airtableResponse.ok) {
            const errorData = await airtableResponse.json();
            console.error(`[LOGIN_API] Airtable response NOT OK. Status: ${airtableResponse.status}`, errorData);
            return res.status(airtableResponse.status).json({ message: 'Error al contactar la base de datos de usuarios.' });
        }

        const { records } = await airtableResponse.json();

        if (records.length === 0) {
            console.warn(`[LOGIN_API] No user record found in Airtable for legajo: ${legajo}`);
            return res.status(401).json({ message: 'Legajo o contraseña incorrectos.' });
        }

        console.log(`[LOGIN_API] User record found for legajo: ${legajo}`);
        const user = records[0].fields;
        const salt = user[FIELD_SALT_AUTH];
        const storedHash = user[FIELD_PASSWORD_HASH_AUTH];

        if (!salt || !storedHash) {
            console.warn(`[LOGIN_API] User account for legajo ${legajo} is not fully registered (missing hash or salt).`);
            return res.status(401).json({ message: 'Esta cuenta no tiene una contraseña configurada. Por favor, regístrate para crear una.' });
        }

        console.log(`[LOGIN_API] Verifying password for legajo ${legajo}...`);
        const isValid = await verifyPassword(password, salt, storedHash);
        console.log(`[LOGIN_API] Password verification result for legajo ${legajo}: ${isValid}`);

        if (isValid) {
            const processedRole = getProcessedRole(user[FIELD_ROLE_AUTH]);
            const userPayload = {
                legajo: legajo,
                nombre: user[FIELD_NOMBRE_AUTH],
                role: processedRole,
                orientaciones: user[FIELD_ORIENTACIONES_AUTH]?.split(',').map((o: string) => o.trim())
            };
            console.log(`[LOGIN_API] Password valid. Sending success response for legajo: ${legajo}`);
            return res.status(200).json({ message: 'Login exitoso', user: userPayload });
        } else {
            console.warn(`[LOGIN_API] Invalid password for legajo ${legajo}.`);
            return res.status(401).json({ message: 'Legajo o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error(`[LOGIN_API] CATCH BLOCK: General error for legajo ${legajo}:`, error);
        return res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.' });
    }
}