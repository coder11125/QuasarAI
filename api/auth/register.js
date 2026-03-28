import bcrypt from 'bcryptjs';
import { signToken } from '../../lib/jwt.js';

/**
 * POST /api/auth/register
 * Body: { email, password }
 *
 * In this basic version, users are stored in-memory.
 * Replace `users` with a real database (e.g. Vercel Postgres, PlanetScale) later.
 */

// Temporary in-memory store — swap out for a DB later
// NOTE: This resets on every cold start on Vercel. Replace with a DB before going to production.
const users = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};

    // --- Validation ---
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (users.has(normalizedEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // --- Hash password & store user ---
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    users.set(normalizedEmail, { userId, email: normalizedEmail, passwordHash, createdAt: Date.now() });

    // --- Issue token ---
    const token = signToken({ userId, email: normalizedEmail });

    return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { userId, email: normalizedEmail }
    });
}
