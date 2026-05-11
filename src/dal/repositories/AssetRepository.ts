import { Asset, AssetInterface } from '../models/Asset.ts';
import { AssetVersion, AssetVersionInterface } from '../models/AssetVersion.ts';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

export class AssetRepository {
  async findAll(offset = 0, limit = 20, asOf?: Date) {
    if (asOf) {
      const validVersions = await AssetVersion.find({
        validFrom: { $lte: asOf },
        $or: [{ validTo: { $gt: asOf } }, { validTo: { $exists: false } }, { validTo: null }],
      })
        .select('assetId')
        .skip(offset)
        .limit(limit);

      const assetIds = validVersions.map((version) => version.assetId);
      return Asset.find({ _id: { $in: assetIds } }).populate('latestVersionId');
    }

    return Asset.find({ isDeleted: false }).skip(offset).limit(limit).populate('latestVersionId');
  }

  async findById(id: string | mongoose.Types.ObjectId) {
    return Asset.findById(id).populate('latestVersionId');
  }

  async findBySymbol(symbol: string) {
    return Asset.findOne({ symbol }).populate('latestVersionId');
  }

  async save(assetData: Partial<AssetInterface>, dataProviderName: string, attributes: Record<string, any> = {}) {
    let asset = await Asset.findOne({ symbol: assetData.symbol });
    let versionNumber = 1;

    if (asset) {
      const latestVersion = await AssetVersion.findById(asset.latestVersionId);
      if (latestVersion) {
        versionNumber = latestVersion.version + 1;
        latestVersion.validTo = dayjs().toDate();
        await latestVersion.save();
      }

      if (assetData.type) asset.type = assetData.type;
      if (assetData.region) asset.region = assetData.region;
      if (assetData.description) asset.description = assetData.description;
      asset.isDeleted = assetData.isDeleted ?? false;
    } else {
      asset = new Asset({
        symbol: assetData.symbol,
        type: assetData.type,
        region: assetData.region,
        description: assetData.description,
      });
    }

    const newVersion = new AssetVersion({
      assetId: asset._id,
      symbol: asset.symbol,
      version: versionNumber,
      dataProviderName,
      attributes,
      validFrom: dayjs().toDate(),
      isDeleted: asset.isDeleted,
    });

    await newVersion.save();

    asset.latestVersionId = newVersion._id as mongoose.Types.ObjectId;
    await asset.save();

    return asset.populate('latestVersionId');
  }

  async softDelete(id: string | mongoose.Types.ObjectId, dataProviderName: string) {
    const asset = await Asset.findById(id);
    if (!asset) throw new Error('Asset not found');

    return this.save({ ...asset.toObject(), isDeleted: true }, dataProviderName);
  }

  async getHistory(assetId: string | mongoose.Types.ObjectId) {
    return AssetVersion.find({ assetId }).sort({ version: -1 });
  }

  async findAsOf(assetId: string | mongoose.Types.ObjectId, date: Date) {
    return AssetVersion.findOne({
      assetId,
      validFrom: { $lte: date },
      $or: [{ validTo: { $gt: date } }, { validTo: { $exists: false } }, { validTo: null }],
    });
  }
}
