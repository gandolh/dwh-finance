import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { AlphaVantageRequest, AlphaVantageResponse, AlphaVantageDailyQuote } from '../../types/externalApi.ts';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

// Alpha Vantage's free tier enforces ~1 request/second.
const MIN_REQUEST_INTERVAL_MS = 1200;
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const waitMs = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

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
      await throttle();
      const response = await axios.get<AlphaVantageResponse>(requestUrl, { params });

      const apiMessage = response.data['Error Message'] || response.data['Note'] || response.data['Information'];
      if (apiMessage) {
        throw new Error(`Alpha Vantage Error/Limit for ${symbol}: ${apiMessage}`);
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
