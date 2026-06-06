import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { ExchangeRecordRepository } from '../../src/dal/repositories/ExchangeRecordRepository.ts';
import { ExchangeRecord } from '../../src/dal/models/ExchangeRecord.ts';
import { startMongo, stopMongo, clearDatabase } from '../helpers/mongoTestServer.ts';

describe('ExchangeRecordRepository', () => {
  const repository = new ExchangeRecordRepository();

  const assetId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();

  beforeAll(startMongo);
  afterAll(stopMongo);
  afterEach(clearDatabase);

  function point(timestamp: string, data: Record<string, any>) {
    return { assetId, providerId, timestamp: new Date(timestamp), data };
  }

  it('derives the partition year from the timestamp on save', async () => {
    const saved = await repository.save(point('2024-03-15T00:00:00Z', { close: 100 }));
    expect(saved!.year).toBe(2024);
    expect(saved!.version).toBe(1);
  });

  it('upserts the same key instead of duplicating, bumping the version', async () => {
    await repository.save(point('2024-03-15T00:00:00Z', { close: 100 }));
    const second = await repository.save(point('2024-03-15T00:00:00Z', { close: 101 }));

    const all = await ExchangeRecord.find({ assetId, providerId });
    expect(all).toHaveLength(1);
    expect(second!.version).toBe(2);
    expect(second!.data.get('close')).toBe(101);
  });

  it('saveBatch upserts a whole window in one round trip', async () => {
    const result = await repository.saveBatch([
      point('2024-03-15T00:00:00Z', { close: 100 }),
      point('2024-03-16T00:00:00Z', { close: 101 }),
      point('2024-03-17T00:00:00Z', { close: 102 }),
    ]);

    expect(result.upsertedCount).toBe(3);
    expect(await ExchangeRecord.countDocuments({ assetId, providerId })).toBe(3);
  });

  it('saveBatch re-run over an overlapping window updates rather than duplicates', async () => {
    await repository.saveBatch([
      point('2024-03-15T00:00:00Z', { close: 100 }),
      point('2024-03-16T00:00:00Z', { close: 101 }),
    ]);
    const rerun = await repository.saveBatch([
      point('2024-03-16T00:00:00Z', { close: 999 }),
      point('2024-03-17T00:00:00Z', { close: 102 }),
    ]);

    expect(rerun.upsertedCount).toBe(1);
    expect(rerun.modifiedCount).toBe(1);
    expect(await ExchangeRecord.countDocuments({ assetId, providerId })).toBe(3);
  });

  it('findLatest returns the most recent record by year then timestamp', async () => {
    await repository.saveBatch([
      point('2023-12-31T00:00:00Z', { close: 1 }),
      point('2024-03-15T00:00:00Z', { close: 2 }),
      point('2024-03-16T00:00:00Z', { close: 3 }),
    ]);

    const latest = await repository.findLatest(assetId);
    expect(latest!.data.get('close')).toBe(3);
  });

  it('findTimeSeries returns records within the window, newest first', async () => {
    await repository.saveBatch([
      point('2024-03-14T00:00:00Z', { close: 1 }),
      point('2024-03-15T00:00:00Z', { close: 2 }),
      point('2024-03-16T00:00:00Z', { close: 3 }),
      point('2024-03-20T00:00:00Z', { close: 4 }),
    ]);

    const series = await repository.findTimeSeries(
      assetId,
      providerId,
      new Date('2024-03-15T00:00:00Z'),
      new Date('2024-03-16T23:59:59Z')
    );

    expect(series.map((r) => r.data.get('close'))).toEqual([3, 2]);
  });

  it('findTimeSeries honours a cursor for keyset pagination', async () => {
    await repository.saveBatch([
      point('2024-03-15T00:00:00Z', { close: 1 }),
      point('2024-03-16T00:00:00Z', { close: 2 }),
      point('2024-03-17T00:00:00Z', { close: 3 }),
    ]);

    const firstPage = await repository.findTimeSeries(
      assetId,
      providerId,
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-31T00:00:00Z'),
      undefined,
      2
    );
    expect(firstPage.map((r) => r.data.get('close'))).toEqual([3, 2]);

    const last = firstPage[firstPage.length - 1];
    const secondPage = await repository.findTimeSeries(
      assetId,
      providerId,
      new Date('2024-03-01T00:00:00Z'),
      new Date('2024-03-31T00:00:00Z'),
      { timestamp: last.timestamp, id: last._id as mongoose.Types.ObjectId },
      2
    );
    expect(secondPage.map((r) => r.data.get('close'))).toEqual([1]);
  });

  it('findProvidersForAsset returns the distinct providers seen for an asset', async () => {
    const otherProvider = new mongoose.Types.ObjectId();
    await repository.save(point('2024-03-15T00:00:00Z', { close: 1 }));
    await repository.save({
      assetId,
      providerId: otherProvider,
      timestamp: new Date('2024-03-15T00:00:00Z'),
      data: { close: 2 },
    });

    const providers = await repository.findProvidersForAsset(assetId);
    expect(providers.map(String).sort()).toEqual([String(providerId), String(otherProvider)].sort());
  });
});
