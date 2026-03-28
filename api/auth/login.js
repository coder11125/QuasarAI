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

    const INVALID_MSG = 'Invalid email or password';

    try {
        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            await bcrypt.hash(password, 12); // timing attack prevention
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

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}