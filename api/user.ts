import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const { JWT_SECRET } = process.env;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    if (!JWT_SECRET) {
        console.error("JWT_SECRET is not configured on the server.");
        // Clear any potentially invalid cookie
        res.setHeader('Set-Cookie', cookie.serialize('auth', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            expires: new Date(0),
            path: '/',
            sameSite: 'strict',
        }));
        return res.status(500).json({ message: 'Server environment is not configured.' });
    }
    
    const token = req.cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET!);
        // Send the decoded user payload back to the client
        return res.status(200).json(decoded);
    } catch (error) {
        // If token is invalid or expired, instruct browser to clear it
        res.setHeader('Set-Cookie', cookie.serialize('auth', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            expires: new Date(0),
            path: '/',
            sameSite: 'strict',
        }));
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}