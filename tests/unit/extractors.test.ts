import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';

import { FrankfurterExtractor } from '../../src/etl/extract/FrankfurterExtractor.ts';
import { CoinGeckoExtractor } from '../../src/etl/extract/CoinGeckoExtractor.ts';
import { YahooFinanceExtractor } from '../../src/etl/extract/YahooFinanceExtractor.ts';
import { AlphaVantageExtractor } from '../../src/etl/extract/AlphaVantageExtractor.ts';
import { PolygonExtractor } from '../../src/etl/extract/PolygonExtractor.ts';
import { TwelveDataExtractor } from '../../src/etl/extract/TwelveDataExtractor.ts';
import type { DataProviderInterface } from '../../src/dal/models/DataProvider.ts';

const stubProvider = { name: 'Test Provider' } as DataProviderInterface;

const getMock = vi.fn();

vi.mock('axios', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    isAxiosError: () => false,
  },
}));

beforeEach(() => {
  getMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FrankfurterExtractor', () => {
  it('splits a BASE..TARGET symbol into from/to params and maps rates by date', async () => {
    getMock.mockResolvedValue({
      data: {
        rates: {
          '2024-01-02': { USD: 1.09 },
          '2024-01-03': { USD: 1.1 },
        },
      },
    });

    const extractor = new FrankfurterExtractor(stubProvider);
    const points = await extractor.fetch('EUR..USD');

    const [, config] = getMock.mock.calls[0];
    expect(config.params).toEqual({ from: 'EUR', to: 'USD' });

    expect(points).toHaveLength(2);
    expect(points[0].data).toEqual({ USD: 1.09 });
    expect(dayjs(points[0].timestamp).format('YYYY-MM-DD')).toBe('2024-01-02');
  });

  it('defaults to EUR->USD when the symbol has no target', async () => {
    getMock.mockResolvedValue({ data: { rates: {} } });

    await new FrankfurterExtractor(stubProvider).fetch('EUR');

    const [, config] = getMock.mock.calls[0];
    expect(config.params).toEqual({ from: 'EUR', to: 'USD' });
  });
});

describe('CoinGeckoExtractor', () => {
  it('maps [timestampMs, price] tuples into price points', async () => {
    const jan2 = dayjs('2024-01-02').valueOf();
    const jan3 = dayjs('2024-01-03').valueOf();
    getMock.mockResolvedValue({
      data: {
        prices: [
          [jan2, 42000],
          [jan3, 43000],
        ],
      },
    });

    const points = await new CoinGeckoExtractor(stubProvider).fetch('bitcoin');

    expect(points).toHaveLength(2);
    expect(points[0].data).toEqual({ price: 42000 });
  });

  it('filters out points that fall outside the requested window', async () => {
    const inside = dayjs('2024-01-10').valueOf();
    const before = dayjs('2024-01-01').valueOf();
    const after = dayjs('2024-02-01').valueOf();
    getMock.mockResolvedValue({
      data: {
        prices: [
          [before, 1],
          [inside, 2],
          [after, 3],
        ],
      },
    });

    const points = await new CoinGeckoExtractor(stubProvider).fetch(
      'bitcoin',
      dayjs('2024-01-05').toDate(),
      dayjs('2024-01-20').toDate()
    );

    expect(points).toHaveLength(1);
    expect(points[0].data).toEqual({ price: 2 });
  });
});

