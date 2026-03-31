import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Chat } from '../../lib/models/Chat.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        await connectDB();

        const chats = await Chat.find({ userId: user.userId })
            .sort({ updatedAt: -1 })
            .lean();

        const chatsMap: Record<string, object> = {};
        for (const chat of chats) {
            chatsMap[chat.chatId] = {
                id:        chat.chatId,
                title:     chat.title,
                messages:  chat.messages,
                folderId:  chat.folderId ?? null,
                updatedAt: chat.updatedAt.getTime(),
            };
        }

        res.status(200).json({ chats: chatsMap });
    } catch (err) {
        console.error('Chat list error:', err);
        res.status(500).json({ error: 'Failed to load chats' });
    }
}