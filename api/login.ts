import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

// Type definition moved here to make the serverless function self-contained.
export type AuthUser = {
  legajo: string;
  nombre: string;
  role?: 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
  orientaciones?: string[];
};

// Environment Variables
const { AIRTABLE_BASE_ID, AIRTABLE_PAT, JWT_SECRET } = process.env;

// Airtable Constants
const TABLE_AUTH_USERS = 'Auth Users';
const FIELD_LEGAJO_AUTH = 'Legajo';
const FIELD_PASSWORD_HASH_AUTH = 'PasswordHash';
const FIELD_SALT_AUTH = 'Salt';
const FIELD_NOMBRE_AUTH = 'Nombre';
const FIELD_ROLE_AUTH = 'Role';
const FIELD_ORIENTACIONES_AUTH = 'Orientaciones';

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function signAndSetCookie(res: VercelResponse, userPayload: AuthUser) {
    const token = jwt.sign(userPayload, JWT_SECRET!, { expiresIn: '7d' });
    res.setHeader('Set-Cookie', cookie.serialize('auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'strict',
    }));
    return res.status(200).json(userPayload);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!AIRTABLE_BASE_ID || !AIRTABLE_PAT || !JWT_SECRET) {
        console.error("Server environment variables are missing.");
        return res.status(500).json({ message: 'Server environment is not configured correctly.' });
    }

    const { legajo, password } = req.body;

    if (!legajo || !password) {
        return res.status(400).json({ message: 'Legajo and password are required.' });
    }
    
    // --- DEMO/SPECIAL USER HANDLING ---
    const specialUsers: { [key: string]: { pass: string, payload: AuthUser } } = {
        'testing': { pass: 'testing', payload: { legajo: '99999', nombre: 'Admin de Prueba', role: 'SuperUser' } },
        '12345': { pass: '12345', payload: { legajo: '12345', nombre: 'Estudiante de Prueba' } },
        'reportero': { pass: 'reportero', payload: { legajo: 'reportero', nombre: 'Usuario Reportero', role: 'Reportero' } },
        'admin': { pass: 'superadmin', payload: { legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' } },
    };

    if (specialUsers[legajo] && specialUsers[legajo].pass === password) {
        return signAndSetCookie(res, specialUsers[legajo].payload);
    }
    // --- END DEMO USER HANDLING ---

    try {
        const formula = `{${FIELD_LEGAJO_AUTH}} = '${legajo}'`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_AUTH_USERS)}?filterByFormula=${encodeURIComponent(formula)}`;
        
        const airtableRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
        });

        if (!airtableRes.ok) {
            const errorData = await airtableRes.json();
            console.error(`Airtable API error for legajo ${legajo}:`, errorData);
            throw new Error('Error de comunicación con la base de datos de usuarios.');
        }

        const data = await airtableRes.json();
        const userRecord = data.records[0];

        if (!userRecord) {
            console.log(`[Login Attempt] User not found: ${legajo}`);
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        
        const { fields } = userRecord;
        const storedHash = fields[FIELD_PASSWORD_HASH_AUTH];
        const salt = fields[FIELD_SALT_AUTH];

        if (!storedHash || !salt || storedHash.length !== 128) {
            // This user exists but has an old password (no salt) or a corrupted hash. Force them to reset.
            console.log(`[Login Attempt] Legacy or corrupt user detected (no/invalid salt/hash): ${legajo}. Forcing password reset.`);
            return res.status(401).json({ 
                error: "MIGRATION_REQUIRED",
                message: "Por mejoras en la seguridad de la aplicación, es necesario que restablezcas tu contraseña. Puedes volver a utilizar la misma si lo deseas."
            });
        }

        const inputHash = hashPassword(password, salt);
        if (inputHash !== storedHash) {
            console.error(`[Login Failed] Invalid password for user ${legajo}.`);
            return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'La contraseña es incorrecta. Si la has olvidado, puedes restablecerla utilizando tus datos personales (DNI, correo, teléfono). Si sigues teniendo problemas, contacta a soporte.' });
        }

        const roleValue = fields[FIELD_ROLE_AUTH];
        let role;
        if (Array.isArray(roleValue)) {
            role = roleValue[0];
        } else {
            role = roleValue;
        }

        const userPayload: AuthUser = {
            legajo: fields[FIELD_LEGAJO_AUTH],
            nombre: fields[FIELD_NOMBRE_AUTH],
            role: role,
            orientaciones: fields[FIELD_ORIENTACIONES_AUTH] ? fields[FIELD_ORIENTACIONES_AUTH].split(',').map((o: string) => o.trim()) : [],
        };

        return signAndSetCookie(res, userPayload);

    } catch (error: any) {
        console.error("[API Login Error]", error);
        return res.status(500).json({ message: 'Ocurrió un error interno en el servidor.' });
    }
}