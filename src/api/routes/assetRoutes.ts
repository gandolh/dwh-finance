import { FastifyInstance } from 'fastify';
import { AssetRepository } from '../../dal/repositories/AssetRepository.ts';
import dayjs from 'dayjs';

const assetRepository = new AssetRepository();

export async function assetRoutes(application: FastifyInstance) {
  application.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            offset: { type: 'number', default: 0 },
            limit: { type: 'number', default: 20 },
            asOf: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: any, reply) => {
      const { offset, limit, asOf } = request.query;
      const assets = await assetRepository.findAll(offset, limit, asOf ? dayjs(asOf as string).toDate() : undefined);
      return assets;
    }
  );

  application.get('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { asOf } = request.query;

    if (asOf) {
      const historicalVersion = await assetRepository.findAsOf(id, dayjs(asOf as string).toDate());
      if (!historicalVersion) {
        return reply.status(404).send({ error: 'No version found for the specified date' });
      }
      return historicalVersion;
    }

    const asset = await assetRepository.findById(id);
    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' });
    }
    return asset;
  });

  application.get('/:id/history', async (request: any, reply) => {
    const { id } = request.params;
    const history = await assetRepository.getHistory(id);
    return history;
  });
}
