import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../lib/db.js';
import { signToken } from '../../lib/jwt.js';
import { User } from '../../lib/models/User.js';

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

    const INVALID_MSG = 'Invalid email or password';

    try {
        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            await bcrypt.hash(password, 12); // timing attack prevention
            res.status(401).json({ error: INVALID_MSG });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            res.status(401).json({ error: INVALID_MSG });
            return;
        }

        const token = signToken({ userId: user.userId, email: user.email });

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: { userId: user.userId, email: user.email },
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}