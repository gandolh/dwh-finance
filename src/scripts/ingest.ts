import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { handleAxiosError } from '../utils/axiosErrorHandler.ts';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../config/database.ts';
import { IngestionService } from '../etl/IngestionService.ts';
import { AlphaVantageExtractor } from '../etl/extract/AlphaVantageExtractor.ts';
import { CoinGeckoExtractor } from '../etl/extract/CoinGeckoExtractor.ts';
import { FrankfurterExtractor } from '../etl/extract/FrankfurterExtractor.ts';
import { PolygonExtractor } from '../etl/extract/PolygonExtractor.ts';
import { TwelveDataExtractor } from '../etl/extract/TwelveDataExtractor.ts';
import { YahooFinanceExtractor } from '../etl/extract/YahooFinanceExtractor.ts';
import { DataProviderRepository } from '../dal/repositories/DataProviderRepository.ts';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataProviderRepository = new DataProviderRepository();
const ingestionService = new IngestionService();

const extractors: Record<string, any> = {
  AlphaVantage: AlphaVantageExtractor,
  CoinGecko: CoinGeckoExtractor,
  Frankfurter: FrankfurterExtractor,
  Polygon: PolygonExtractor,
  TwelveData: TwelveDataExtractor,
  YahooFinance: YahooFinanceExtractor,
};

async function runInteractiveCLI() {
  logger.info('🚀 Financial DWH Ingestion CLI Started');

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'providers',
      message: 'Select data sources to ingest from (uses configurations in src/scripts/data/):',
      choices: Object.keys(extractors),
      validate: (input) => (input.length > 0 ? true : 'You must select at least one provider.'),
    },
  ]);

  const { providers } = answers;

  const spinner = ora('Connecting to database...').start();
  try {
    await connectDatabase();
    spinner.succeed(chalk.green('Connected to database.'));

    for (const providerName of providers) {
      logger.info({ provider: providerName }, 'Processing provider');

      const configPath = path.join(__dirname, 'data', `${providerName}.json`);
      let providerConfigurations;
      try {
        const fileContent = await fs.readFile(configPath, 'utf-8');
        providerConfigurations = JSON.parse(fileContent);
      } catch (error) {
        logger.warn({ path: configPath }, 'No config file found. Skipping.');
        continue;
      }

      if (!Array.isArray(providerConfigurations)) {
        logger.error({ provider: providerName }, 'Invalid config format. Expected an array.');
        continue;
      }

      for (const providerConfiguration of providerConfigurations) {
        const { symbol, assetType, region } = providerConfiguration;
        const providerSpinner = ora(`Ingesting ${chalk.bold(symbol)} from ${chalk.bold(providerName)}...`).start();

        try {
          let provider = await dataProviderRepository.findByName(providerName);
          if (!provider) {
            providerSpinner.text = `Registering provider ${providerName}...`;
            provider = await dataProviderRepository.save({
              name: providerName,
              isActive: true,
              apiEndpoint: 'external-api',
              apiVersion: 'v1',
            });
          }

          const ExtractorClass = extractors[providerName];
          const extractor = new ExtractorClass(provider);

          const ingestionResult = await ingestionService.ingest(extractor, symbol, assetType || 'stock', region || 'US');

          providerSpinner.succeed(
            chalk.green(`Finished ${chalk.bold(symbol)}: `) +
              chalk.white(`${ingestionResult.upsertedCount} new, ${ingestionResult.modifiedCount} updated.`)
          );
        } catch (error: any) {
          const errorMessage = handleAxiosError(error);
          providerSpinner.fail(chalk.red(`Failed ${chalk.bold(symbol)}: ${errorMessage}`));
        }
      }
    }

    logger.info('✨ All selected ingestions completed.');
  } catch (error: any) {
    spinner.fail(chalk.red(`Critical Error: ${error.message}`));
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runInteractiveCLI();
