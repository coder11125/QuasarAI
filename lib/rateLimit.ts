import { VercelRequest, VercelResponse } from '@vercel/node';
import { RateLimit } from './models/RateLimit.js';

const MAX_ATTEMPTS = 10;        // max attempts per window
const WINDOW_MINUTES = 15;      // rolling window length

/**
 * Extracts the client IP from a Vercel request.
 * Vercel sets x-forwarded-for; fall back to socket address.
 */
function getIp(req: VercelRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Checks and increments the rate limit for a given action + IP.
 *
 * Returns true if the request is allowed.
 * Returns false and sends a 429 response if the limit is exceeded.
 *
 * Usage:
 *   const allowed = await checkRateLimit('login', req, res);
 *   if (!allowed) return;
 */
export async function checkRateLimit(
    action: string,
    req: VercelRequest,
    res: VercelResponse
): Promise<boolean> {
    const ip = getIp(req);
    const key = `${action}:${ip}`;
    const now = new Date();
    const resetAt = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);

    const doc = await RateLimit.findOneAndUpdate(
        { key },
        {
            $inc: { attempts: 1 },
            $setOnInsert: { resetAt },  // only set resetAt when first creating the doc
        },
        { upsert: true, new: true }
    );

    if (doc.attempts > MAX_ATTEMPTS) {
        const retryAfterSecs = Math.ceil((doc.resetAt.getTime() - now.getTime()) / 1000);
        res.setHeader('Retry-After', String(retryAfterSecs));
        res.status(429).json({
            error: `Too many attempts. Please try again in ${WINDOW_MINUTES} minutes.`,
        });
        return false;
    }

    return true;
}