import type { VercelRequest, VercelResponse } from '@vercel/node';
import cookie from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Set the cookie to an empty string and expire it in the past
    res.setHeader('Set-Cookie', cookie.serialize('auth', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: new Date(0), // Expire immediately
        path: '/',
        sameSite: 'strict',
    }));

    res.status(200).json({ message: 'Logged out successfully' });
}