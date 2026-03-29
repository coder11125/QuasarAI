import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../lib/db.js';
import { signToken } from '../../lib/jwt.js';
import { User } from '../../lib/models/User.js';
import { checkRateLimit } from '../../lib/rateLimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { email, password } = req.body ?? {};

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Invalid email address' });
        return;
    }
    if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
    }

    try {
        await connectDB();

        const allowed = await checkRateLimit('register', req, res);
        if (!allowed) return;

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            res.status(409).json({ error: 'An account with this email already exists' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userId = crypto.randomUUID();

        const user = await User.create({
            userId,
            email: email.toLowerCase().trim(),
            passwordHash,
        });

        const token = signToken({ userId: user.userId, email: user.email });

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { userId: user.userId, email: user.email },
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}