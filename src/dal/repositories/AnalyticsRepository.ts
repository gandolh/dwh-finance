import { AnalyticsSummary } from '../models/AnalyticsSummary.ts';
import { PricePrediction } from '../models/PricePrediction.ts';
import mongoose from 'mongoose';

export class AnalyticsRepository {
  async getYearlySummary(assetId?: string) {
    const analyticsQuery: any = {};
    if (assetId) {
      analyticsQuery.assetId = new mongoose.Types.ObjectId(assetId);
    }
    return await AnalyticsSummary.find(analyticsQuery).exec();
  }

  async getLatestPredictions() {
    return await PricePrediction.find().sort({ label_time: -1 }).limit(10).exec();
  }
}
