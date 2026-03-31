import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { Folder } from '../../lib/models/Folder.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        await connectDB();

        const folders = await Folder.find({ userId: user.userId })
            .sort({ name: 1 })
            .lean();

        const foldersMap: Record<string, object> = {};
        for (const folder of folders) {
            foldersMap[folder.folderId] = {
                id:    folder.folderId,
                name:  folder.name,
                color: folder.color,
            };
        }

        res.status(200).json({ folders: foldersMap });
    } catch (err) {
        console.error('Folder list error:', err);
        res.status(500).json({ error: 'Failed to load folders' });
    }
}