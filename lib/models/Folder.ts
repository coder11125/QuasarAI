import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
    userId:   string;
    folderId: string;
    name:     string;
    color:    string;
    updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>({
    userId:    { type: String, required: true, index: true },
    folderId:  { type: String, required: true, unique: true },
    name:      { type: String, required: true, maxlength: 64 },
    color:     { type: String, default: 'gray' },
    updatedAt: { type: Date, default: Date.now },
});

FolderSchema.index({ userId: 1, name: 1 });

export const Folder = mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);