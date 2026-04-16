import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set');

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis._mongoose ?? (globalThis._mongoose = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI as string, {
            bufferCommands: false,
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null; // allow retry on next request
        throw err;
    }
    return cached.conn;
}
