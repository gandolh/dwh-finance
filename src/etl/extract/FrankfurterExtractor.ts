import axios from 'axios';
import { BaseExtractor, RawTimeSeriesPoint } from './BaseExtractor.ts';
import { FrankfurterRequest, FrankfurterResponse } from '../../types/externalApi.ts';
import dayjs from 'dayjs';

export class FrankfurterExtractor extends BaseExtractor {
  async fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]> {
    const [base, target] = symbol.split('..');
    const start = startDate ? dayjs(startDate).format('YYYY-MM-DD') : '1999-01-01';
    const end = endDate ? dayjs(endDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    const requestUrl = `https://api.frankfurter.app/${start}..${end}`;

    const params: FrankfurterRequest = {
      from: base || 'EUR',
      to: target || 'USD',
    };

    try {
      const response = await axios.get<FrankfurterResponse>(requestUrl, { params });
      const rates = response.data.rates;

      return Object.entries(rates).map(([date, values]: [string, any]) => ({
        timestamp: dayjs(date).toDate(),
        data: values,
      }));
    } catch (error) {
      throw error;
    }
  }
}
