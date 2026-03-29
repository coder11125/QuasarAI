import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Chat } from '../../lib/models/Chat.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { chatId } = req.body ?? {};

    if (!chatId || typeof chatId !== 'string') {
        res.status(400).json({ error: 'chatId is required' });
        return;
    }

    try {
        await connectDB();

        // userId check ensures users can only delete their own chats
        await Chat.findOneAndDelete({ chatId, userId: user.userId });

        res.status(200).json({ message: 'Chat deleted' });

    } catch (err) {
        console.error('Chat delete error:', err);
        res.status(500).json({ error: 'Failed to delete chat' });
    }
}