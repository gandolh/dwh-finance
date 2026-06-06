import mongoose, { Schema, Document } from 'mongoose';

export interface AnalyticsSummaryInterface extends Document {
  assetId: string;
  providerId: string;
  year: number;
  avg_close: number;
  max_high: number;
  min_low: number;
  record_count: number;
}

const AnalyticsSummarySchema: Schema = new Schema(
  {
    // Stored as plain strings by the Spark aggregation job (the Mongo Spark
    // connector represents ObjectId as string and cannot write it back as BSON).
    assetId: { type: String, required: true },
    providerId: { type: String, required: true },
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
