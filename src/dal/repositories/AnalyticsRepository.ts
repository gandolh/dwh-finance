import { AnalyticsSummary } from '../models/AnalyticsSummary.ts';
import { PricePrediction } from '../models/PricePrediction.ts';

export class AnalyticsRepository {
  async getYearlySummary(assetId?: string) {
    const analyticsQuery: any = {};
    if (assetId) {
      // The Spark aggregation job stores assetId as a plain string (the Mongo
      // Spark connector reads ObjectId fields as strings and cannot write them
      // back as BSON ObjectIds), so match on the string, not an ObjectId.
      analyticsQuery.assetId = assetId;
    }
    return await AnalyticsSummary.find(analyticsQuery).exec();
  }

  async getLatestPredictions(assetId: string) {
    // Predictions are per-asset (the Spark job trains one model per assetId and
    // stores it as a plain string), so always scope to a single asset. Sort by
    // time ascending so the chart's actual/prediction lines read left-to-right.
    return await PricePrediction.find({ assetId }).sort({ label_time: 1 }).exec();
  }
}
