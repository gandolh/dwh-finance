import mongoose from 'mongoose';
import { AssetRepository } from '../../dal/repositories/AssetRepository.ts';
import { DataProviderRepository } from '../../dal/repositories/DataProviderRepository.ts';
import { RawTimeSeriesPoint } from '../extract/BaseExtractor.ts';

export class DataTransformer {
  private assetRepository = new AssetRepository();
  private dataProviderRepository = new DataProviderRepository();

  async transform(
    providerName: string,
    rawData: RawTimeSeriesPoint[],
    symbol: string,
    assetType: 'stock' | 'bond' | 'crypto' | 'commodity' | 'index' | 'other',
    region: string
  ) {
    let provider = await this.dataProviderRepository.findByName(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} must be registered first.`);
    }

    let asset = await this.assetRepository.findBySymbol(symbol);
    if (!asset) {
      asset = await this.assetRepository.save(
        {
          symbol,
          type: assetType,
          region,
          description: `Imported from ${providerName}`,
        },
        providerName
      );
    }

    return rawData.map((point) => ({
      assetId: asset!._id as mongoose.Types.ObjectId,
      providerId: provider!._id as mongoose.Types.ObjectId,
      timestamp: point.timestamp,
      data: point.data,
    }));
  }

  extractAttributeKeys(data: RawTimeSeriesPoint[]): string[] {
    const keys = new Set<string>();
    data.forEach((point) => Object.keys(point.data).forEach((key) => keys.add(key)));
    return Array.from(keys);
  }
}
