import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
    key: string;       // e.g. "login:1.2.3.4" or "register:1.2.3.4"
    attempts: number;
    resetAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
    key:      { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0 },
    resetAt:  { type: Date, required: true },
});

// TTL index — MongoDB automatically deletes documents after resetAt
// This keeps the collection clean with no manual cleanup needed
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);