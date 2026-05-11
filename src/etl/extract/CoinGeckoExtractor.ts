import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { CoinGeckoRequest, CoinGeckoResponse } from '../../types/externalApi.ts';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

export class CoinGeckoExtractor extends BaseExtractor {
  private apiKey = process.env.COINGECKO_API_KEY || '';

  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const requestUrl = `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`;

    const params: CoinGeckoRequest = {
      vs_currency: 'usd',
      days: startDate ? '3' : 'max',
      interval: 'daily',
    };

    const headers = this.apiKey
      ? {
          'x-cg-demo-api-key': this.apiKey,
        }
      : {};

    try {
      const response = await axios.get<CoinGeckoResponse>(requestUrl, { params, headers });
      const prices = response.data.prices;

      return prices
        .map((item: [number, number]) => ({
          timestamp: dayjs(item[0]).toDate(),
          data: {
            price: item[1],
          },
        }))
        .filter((point: RawTimeSeriesPoint) => {
          if (startDate && dayjs(point.timestamp).isBefore(dayjs(startDate))) return false;
          if (endDate && dayjs(point.timestamp).isAfter(dayjs(endDate))) return false;
          return true;
        });
    } catch (error) {
      throw error;
    }
  }
}
