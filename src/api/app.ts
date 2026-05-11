import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { assetRoutes } from './routes/assetRoutes.ts';
import { dataRoutes } from './routes/dataRoutes.ts';
import { providerRoutes } from './routes/providerRoutes.ts';
import { analyticsRoutes } from './routes/analyticsRoutes.ts';

import { loggerConfig } from '../utils/logger.ts';

export async function buildApp() {
  const application = fastify({
    logger: loggerConfig,
  });

  await application.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cg-demo-api-key'],
  });

  await application.register(swagger, {
    openapi: {
      info: {
        title: 'Financial Data Warehouse API',
        description: 'Bi-temporal DWH API with MCP support',
        version: '1.0.0',
      },
    },
  });

  await application.register(swaggerUi, {
    routePrefix: '/docs',
  });

  application.get('/health', async () => {
    return { status: 'OK' };
  });

  application.register(assetRoutes, { prefix: '/api/v1/assets' });
  application.register(dataRoutes, { prefix: '/api/v1/data' });
  application.register(providerRoutes, { prefix: '/api/v1/providers' });
  application.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

  return application;
}
