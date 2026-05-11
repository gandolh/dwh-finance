import { DataProviderInterface } from '../../dal/models/DataProvider.ts';

export interface RawTimeSeriesPoint {
  timestamp: Date;
  data: Record<string, any>;
}

export abstract class BaseExtractor {
  constructor(protected provider: DataProviderInterface) {}

  abstract fetch(symbol: string, startDate?: Date, endDate?: Date): Promise<RawTimeSeriesPoint[]>;

  protected identifyAttributes(data: RawTimeSeriesPoint[]): string[] {
    const attributeSet = new Set<string>();
    data.forEach((point) => {
      Object.keys(point.data).forEach((key) => attributeSet.add(key));
    });
    return Array.from(attributeSet);
  }

  getProviderName(): string {
    return this.provider.name;
  }
}
