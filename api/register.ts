import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const { AIRTABLE_BASE_ID, AIRTABLE_PAT, JWT_SECRET } = process.env;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// Airtable Constants
const TABLE_AUTH_USERS = 'Auth Users';
const TABLE_ESTUDIANTES = 'Estudiantes';
// Auth Users Fields
const FIELD_LEGAJO_AUTH = 'Legajo';
const FIELD_PASSWORD_HASH_AUTH = 'PasswordHash';
const FIELD_SALT_AUTH = 'Salt';
const FIELD_NOMBRE_AUTH = 'Nombre';
// Estudiantes Fields
const FIELD_NOMBRE_ESTUDIANTES = 'Nombre';

function generateSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password: string, salt: string) { return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex'); }

async function airtableApi(method: string, path: string, body?: any) {
    const response = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Airtable API error: ${response.status}`);
    }
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    if (!AIRTABLE_BASE_ID || !AIRTABLE_PAT || !JWT_SECRET) {
        return res.status(500).json({ message: 'Server environment not configured.' });
    }

    const { legajo, password, studentId, authUserId, newData } = req.body;
    
    if (!legajo || !password) {
        return res.status(400).json({ message: 'Legajo and password are required.' });
    }
    if (!studentId && !authUserId) {
        return res.status(400).json({ message: 'Student ID or Auth User ID is required for registration.' });
    }

    try {
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        let studentName = 'Estudiante';
        let authRecordId = authUserId;

        if (studentId) {
            if (newData && Object.keys(newData).length > 0) {
                await airtableApi('PATCH', `${encodeURIComponent(TABLE_ESTUDIANTES)}/${studentId}`, { fields: newData });
            }
            
            const studentData = await airtableApi('GET', `${encodeURIComponent(TABLE_ESTUDIANTES)}/${studentId}`);
            studentName = studentData.fields[FIELD_NOMBRE_ESTUDIANTES] || studentName;
            
            const createAuthResponse = await airtableApi('POST', encodeURIComponent(TABLE_AUTH_USERS), {
                records: [{
                    fields: {
                        [FIELD_LEGAJO_AUTH]: legajo,
                        [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                        [FIELD_SALT_AUTH]: salt,
                        [FIELD_NOMBRE_AUTH]: studentName
                    }
                }]
            });
            authRecordId = createAuthResponse.records[0]?.id;
        } 
        else if (authUserId) {
            await airtableApi('PATCH', `${encodeURIComponent(TABLE_AUTH_USERS)}/${authUserId}`, {
                fields: {
                    [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                    [FIELD_SALT_AUTH]: salt,
                }
            });
             const authData = await airtableApi('GET', `${encodeURIComponent(TABLE_AUTH_USERS)}/${authUserId}`);
             studentName = authData.fields[FIELD_NOMBRE_AUTH] || studentName;
        }
        
        if (!authRecordId) {
            throw new Error('Failed to create or update authentication record.');
        }

        const userPayload = { legajo, nombre: studentName, role: undefined, orientaciones: [], };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        res.setHeader('Set-Cookie', cookie.serialize('auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            sameSite: 'strict',
        }));

        return res.status(200).json(userPayload);

    } catch (error: any) {
        console.error("[API Register Error]", error);
        return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
    }
}