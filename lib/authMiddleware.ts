import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, TokenPayload } from './jwt.js';

export function requireAuth(req: VercelRequest, res: VercelResponse): TokenPayload | null {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: 'Missing authorization token' });
        return null;
    }

    try {
        return verifyToken(token);
    } catch (err: any) {
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ error: message });
        return null;
    }
}