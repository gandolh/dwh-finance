import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { PolygonRequest, PolygonResponse } from '../../types/externalApi.ts';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

export class PolygonExtractor extends BaseExtractor {
  private apiKey = process.env.POLYGON_API_KEY || '';

  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const from = startDate ? dayjs(startDate).format('YYYY-MM-DD') : '2023-01-01';
    const to = endDate ? dayjs(endDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    const requestUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`;

    const params: PolygonRequest = {
      apiKey: this.apiKey,
      adjusted: true,
      sort: 'asc',
    };

    try {
      const response = await axios.get<PolygonResponse>(requestUrl, { params });
      const results = response.data.results;

      if (!results) {
        throw new Error(`Polygon: No results for ${symbol}. Status: ${response.data.status}`);
      }

      return results.map((result) => ({
        timestamp: dayjs(result.timestamp).toDate(),
        data: {
          open: result.open,
          high: result.high,
          low: result.low,
          close: result.close,
          volume: result.volume,
          vwap: result.volumeWeightedAveragePrice,
        },
      }));
    } catch (error) {
      throw error;
    }
  }
}
