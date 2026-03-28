import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET environment variable is not set');

export interface TokenPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string = '7d'): string {
    return jwt.sign(payload, SECRET as string, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, SECRET as string) as TokenPayload;
}