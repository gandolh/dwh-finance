import { describe, it, expect } from 'vitest';
import { DataTransformer } from '../../src/etl/transform/DataTransformer.ts';
import { BaseExtractor, RawTimeSeriesPoint } from '../../src/etl/extract/BaseExtractor.ts';
import type { DataProviderInterface } from '../../src/dal/models/DataProvider.ts';

const points: RawTimeSeriesPoint[] = [
  { timestamp: new Date('2024-01-01'), data: { open: 1, close: 2 } },
  { timestamp: new Date('2024-01-02'), data: { close: 3, volume: 4 } },
  { timestamp: new Date('2024-01-03'), data: { price: 5 } },
];

describe('DataTransformer.extractAttributeKeys', () => {
  const transformer = new DataTransformer();

  it('unions the keys across every point, de-duplicating', () => {
    expect(transformer.extractAttributeKeys(points).sort()).toEqual(['close', 'open', 'price', 'volume']);
  });

  it('returns an empty list for no data', () => {
    expect(transformer.extractAttributeKeys([])).toEqual([]);
  });
});

describe('BaseExtractor.identifyAttributes', () => {
  class TestExtractor extends BaseExtractor {
    async fetch(): Promise<RawTimeSeriesPoint[]> {
      return [];
    }

    publicIdentify(data: RawTimeSeriesPoint[]): string[] {
      return this.identifyAttributes(data);
    }
  }

  const extractor = new TestExtractor({ name: 'X' } as DataProviderInterface);

  it('unions keys the same way the transformer does', () => {
    expect(extractor.publicIdentify(points).sort()).toEqual(['close', 'open', 'price', 'volume']);
  });

  it('exposes the provider name', () => {
    expect(extractor.getProviderName()).toBe('X');
  });
});
