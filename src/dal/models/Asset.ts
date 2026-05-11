import mongoose, { Schema, Document } from 'mongoose';

export interface AssetInterface extends Document {
  symbol: string;
  type: 'stock' | 'bond' | 'crypto' | 'commodity' | 'index' | 'other';
  region: string;
  description?: string;
  latestVersionId: mongoose.Types.ObjectId;
  isDeleted: boolean;
}

const AssetSchema: Schema = new Schema(
  {
    symbol: { type: String, required: true, unique: true },
    type: { type: String, enum: ['stock', 'bond', 'crypto', 'commodity', 'index', 'other'], required: true },
    region: { type: String, required: true },
    description: { type: String },
    latestVersionId: { type: Schema.Types.ObjectId, ref: 'AssetVersion' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AssetSchema.index({ isDeleted: 1 });

export const Asset = mongoose.model<AssetInterface>('Asset', AssetSchema);
