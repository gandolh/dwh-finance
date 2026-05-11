import mongoose, { Schema, Document } from 'mongoose';

export interface PricePredictionInterface extends Document {
  label_time: number;
  label: number;
  prediction: number;
}

const PricePredictionSchema: Schema = new Schema(
  {
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
