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
    const predictions = await analyticsRepository.getLatestPredictions();
    return predictions;
  });
};
