import { ExchangeRecord, ExchangeRecordInterface } from '../models/ExchangeRecord.ts';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

export class ExchangeRecordRepository {
  async save(recordData: {
    assetId: mongoose.Types.ObjectId;
    providerId: mongoose.Types.ObjectId;
    timestamp: Date;
    data: Record<string, any>;
  }) {
    const year = dayjs(recordData.timestamp).year();

    return ExchangeRecord.findOneAndUpdate(
      {
        assetId: recordData.assetId,
        providerId: recordData.providerId,
        timestamp: recordData.timestamp,
        year: year,
      },
      {
        $set: {
          data: recordData.data,
          ingestedAt: dayjs().toDate(),
        },
        $inc: { version: 1 },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );
  }

  async saveBatch(
    records: Array<{
      assetId: mongoose.Types.ObjectId;
      providerId: mongoose.Types.ObjectId;
      timestamp: Date;
      data: Record<string, any>;
    }>
  ) {
    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          assetId: record.assetId,
          providerId: record.providerId,
          timestamp: record.timestamp,
          year: dayjs(record.timestamp).year(),
        },
        update: {
          $set: {
            data: record.data,
            ingestedAt: dayjs().toDate(),
          },
          $inc: { version: 1 },
        },
        upsert: true,
      },
    }));

    return ExchangeRecord.bulkWrite(operations);
  }

  async findLatest(assetId: mongoose.Types.ObjectId, providerId?: mongoose.Types.ObjectId) {
    const exchangeRecordQuery: any = { assetId };
    if (providerId) exchangeRecordQuery.providerId = providerId;

    return ExchangeRecord.findOne(exchangeRecordQuery).sort({ year: -1, timestamp: -1 });
  }

  async findTimeSeries(
    assetId: mongoose.Types.ObjectId,
    providerId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date,
    cursor?: { timestamp: Date; id: mongoose.Types.ObjectId },
    limit = 100
  ) {
    const exchangeRecordQuery: any = {
      assetId,
      providerId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (cursor) {
      exchangeRecordQuery.$or = [{ timestamp: { $lt: cursor.timestamp } }, { timestamp: cursor.timestamp, _id: { $lt: cursor.id } }];
    }

    return ExchangeRecord.find(exchangeRecordQuery).sort({ timestamp: -1, _id: -1 }).limit(limit);
  }

  async findProvidersForAsset(assetId: mongoose.Types.ObjectId) {
    const providerIds = await ExchangeRecord.distinct('providerId', { assetId });
    return providerIds;
  }
}
