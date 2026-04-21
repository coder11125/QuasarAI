import mongoose, { Document, Schema } from 'mongoose';

export interface IUserKeys {
    google:     string;
    openai:     string;
    anthropic:  string;
    groq:       string;
    openrouter: string;
    mistral:    string;
}

export interface IUserData extends Document {
    userId:        string;
    keys:          IUserKeys;
    selectedModel: string;
    updatedAt:     Date;
}

const UserDataSchema = new Schema<IUserData>({
    userId: { type: String, required: true, unique: true },
    keys: {
        google:     { type: String, default: '' },
        openai:     { type: String, default: '' },
        anthropic:  { type: String, default: '' },
        groq:       { type: String, default: '' },
        openrouter: { type: String, default: '' },
        mistral:    { type: String, default: '' },
    },
    selectedModel: { type: String, default: '' },
    updatedAt:     { type: Date, default: Date.now },
});

export const UserData = mongoose.models.UserData || mongoose.model<IUserData>('UserData', UserDataSchema);
