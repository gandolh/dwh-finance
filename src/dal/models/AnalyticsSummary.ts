import mongoose, { Schema, Document } from 'mongoose';

export interface AnalyticsSummaryInterface extends Document {
  assetId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  year: number;
  avg_close: number;
  max_high: number;
  min_low: number;
  record_count: number;
}

const AnalyticsSummarySchema: Schema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'DataProvider', required: true },
    year: { type: Number, required: true },
    avg_close: { type: Number },
    max_high: { type: Number },
    min_low: { type: Number },
    record_count: { type: Number },
  },
  {
    collection: 'analytics_yearly_summary',
    timestamps: false,
  }
);

export const AnalyticsSummary = mongoose.model<AnalyticsSummaryInterface>('AnalyticsSummary', AnalyticsSummarySchema);
