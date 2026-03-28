import { connectDB } from '../../lib/db.js';
import { UserData } from '../../lib/models/UserData.js';
import { requireAuth } from '../../lib/authMiddleware.js';

/**
 * POST /api/data/save
 * Body: { keys, selectedModel, chats }
 * Saves API keys and chat history to MongoDB for the authenticated user.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { keys, selectedModel, chats } = req.body || {};

    try {
        await connectDB();

        await UserData.findOneAndUpdate(
            { userId: user.userId },
            {
                userId: user.userId,
                keys: keys || {},
                selectedModel: selectedModel || '',
                chats: JSON.stringify(chats || {}),
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({ message: 'Data saved successfully' });

    } catch (err) {
        console.error('Save error:', err);
        return res.status(500).json({ error: 'Failed to save data' });
    }
}