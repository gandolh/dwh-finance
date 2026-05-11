import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { AssetRepository } from '../dal/repositories/AssetRepository.ts';
import { ExchangeRecordRepository } from '../dal/repositories/ExchangeRecordRepository.ts';
import { AnalyticsRepository } from '../dal/repositories/AnalyticsRepository.ts';
import { connectDatabase } from '../config/database.ts';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

const assetRepository = new AssetRepository();
const exchangeRecordRepository = new ExchangeRecordRepository();
const analyticsRepository = new AnalyticsRepository();

const mcpServer = new Server(
  {
    name: 'financial-dwh',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_assets',
        description: 'List all financial assets available in the warehouse',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number' },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'get_asset_details',
        description: 'Get detailed information about a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            asOf: { type: 'string', description: 'ISO date for historical state' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_time_series',
        description: 'Fetch time-series data for an asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['symbol', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_analytics_summary',
        description: 'Get yearly analytics summary (avg, max, min) for an asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
          required: ['symbol'],
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: mcpArguments } = request.params;

  try {
    switch (name) {
      case 'list_assets': {
        const offset = Number(mcpArguments?.offset) || 0;
        const limit = Number(mcpArguments?.limit) || 20;
        const assets = await assetRepository.findAll(offset, limit);
        return { content: [{ type: 'text', text: JSON.stringify(assets, null, 2) }] };
      }
      case 'get_asset_details': {
        const symbol = String(mcpArguments?.symbol);
        const asset = await assetRepository.findBySymbol(symbol);
        if (!asset) return { content: [{ type: 'text', text: 'Asset not found' }], isError: true };

        if (mcpArguments?.asOf) {
          const historical = await assetRepository.findAsOf(asset._id as any, dayjs(String(mcpArguments.asOf)).toDate());
          return { content: [{ type: 'text', text: JSON.stringify(historical || asset, null, 2) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(asset, null, 2) }] };
      }
      case 'get_time_series': {
        const symbol = String(mcpArguments?.symbol);
        const asset = await assetRepository.findBySymbol(symbol);
        if (!asset) return { content: [{ type: 'text', text: 'Asset not found' }], isError: true };

        const latest = await exchangeRecordRepository.findLatest(asset._id as any);
        if (!latest) return { content: [{ type: 'text', text: 'No data found' }] };

        const records = await exchangeRecordRepository.findTimeSeries(
          asset._id as any,
          latest.providerId,
          dayjs(String(mcpArguments?.startDate)).toDate(),
          dayjs(String(mcpArguments?.endDate)).toDate(),
          undefined,
          Number(mcpArguments?.limit) || 100
        );
        return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
      }
      case 'get_analytics_summary': {
        const symbol = String(mcpArguments?.symbol);
        const asset = await assetRepository.findBySymbol(symbol);
        if (!asset) return { content: [{ type: 'text', text: 'Asset not found' }], isError: true };

        const summaries = await analyticsRepository.getYearlySummary(asset._id as any);
        return { content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  await connectDatabase();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('Financial DWH MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
