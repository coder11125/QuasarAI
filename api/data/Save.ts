import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { UserData } from '../../lib/models/UserData.js';
import { encryptKeys } from '../../lib/crypto.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { keys, selectedModel } = req.body ?? {};

    try {
        await connectDB();

        await UserData.findOneAndUpdate(
            { userId: user.userId },
            {
                userId: user.userId,
                keys: encryptKeys(keys ?? {}),
                selectedModel: selectedModel ?? '',
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Data saved successfully' });

    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
}