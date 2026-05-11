import { DataProvider, DataProviderInterface } from '../models/DataProvider.ts';
import mongoose from 'mongoose';

export class DataProviderRepository {
  async findAll() {
    return DataProvider.find({ isActive: true });
  }

  async findByName(name: string) {
    return DataProvider.findOne({ name });
  }

  async save(providerData: Partial<DataProviderInterface>) {
    return DataProvider.findOneAndUpdate(
      { name: providerData.name },
      { $set: providerData },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  async updateAttributes(name: string, newAttributes: string[]) {
    return DataProvider.findOneAndUpdate(
      { name },
      { $addToSet: { discoveredAttributes: { $each: newAttributes } } },
      { returnDocument: 'after' }
    );
  }
}
