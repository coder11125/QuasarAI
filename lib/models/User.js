import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    userId:       { type: String, required: true, unique: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt:    { type: Date, default: Date.now },
});

// Avoid model recompilation in serverless environments
export const User = mongoose.models.User || mongoose.model('User', UserSchema);