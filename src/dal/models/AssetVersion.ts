import mongoose, { Schema, Document } from 'mongoose';
import dayjs from 'dayjs';

export interface AssetVersionInterface extends Document {
  assetId: mongoose.Types.ObjectId;
  symbol: string;
  version: number;
  dataProviderName: string;
  isDeleted: boolean;
  attributes: Record<string, any>;
  validFrom: Date;
  validTo?: Date;
}

const AssetVersionSchema: Schema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    symbol: { type: String, required: true },
    version: { type: Number, required: true },
    dataProviderName: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    validFrom: { type: Date, required: true, default: () => dayjs().toDate() },
    validTo: { type: Date },
  },
  { timestamps: true }
);

AssetVersionSchema.index({ assetId: 1, version: -1 });
AssetVersionSchema.index({ assetId: 1, validFrom: 1, validTo: 1 });

export const AssetVersion = mongoose.model<AssetVersionInterface>('AssetVersion', AssetVersionSchema);
