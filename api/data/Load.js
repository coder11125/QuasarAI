import { connectDB } from '../../lib/db.js';
import { UserData } from '../../lib/models/UserData.js';
import { requireAuth } from '../../lib/authMiddleware.js';

/**
 * GET /api/data/load
 * Returns API keys and chat history for the authenticated user.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        await connectDB();

        const userData = await UserData.findOne({ userId: user.userId });

        if (!userData) {
            // First time user — return empty defaults
            return res.status(200).json({
                keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
                selectedModel: '',
                chats: {}
            });
        }

        return res.status(200).json({
            keys: userData.keys,
            selectedModel: userData.selectedModel,
            chats: JSON.parse(userData.chats || '{}'),
        });

    } catch (err) {
        console.error('Load error:', err);
        return res.status(500).json({ error: 'Failed to load data' });
    }
}