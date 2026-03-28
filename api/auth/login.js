import bcrypt from 'bcryptjs';
import { signToken } from '../../lib/jwt.js';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */

// Same in-memory store as register.js — replace with DB later
// In production both files will share the same DB, making this unnecessary
const users = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = users.get(normalizedEmail);

    // Use a generic message to avoid leaking whether the email exists
    const INVALID_MSG = 'Invalid email or password';

    if (!user) {
        // Still hash to prevent timing attacks
        await bcrypt.hash(password, 12);
        return res.status(401).json({ error: INVALID_MSG });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        return res.status(401).json({ error: INVALID_MSG });
    }

    const token = signToken({ userId: user.userId, email: user.email });

    return res.status(200).json({
        message: 'Logged in successfully',
        token,
        user: { userId: user.userId, email: user.email }
    });
}
