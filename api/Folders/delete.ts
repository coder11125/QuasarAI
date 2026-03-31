import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Folder } from '../../lib/models/Folder.js';
import { Chat } from '../../lib/models/Chat.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { folderId } = req.body ?? {};

    if (!folderId || typeof folderId !== 'string') {
        res.status(400).json({ error: 'folderId is required' });
        return;
    }

    try {
        await connectDB();

        // Delete the folder
        await Folder.findOneAndDelete({ folderId, userId: user.userId });

        // Unassign all chats that were in this folder (don't delete the chats themselves)
        await Chat.updateMany(
            { userId: user.userId, folderId },
            { $unset: { folderId: '' } }
        );

        res.status(200).json({ message: 'Folder deleted' });
    } catch (err) {
        console.error('Folder delete error:', err);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
}