describe('YahooFinanceExtractor', () => {
  it('zips the parallel OHLCV arrays into per-timestamp points', async () => {
    const ts = dayjs('2024-01-02').unix();
    getMock.mockResolvedValue({
      data: {
        chart: {
          error: null,
          result: [
            {
              timestamp: [ts],
              indicators: {
                quote: [
                  {
                    open: [100],
                    high: [110],
                    low: [95],
                    close: [105],
                    volume: [1_000],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const points = await new YahooFinanceExtractor(stubProvider).fetch('AAPL');

    expect(points).toHaveLength(1);
    expect(points[0].data).toEqual({ open: 100, high: 110, low: 95, close: 105, volume: 1_000 });
  });

  it('throws when the chart payload carries an error', async () => {
    getMock.mockResolvedValue({ data: { chart: { error: 'Not Found', result: null } } });

    await expect(new YahooFinanceExtractor(stubProvider).fetch('NOPE')).rejects.toThrow(/Yahoo Finance Error/);
  });

  it('throws when no result rows come back', async () => {
    getMock.mockResolvedValue({ data: { chart: { error: null, result: [] } } });

    await expect(new YahooFinanceExtractor(stubProvider).fetch('NOPE')).rejects.toThrow(/No data found/);
  });
});

describe('AlphaVantageExtractor', () => {
  it('parses the string-typed daily quotes into numeric OHLCV', async () => {
    getMock.mockResolvedValue({
      data: {
        'Time Series (Daily)': {
          '2024-01-02': {
            '1. open': '100.5',
            '2. high': '110.0',
            '3. low': '95.25',
            '4. close': '105.75',
            '5. volume': '1000000',
          },
        },
      },
    });

    const points = await new AlphaVantageExtractor(stubProvider).fetch('AAPL');

    expect(points).toHaveLength(1);
    expect(points[0].data).toEqual({ open: 100.5, high: 110, low: 95.25, close: 105.75, volume: 1_000_000 });
  });

  it('throws when the API returns a rate-limit Note', async () => {
    getMock.mockResolvedValue({ data: { Note: 'Thank you for using Alpha Vantage! Our standard API rate limit...' } });

    await expect(new AlphaVantageExtractor(stubProvider).fetch('AAPL')).rejects.toThrow(/Error\/Limit/);
  });

  it('throws when there is no time series and no explicit error', async () => {
    getMock.mockResolvedValue({ data: {} });

    await expect(new AlphaVantageExtractor(stubProvider).fetch('AAPL')).rejects.toThrow(/No data found/);
  });
});

describe('PolygonExtractor', () => {
  it('maps aggregate bars and surfaces vwap', async () => {
    getMock.mockResolvedValue({
      data: {
        status: 'OK',
        results: [
          {
            timestamp: dayjs('2024-01-02').valueOf(),
            open: 100,
            high: 110,
            low: 95,
            close: 105,
            volume: 5000,
            volumeWeightedAveragePrice: 103.2,
          },
        ],
      },
    });

    const points = await new PolygonExtractor(stubProvider).fetch('AAPL');

    expect(points).toHaveLength(1);
    expect(points[0].data).toEqual({ open: 100, high: 110, low: 95, close: 105, volume: 5000, vwap: 103.2 });
  });

  it('throws when results are absent', async () => {
    getMock.mockResolvedValue({ data: { status: 'NOT_AUTHORIZED' } });

    await expect(new PolygonExtractor(stubProvider).fetch('AAPL')).rejects.toThrow(/No results/);
  });
});

describe('TwelveDataExtractor', () => {
  it('parses string OHLCV values and forwards date-range params', async () => {
    getMock.mockResolvedValue({
      data: {
        status: 'ok',
        values: [{ datetime: '2024-01-02', open: '100', high: '110', low: '95', close: '105', volume: '1000' }],
      },
    });

    const start = dayjs('2024-01-01').toDate();
    const end = dayjs('2024-01-31').toDate();
    const points = await new TwelveDataExtractor(stubProvider).fetch('AAPL', start, end);

    const [, config] = getMock.mock.calls[0];
    expect(config.params.start_date).toBe('2024-01-01');
    expect(config.params.end_date).toBe('2024-01-31');

    expect(points[0].data).toEqual({ open: 100, high: 110, low: 95, close: 105, volume: 1000 });
  });

  it('throws on a non-ok status', async () => {
    getMock.mockResolvedValue({ data: { status: 'error', message: 'invalid symbol' } });

    await expect(new TwelveDataExtractor(stubProvider).fetch('NOPE')).rejects.toThrow(/invalid symbol/);
  });
});
