import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AnalyticsRepository } from '../../dal/repositories/AnalyticsRepository.ts';

const analyticsRepository = new AnalyticsRepository();

export const analyticsRoutes = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
  fastify.get('/summaries', async (request, reply) => {
    const { assetId } = request.query as { assetId?: string };
    const summaries = await analyticsRepository.getYearlySummary(assetId);
    return summaries;
  });

  fastify.get('/predictions', async (request, reply) => {
    const { assetId } = request.query as { assetId?: string };
    if (!assetId) {
      // Predictions are per-asset; without one there is nothing meaningful to
      // chart. Return empty so the UI can prompt the user to pick an asset.
      return [];
    }
    const predictions = await analyticsRepository.getLatestPredictions(assetId);
    return predictions;
  });
};
