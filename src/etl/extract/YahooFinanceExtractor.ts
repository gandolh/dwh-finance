import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { YahooFinanceRequest, YahooFinanceResponse } from '../../types/externalApi.ts';
import dayjs from 'dayjs';

export class YahooFinanceExtractor extends BaseExtractor {
  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const period1 = startDate ? dayjs(startDate).unix() : dayjs().subtract(1, 'year').unix();
    const period2 = endDate ? dayjs(endDate).unix() : dayjs().unix();

    const requestUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const params: YahooFinanceRequest = {
      period1,
      period2,
      interval: '1d',
      includePrePost: false,
      events: 'div,splits',
    };

    try {
      const response = await axios.get<YahooFinanceResponse>(requestUrl, { params });

      if (response.data.chart.error) {
        throw new Error(`Yahoo Finance Error: ${response.data.chart.error}`);
      }

      if (!response.data.chart.result || response.data.chart.result.length === 0) {
        throw new Error(`Yahoo Finance: No data found for ${symbol}`);
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators.quote[0];

      return timestamps.map((timestamp: number, index: number) => ({
        timestamp: dayjs.unix(timestamp).toDate(),
        data: {
          open: quotes.open[index],
          high: quotes.high[index],
          low: quotes.low[index],
          close: quotes.close[index],
          volume: quotes.volume[index],
        },
      }));
    } catch (error) {
      throw error;
    }
  }
}
