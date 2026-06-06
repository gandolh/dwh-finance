import { BaseExtractor, RawTimeSeriesPoint } from './extract/BaseExtractor.ts';
import { DataTransformer } from './transform/DataTransformer.ts';
import { DataLoader } from './load/DataLoader.ts';
import { handleAxiosError } from '../utils/axiosErrorHandler.ts';
import dayjs from 'dayjs';

import { logger } from '../utils/logger.ts';

export class IngestionService {
  private transformer = new DataTransformer();
  private loader = new DataLoader();

  async ingest(
    extractor: BaseExtractor,
    symbol: string,
    assetType: 'stock' | 'bond' | 'crypto' | 'commodity' | 'index' | 'other',
    region: string
  ) {
    const providerName = extractor.getProviderName();
    logger.info({ symbol, provider: providerName }, 'Starting ingestion');

    try {
      const extractedData = await this.extract(extractor, symbol);

      const transformedRecords = await this.transformer.transform(providerName, extractedData, symbol, assetType, region);

      const ingestionResult = await this.loader.load(providerName, transformedRecords);

      const attributeKeys = this.transformer.extractAttributeKeys(extractedData);
      await this.loader.updateDiscovery(providerName, attributeKeys);

      return ingestionResult;
    } catch (error) {
      handleAxiosError(error);
      throw error;
    }
  }

  private async extract(extractor: BaseExtractor, symbol: string): Promise<RawTimeSeriesPoint[]> {
    const endDate = dayjs();
    const startDate = dayjs().subtract(90, 'day');

    const data = await extractor.fetch(symbol, startDate.toDate(), endDate.toDate());
    logger.info({ count: data.length, symbol }, 'Extracted records');
    return data;
  }
}
