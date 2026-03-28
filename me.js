import { requireAuth } from '../../lib/authMiddleware.js';

/**
 * GET /api/auth/me
 * Returns the currently authenticated user from their token.
 * Useful for the frontend to verify a stored token is still valid on page load.
 */
export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = requireAuth(req, res);
    if (!user) return; // 401 already sent

    return res.status(200).json({
        user: { userId: user.userId, email: user.email }
    });
}
