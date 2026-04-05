import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Chat } from '../../lib/models/Chat.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { chatId, title, messages, folderId } = req.body ?? {};

    if (!chatId || typeof chatId !== 'string') {
        res.status(400).json({ error: 'chatId is required' });
        return;
    }

    try {
        await connectDB();

        await Chat.findOneAndUpdate(
            { chatId, userId: user.userId },
            {
                userId:   user.userId,
                chatId,
                title:    typeof title === 'string' ? title.trim() : 'New Chat',
                messages: Array.isArray(messages) ? messages : [],
                folderId: typeof folderId === 'string' ? folderId : null,
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Chat saved' });
    } catch (err) {
        console.error('Chat save error:', err);
        res.status(500).json({ error: 'Failed to save chat' });
    }
}
