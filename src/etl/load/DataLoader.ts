import { ExchangeRecordRepository } from '../../dal/repositories/ExchangeRecordRepository.ts';
import { DataProviderRepository } from '../../dal/repositories/DataProviderRepository.ts';

import { logger } from '../../utils/logger.ts';

export class DataLoader {
  private exchangeRecordRepository = new ExchangeRecordRepository();
  private dataProviderRepository = new DataProviderRepository();

  async load(providerName: string, transformedRecords: any[]) {
    const loadResult = await this.exchangeRecordRepository.saveBatch(transformedRecords);
    logger.info(
      {
        provider: providerName,
        new: loadResult.upsertedCount,
        updated: loadResult.modifiedCount,
      },
      'Load complete'
    );
    return loadResult;
  }

  async updateDiscovery(providerName: string, attributeKeys: string[]) {
    return this.dataProviderRepository.updateAttributes(providerName, attributeKeys);
  }
}
