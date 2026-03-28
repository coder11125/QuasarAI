import { verifyToken } from './jwt.js';

/**
 * Middleware that verifies the Bearer token in the Authorization header.
 * Attaches the decoded user to req.user if valid.
 * Returns 401 if missing or invalid.
 *
 * Usage in a Vercel API route:
 *   import { requireAuth } from '../../lib/authMiddleware.js';
 *   export default function handler(req, res) {
 *     const user = requireAuth(req, res);
 *     if (!user) return; // requireAuth already sent the 401
 *     // ... rest of handler
 *   }
 */
export function requireAuth(req, res) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: 'Missing authorization token' });
        return null;
    }

    try {
        const decoded = verifyToken(token);
        return decoded; // { userId, email, iat, exp }
    } catch (err) {
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ error: message });
        return null;
    }
}
