import bcrypt from 'bcryptjs';
import { signToken } from '../../lib/jwt.js';
import { connectDB } from '../../lib/db.js';
import { User } from '../../lib/models/User.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        await connectDB();

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userId = crypto.randomUUID();

        const user = await User.create({
            userId,
            email: email.toLowerCase().trim(),
            passwordHash,
        });

        const token = signToken({ userId: user.userId, email: user.email });

        return res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { userId: user.userId, email: user.email }
        });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}