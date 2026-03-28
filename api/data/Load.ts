import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { UserData } from '../../lib/models/UserData.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        await connectDB();

        const userData = await UserData.findOne({ userId: user.userId });

        if (!userData) {
            res.status(200).json({
                keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
                selectedModel: '',
                chats: {},
            });
            return;
        }

        res.status(200).json({
            keys: userData.keys,
            selectedModel: userData.selectedModel,
            chats: JSON.parse(userData.chats || '{}'),
        });

    } catch (err) {
        console.error('Load error:', err);
        res.status(500).json({ error: 'Failed to load data' });
    }
}