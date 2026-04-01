import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Folder } from '../../lib/models/Folder.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { folderId, name, color } = req.body ?? {};

    if (!folderId || typeof folderId !== 'string') {
        res.status(400).json({ error: 'folderId is required' });
        return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required' });
        return;
    }

    const ALLOWED_COLORS = ['gray', 'blue', 'green', 'amber', 'red', 'purple', 'pink', 'teal'];
    const safeColor = ALLOWED_COLORS.includes(color) ? color : 'gray';

    try {
        await connectDB();

        await Folder.findOneAndUpdate(
            { folderId, userId: user.userId },
            {
                $set: {
                    name:      name.trim().slice(0, 64),
                    color:     safeColor,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    userId:   user.userId,
                    folderId,
                },
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'Folder saved' });
    } catch (err) {
        console.error('Folder save error:', err);
        res.status(500).json({ error: 'Failed to save folder' });
    }
}