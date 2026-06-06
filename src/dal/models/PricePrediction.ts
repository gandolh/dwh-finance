import mongoose, { Schema, Document } from 'mongoose';

export interface PricePredictionInterface extends Document {
  assetId: string;
  label_time: number;
  label: number;
  prediction: number;
}

const PricePredictionSchema: Schema = new Schema(
  {
    // Stored as a plain string by the Spark prediction job (the Mongo Spark
    // connector represents ObjectId as string and cannot write it back as BSON).
    assetId: { type: String, required: true },
    label_time: { type: Number, required: true },
    label: { type: Number, required: true },
    prediction: { type: Number, required: true },
  },
  {
    collection: 'price_predictions',
    timestamps: false,
  }
);

export const PricePrediction = mongoose.model<PricePredictionInterface>('PricePrediction', PricePredictionSchema);
