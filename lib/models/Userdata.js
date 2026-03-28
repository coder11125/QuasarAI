import mongoose from 'mongoose';

const UserDataSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    // API keys per provider
    keys: {
        google:      { type: String, default: '' },
        openai:      { type: String, default: '' },
        anthropic:   { type: String, default: '' },
        groq:        { type: String, default: '' },
        openrouter:  { type: String, default: '' },
    },

    // Selected model
    selectedModel: { type: String, default: '' },

    // Chat history — stored as raw JSON string to keep it flexible
    chats: { type: String, default: '{}' },

    updatedAt: { type: Date, default: Date.now },
});

export const UserData = mongoose.models.UserData || mongoose.model('UserData', UserDataSchema);