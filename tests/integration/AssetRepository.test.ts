import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { AssetRepository } from '../../src/dal/repositories/AssetRepository.ts';
import { AssetVersion } from '../../src/dal/models/AssetVersion.ts';
import { Asset } from '../../src/dal/models/Asset.ts';
import { startMongo, stopMongo, clearDatabase } from '../helpers/mongoTestServer.ts';

describe('AssetRepository (SCD Type 2)', () => {
  const repository = new AssetRepository();

  beforeAll(startMongo);
  afterAll(stopMongo);
  afterEach(clearDatabase);

  it('creates an asset with its first version on save', async () => {
    const asset = await repository.save(
      { symbol: 'AAPL', type: 'stock', region: 'US', description: 'Apple Inc.' },
      'Yahoo Finance'
    );

    expect(asset.symbol).toBe('AAPL');

    const versions = await AssetVersion.find({ assetId: asset._id });
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].validFrom).toBeInstanceOf(Date);
    expect(versions[0].validTo).toBeUndefined();
  });

  it('opens a new version and closes the previous one on update', async () => {
    const first = await repository.save({ symbol: 'AAPL', type: 'stock', region: 'US' }, 'Yahoo Finance');
    const firstVersionId = first.latestVersionId;

    const second = await repository.save({ symbol: 'AAPL', type: 'stock', region: 'EU' }, 'Polygon');

    const versions = await AssetVersion.find({ assetId: first._id }).sort({ version: 1 });
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => v.version)).toEqual([1, 2]);

    expect(versions[0].validTo).toBeInstanceOf(Date);
    expect(versions[1].validTo).toBeUndefined();

    expect(String(second.latestVersionId)).not.toBe(String(firstVersionId));
    const reloaded = await Asset.findById(first._id);
    expect(reloaded!.region).toBe('EU');
  });

  it('keeps a full ordered history via getHistory', async () => {
    await repository.save({ symbol: 'AAPL', type: 'stock', region: 'US' }, 'Yahoo Finance');
    await repository.save({ symbol: 'AAPL', type: 'stock', region: 'EU' }, 'Polygon');
    await repository.save({ symbol: 'AAPL', type: 'stock', region: 'APAC' }, 'Polygon');

    const asset = await repository.findBySymbol('AAPL');
    const history = await repository.getHistory(asset!._id as any);

    expect(history.map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it('answers as-of queries by picking the version whose window contains the date', async () => {
    const v1Start = new Date('2024-01-01T00:00:00Z');
    const v2Start = new Date('2024-06-01T00:00:00Z');

    const asset = await repository.save({ symbol: 'AAPL', type: 'stock', region: 'US' }, 'Yahoo Finance');

    await AssetVersion.updateOne({ assetId: asset._id, version: 1 }, { validFrom: v1Start, validTo: v2Start });
    const v2 = await new AssetVersion({
      assetId: asset._id,
      symbol: 'AAPL',
      version: 2,
      dataProviderName: 'Polygon',
      attributes: {},
      validFrom: v2Start,
    }).save();

    const asOfMarch = await repository.findAsOf(asset._id as any, new Date('2024-03-01T00:00:00Z'));
    const asOfJuly = await repository.findAsOf(asset._id as any, new Date('2024-07-01T00:00:00Z'));

    expect(asOfMarch!.version).toBe(1);
    expect(String(asOfJuly!._id)).toBe(String(v2._id));
  });

  it('soft-deletes by writing a new version flagged isDeleted, never dropping rows', async () => {
    const asset = await repository.save({ symbol: 'AAPL', type: 'stock', region: 'US' }, 'Yahoo Finance');

    await repository.softDelete(asset._id as any, 'Yahoo Finance');

    const reloaded = await Asset.findById(asset._id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.isDeleted).toBe(true);

    const versions = await AssetVersion.find({ assetId: asset._id });
    expect(versions).toHaveLength(2);
  });

  it('excludes soft-deleted assets from the default findAll listing', async () => {
    const live = await repository.save({ symbol: 'AAPL', type: 'stock', region: 'US' }, 'Yahoo Finance');
    const gone = await repository.save({ symbol: 'TSLA', type: 'stock', region: 'US' }, 'Yahoo Finance');
    await repository.softDelete(gone._id as any, 'Yahoo Finance');

    const listed = await repository.findAll();
    const symbols = listed.map((a) => a.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).not.toContain('TSLA');
    expect(live.isDeleted).toBe(false);
  });
});
