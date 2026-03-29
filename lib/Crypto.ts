import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV — recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag — GCM default

const RAW_KEY = process.env.ENCRYPTION_KEY;
if (!RAW_KEY) throw new Error('ENCRYPTION_KEY environment variable is not set');

// Accept either a 64-char hex string (32 bytes) or a base64 string that decodes to 32 bytes
let KEY: Buffer;
if (/^[0-9a-fA-F]{64}$/.test(RAW_KEY)) {
    KEY = Buffer.from(RAW_KEY, 'hex');
} else {
    KEY = Buffer.from(RAW_KEY, 'base64');
}
if (KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
}

/**
 * Encrypts a plaintext string.
 * Returns a single string: hex(iv) + ':' + hex(authTag) + ':' + hex(ciphertext)
 * The format is self-contained — no external state needed to decrypt.
 */
export function encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a value produced by encrypt().
 * Returns the original plaintext string, or null if the value is empty/blank
 * (so unset keys round-trip cleanly as empty strings).
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decrypt(ciphertext: string): string {
    if (!ciphertext) return '';

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        // Value is not in our encrypted format — return as-is.
        // This handles existing plaintext keys in the DB during migration.
        return ciphertext;
    }

    const [ivHex, tagHex, dataHex] = parts;
    const iv       = Buffer.from(ivHex,  'hex');
    const authTag  = Buffer.from(tagHex, 'hex');
    const data     = Buffer.from(dataHex,'hex');

    const decipher = createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(data),
        decipher.final(),
    ]).toString('utf8');
}

/**
 * Encrypts all API key fields in a keys object.
 * Only encrypts non-empty strings so blank keys stay blank.
 */
export function encryptKeys(keys: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [provider, key] of Object.entries(keys)) {
        result[provider] = key ? encrypt(key) : '';
    }
    return result;
}

/**
 * Decrypts all API key fields in a keys object.
 */
export function decryptKeys(keys: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [provider, key] of Object.entries(keys)) {
        result[provider] = key ? decrypt(key) : '';
    }
    return result;
}