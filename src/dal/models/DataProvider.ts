import mongoose, { Schema, Document } from 'mongoose';

export interface DataProviderInterface extends Document {
  name: string;
  description?: string;
  apiEndpoint: string;
  apiVersion: string;
  dataMapping: Record<string, string>;
  version: number;
  isActive: boolean;
  discoveredAttributes: string[];
}

const DataProviderSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    apiEndpoint: { type: String, required: true },
    apiVersion: { type: String, required: true },
    dataMapping: { type: Map, of: String, default: {} },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    discoveredAttributes: [{ type: String }],
  },
  { timestamps: true }
);

export const DataProvider = mongoose.model<DataProviderInterface>('DataProvider', DataProviderSchema);
