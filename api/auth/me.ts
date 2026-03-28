import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/authMiddleware.js';

export default function handler(req: VercelRequest, res: VercelResponse): void {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    res.status(200).json({
        user: { userId: user.userId, email: user.email },
    });
}