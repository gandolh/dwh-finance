import mongoose, { Schema, Document } from 'mongoose';
import dayjs from 'dayjs';

export interface ExchangeRecordInterface extends Document {
  assetId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  timestamp: Date;
  year: number;
  data: Record<string, any>;
  version: number;
  isDeleted: boolean;
  ingestedAt: Date;
}

const ExchangeRecordSchema: Schema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'DataProvider', required: true },
    timestamp: { type: Date, required: true },
    year: { type: Number, required: true },
    data: { type: Map, of: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
    ingestedAt: { type: Date, default: () => dayjs().toDate() },
  },
  { timestamps: true }
);

ExchangeRecordSchema.index({ assetId: 1, providerId: 1, year: -1, timestamp: -1 }, { unique: true });

ExchangeRecordSchema.index({ assetId: 1, timestamp: -1 });

export const ExchangeRecord = mongoose.model<ExchangeRecordInterface>('ExchangeRecord', ExchangeRecordSchema);
