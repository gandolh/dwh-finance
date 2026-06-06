import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { DataTransformer } from '../../src/etl/transform/DataTransformer.ts';
import { DataProviderRepository } from '../../src/dal/repositories/DataProviderRepository.ts';
import { AssetRepository } from '../../src/dal/repositories/AssetRepository.ts';
import { RawTimeSeriesPoint } from '../../src/etl/extract/BaseExtractor.ts';
import { startMongo, stopMongo, clearDatabase } from '../helpers/mongoTestServer.ts';

describe('DataTransformer (integration)', () => {
  const transformer = new DataTransformer();
  const providerRepository = new DataProviderRepository();
  const assetRepository = new AssetRepository();

  const rawData: RawTimeSeriesPoint[] = [
    { timestamp: new Date('2024-01-02'), data: { close: 100 } },
    { timestamp: new Date('2024-01-03'), data: { close: 101 } },
  ];

  beforeAll(startMongo);
  afterAll(stopMongo);
  afterEach(clearDatabase);

  async function registerProvider() {
    await providerRepository.save({ name: 'Yahoo Finance', apiEndpoint: 'https://x', apiVersion: 'v8' });
  }

  it('refuses to transform for an unregistered provider', async () => {
    await expect(transformer.transform('Ghost Provider', rawData, 'AAPL', 'stock', 'US')).rejects.toThrow(
      /must be registered first/
    );
  });

  it('auto-creates the asset on first sight and binds the ids', async () => {
    await registerProvider();

    const records = await transformer.transform('Yahoo Finance', rawData, 'AAPL', 'stock', 'US');

    expect(records).toHaveLength(2);
    expect(records[0].assetId).toBeDefined();
    expect(records[0].providerId).toBeDefined();
    expect(records[0].data).toEqual({ close: 100 });

    const asset = await assetRepository.findBySymbol('AAPL');
    expect(asset).not.toBeNull();
    expect(asset!.type).toBe('stock');
    expect(String(records[1].assetId)).toBe(String(asset!._id));
  });

  it('reuses an existing asset rather than creating a second one', async () => {
    await registerProvider();
    await transformer.transform('Yahoo Finance', rawData, 'AAPL', 'stock', 'US');
    const firstAsset = await assetRepository.findBySymbol('AAPL');

    await transformer.transform('Yahoo Finance', rawData, 'AAPL', 'stock', 'US');
    const secondAsset = await assetRepository.findBySymbol('AAPL');

    expect(String(secondAsset!._id)).toBe(String(firstAsset!._id));
  });
});
