import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { DataProviderRepository } from '../../src/dal/repositories/DataProviderRepository.ts';
import { DataProvider } from '../../src/dal/models/DataProvider.ts';
import { startMongo, stopMongo, clearDatabase } from '../helpers/mongoTestServer.ts';

describe('DataProviderRepository', () => {
  const repository = new DataProviderRepository();

  beforeAll(startMongo);
  afterAll(stopMongo);
  afterEach(clearDatabase);

  function providerData(overrides: Record<string, any> = {}) {
    return {
      name: 'Yahoo Finance',
      apiEndpoint: 'https://query1.finance.yahoo.com',
      apiVersion: 'v8',
      ...overrides,
    };
  }

  it('creates a provider on first save', async () => {
    const provider = await repository.save(providerData());
    expect(provider!.name).toBe('Yahoo Finance');
    expect(provider!.isActive).toBe(true);
    expect(await DataProvider.countDocuments()).toBe(1);
  });

  it('upserts on name rather than creating duplicates', async () => {
    await repository.save(providerData({ apiVersion: 'v8' }));
    const updated = await repository.save(providerData({ apiVersion: 'v9' }));

    expect(await DataProvider.countDocuments({ name: 'Yahoo Finance' })).toBe(1);
    expect(updated!.apiVersion).toBe('v9');
  });

  it('findByName returns null for an unknown provider', async () => {
    expect(await repository.findByName('Nope')).toBeNull();
  });

  it('findAll returns only active providers', async () => {
    await repository.save(providerData({ name: 'Active One' }));
    await repository.save(providerData({ name: 'Retired One', isActive: false }));

    const active = await repository.findAll();
    const names = active.map((p) => p.name);
    expect(names).toContain('Active One');
    expect(names).not.toContain('Retired One');
  });

  it('updateAttributes unions newly discovered fields without dropping old ones', async () => {
    await repository.save(providerData({ discoveredAttributes: ['open', 'close'] }));

    await repository.updateAttributes('Yahoo Finance', ['close', 'volume']);
    const after = await repository.findByName('Yahoo Finance');

    expect([...after!.discoveredAttributes].sort()).toEqual(['close', 'open', 'volume']);
  });
});
