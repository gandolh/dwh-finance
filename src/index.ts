import { buildApp } from './api/app.ts';
import { connectDatabase } from './config/database.ts';
import dotenv from 'dotenv';
import { logger } from './utils/logger.ts';

dotenv.config();

async function start() {
  try {
    await connectDatabase();
    const application = await buildApp();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await application.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);
    logger.info(`Swagger docs available at http://${host}:${port}/docs`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

start();
