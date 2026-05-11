import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { TwelveDataRequest, TwelveDataResponse } from '../../types/externalApi.ts';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

export class TwelveDataExtractor extends BaseExtractor {
  private apiKey = process.env.TWELVE_DATA_API_KEY || '';

  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const requestUrl = `https://api.twelvedata.com/time_series`;

    const params: TwelveDataRequest = {
      symbol: symbol,
      interval: '1day',
      apikey: this.apiKey,
      outputsize: 5000,
    };

    if (startDate) params.start_date = dayjs(startDate).format('YYYY-MM-DD');
    if (endDate) params.end_date = dayjs(endDate).format('YYYY-MM-DD');

    try {
      const response = await axios.get<TwelveDataResponse>(requestUrl, { params });

      if (response.data.status !== 'ok') {
        throw new Error(`Twelve Data Error: ${response.data.message || 'Unknown error'}`);
      }

      const values = response.data.values;
      if (!values) {
        throw new Error(`Twelve Data: No data found for ${symbol}.`);
      }

      return values.map((value) => ({
        timestamp: dayjs(value.datetime).toDate(),
        data: {
          open: parseFloat(value.open),
          high: parseFloat(value.high),
          low: parseFloat(value.low),
          close: parseFloat(value.close),
          volume: parseInt(value.volume),
        },
      }));
    } catch (error) {
      throw error;
    }
  }
}
