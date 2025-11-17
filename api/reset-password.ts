import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

// Copied from src/utils/formatters.ts to make the function self-contained
function normalizeStringForComparison(str?: any): string {
  const value = String(str || '');
  if (!value) return "";
  return value
    .normalize("NFD") // Decompose accented characters into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (e.g. accents)
    .toLowerCase()
    .trim();
}

const { AIRTABLE_BASE_ID, AIRTABLE_PAT, JWT_SECRET } = process.env;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const TABLE_AUTH_USERS = 'Auth Users';
const TABLE_ESTUDIANTES = 'Estudiantes';
const FIELD_LEGAJO_AUTH = 'Legajo';
const FIELD_PASSWORD_HASH_AUTH = 'PasswordHash';
const FIELD_SALT_AUTH = 'Salt';
const FIELD_NOMBRE_AUTH = 'Nombre';
const FIELD_LEGAJO_ESTUDIANTES = 'Legajo';
const FIELD_DNI_ESTUDIANTES = 'DNI';
const FIELD_CORREO_ESTUDIANTES = 'Correo';
const FIELD_TELEFONO_ESTUDIANTES = 'Teléfono';

function generateSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password: string, salt: string) { return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex'); }

async function airtableApi(path: string, options: RequestInit = {}) {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${path}`;
    const response = await fetch(url, {
        ...options,
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json', ...options.headers },
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
    if (!AIRTABLE_BASE_ID || !AIRTABLE_PAT || !JWT_SECRET) {
        return res.status(500).json({ message: 'Server environment is not configured.' });
    }

    const { legajo, password, verificationData } = req.body;
    if (!legajo || !password || !verificationData || !verificationData.dni || !verificationData.correo || !verificationData.telefono) {
        return res.status(400).json({ message: 'Faltan datos para el restablecimiento.' });
    }

    try {
        const studentFormula = `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`;
        const studentRes = await airtableApi(`${encodeURIComponent(TABLE_ESTUDIANTES)}?filterByFormula=${encodeURIComponent(studentFormula)}`);
        const studentRecord = studentRes.records[0];

        if (!studentRecord) {
            return res.status(404).json({ message: 'Estudiante no encontrado.' });
        }

        const storedDni = String(studentRecord.fields[FIELD_DNI_ESTUDIANTES] || '').trim();
        const storedCorreo = normalizeStringForComparison(studentRecord.fields[FIELD_CORREO_ESTUDIANTES]);
        const storedTelefono = String(studentRecord.fields[FIELD_TELEFONO_ESTUDIANTES] || '').replace(/\D/g, '');
        
        const inputDni = String(verificationData.dni).trim();
        const inputCorreo = normalizeStringForComparison(verificationData.correo);
        const inputTelefono = String(verificationData.telefono).replace(/\D/g, '');

        if (storedDni !== inputDni || storedCorreo !== inputCorreo || storedTelefono !== inputTelefono) {
            return res.status(403).json({ message: 'Los datos de verificación no coinciden.' });
        }

        const authFormula = `{${FIELD_LEGAJO_AUTH}} = '${legajo}'`;
        const authRes = await airtableApi(`${encodeURIComponent(TABLE_AUTH_USERS)}?filterByFormula=${encodeURIComponent(authFormula)}`);
        const authRecord = authRes.records[0];
        
        if (!authRecord) {
            return res.status(404).json({ message: 'Cuenta de autenticación no encontrada.' });
        }
        
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);

        await airtableApi(`${encodeURIComponent(TABLE_AUTH_USERS)}/${authRecord.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ fields: { [FIELD_PASSWORD_HASH_AUTH]: passwordHash, [FIELD_SALT_AUTH]: salt } })
        });

        const userPayload = {
            legajo: authRecord.fields[FIELD_LEGAJO_AUTH],
            nombre: authRecord.fields[FIELD_NOMBRE_AUTH],
            role: authRecord.fields.Role,
            orientaciones: authRecord.fields.Orientaciones ? authRecord.fields.Orientaciones.split(',').map((o: string) => o.trim()) : [],
        };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        res.setHeader('Set-Cookie', cookie.serialize('auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            sameSite: 'strict',
        }));

        res.status(200).json(userPayload);

    } catch (error: any) {
        console.error("[API Reset Password Error]", error);
        return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
    }
}