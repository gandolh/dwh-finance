import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { AlphaVantageRequest, AlphaVantageResponse, AlphaVantageDailyQuote } from '../../types/externalApi.ts';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

export class AlphaVantageExtractor extends BaseExtractor {
  private apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';

  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const requestUrl = `https://www.alphavantage.co/query`;

    const params: AlphaVantageRequest = {
      function: 'TIME_SERIES_DAILY',
      symbol: symbol,
      apikey: this.apiKey,
      outputsize: startDate ? 'compact' : 'full',
    };

    try {
      const response = await axios.get<AlphaVantageResponse>(requestUrl, { params });

      if (response.data['Error Message'] || response.data['Note']) {
        throw new Error(
          `Alpha Vantage Error/Limit for ${symbol}: ${response.data['Error Message'] || response.data['Note']}`
        );
      }

      const timeSeries = response.data['Time Series (Daily)'];

      if (!timeSeries) {
        throw new Error(`Alpha Vantage: No data found for ${symbol}. Check API key or symbol.`);
      }

      return Object.entries(timeSeries)
        .map(([date, values]: [string, AlphaVantageDailyQuote]) => ({
          timestamp: dayjs(date).toDate(),
          data: {
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseFloat(values['5. volume']),
          },
        }))
        .filter((point) => {
          if (startDate && dayjs(point.timestamp).isBefore(dayjs(startDate))) return false;
          if (endDate && dayjs(point.timestamp).isAfter(dayjs(endDate))) return false;
          return true;
        });
    } catch (error) {
      throw error;
    }
  }
}
