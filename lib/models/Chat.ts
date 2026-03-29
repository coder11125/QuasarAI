import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
    role: 'user' | 'ai';
    text: string;
    attachment?: {
        name: string;
        type: string;
        data: string;
    } | null;
}

export interface IChat extends Document {
    userId:    string;
    chatId:    string;
    title:     string;
    messages:  IMessage[];
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    role:       { type: String, enum: ['user', 'ai'], required: true },
    text:       { type: String, default: '' },
    attachment: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const ChatSchema = new Schema<IChat>({
    userId:    { type: String, required: true, index: true },
    chatId:    { type: String, required: true, unique: true },
    title:     { type: String, default: 'New Chat' },
    messages:  { type: [MessageSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
});

// Compound index for fast per-user chat listing
ChatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);