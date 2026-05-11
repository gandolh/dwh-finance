import { FastifyInstance } from 'fastify';
import { ExchangeRecordRepository } from '../../dal/repositories/ExchangeRecordRepository.ts';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

const exchangeRecordRepository = new ExchangeRecordRepository();

export async function dataRoutes(application: FastifyInstance) {
  application.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['assetId', 'providerId', 'startDate', 'endDate'],
          properties: {
            assetId: { type: 'string' },
            providerId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            limit: { type: 'number', default: 50 },
            cursorTimestamp: { type: 'string', format: 'date-time' },
            cursorId: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply) => {
      const { assetId, providerId, startDate, endDate, limit, cursorTimestamp, cursorId } = request.query;

      const cursor =
        cursorTimestamp && cursorId
          ? {
              timestamp: dayjs(cursorTimestamp).toDate(),
              id: new mongoose.Types.ObjectId(cursorId),
            }
          : undefined;

      const records = await exchangeRecordRepository.findTimeSeries(
        new mongoose.Types.ObjectId(assetId),
        new mongoose.Types.ObjectId(providerId),
        dayjs(startDate).toDate(),
        dayjs(endDate).toDate(),
        cursor,
        limit
      );

      const nextCursor =
        records.length === limit
          ? {
              cursorTimestamp: dayjs(records[records.length - 1].timestamp).toISOString(),
              cursorId: records[records.length - 1]._id.toString(),
            }
          : null;

      return {
        data: records,
        nextCursor,
      };
    }
  );

  application.get('/latest', async (request: any, reply) => {
    const { assetId, providerId } = request.query;
    if (!assetId) return reply.status(400).send({ error: 'assetId is required' });

    const latest = await exchangeRecordRepository.findLatest(
      new mongoose.Types.ObjectId(assetId as string),
      providerId ? new mongoose.Types.ObjectId(providerId as string) : undefined
    );

    if (!latest) return reply.status(404).send({ error: 'No data found' });
    return latest;
  });

  application.get('/providers-for-asset', async (request: any, reply) => {
    const { assetId } = request.query;
    if (!assetId) return reply.status(400).send({ error: 'assetId is required' });

    const providerIds = await exchangeRecordRepository.findProvidersForAsset(new mongoose.Types.ObjectId(assetId as string));
    return providerIds;
  });
}
