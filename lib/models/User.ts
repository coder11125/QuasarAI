import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    userId: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    userId:       { type: String, required: true, unique: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt:    { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);