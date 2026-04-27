import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';
import { UserData } from '../../lib/models/userData.js';
import { encryptKeys } from '../../lib/crypto.js';
import { checkRateLimit } from '../../lib/rateLimit.js';

const ALLOWED_KEYS = ['google', 'openai', 'anthropic', 'groq', 'openrouter', 'mistral'];
const MAX_KEY_LENGTH = 512; // API keys are never longer than this

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return;

    const { keys, selectedModel } = req.body ?? {};

    // Whitelist key names and cap value length — reject unknown fields and oversized values
    const safeKeys: Record<string, string> = {};
    if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
        for (const provider of ALLOWED_KEYS) {
            const val = keys[provider];
            if (typeof val === 'string') {
                safeKeys[provider] = val.slice(0, MAX_KEY_LENGTH);
            } else {
                safeKeys[provider] = '';
            }
        }
    } else {
        for (const provider of ALLOWED_KEYS) safeKeys[provider] = '';
    }

    const safeModel = typeof selectedModel === 'string' ? selectedModel.slice(0, 200) : '';

    try {
        await connectDB();

        const allowed = await checkRateLimit('data_save', req, res, user.userId, 30);
        if (!allowed) return;

        await UserData.findOneAndUpdate(
            { userId: user.userId },
            {
                userId: user.userId,
                keys: encryptKeys(safeKeys),
                selectedModel: safeModel,
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
