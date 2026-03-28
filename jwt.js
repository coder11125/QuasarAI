import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET environment variable is not set');

/**
 * Sign a JWT token for a given user payload.
 * @param {object} payload - e.g. { userId, email }
 * @param {string} expiresIn - e.g. '7d'
 */
export function signToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, SECRET, { expiresIn });
}

/**
 * Verify and decode a JWT token.
 * Throws if invalid or expired.
 * @param {string} token
 */
export function verifyToken(token) {
    return jwt.verify(token, SECRET);
}
