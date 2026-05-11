import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { logger } from '../utils/logger.ts';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwh_finance';

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB Connected successfully');
  } catch (error) {
    logger.error({ error }, 'MongoDB connection error');
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
