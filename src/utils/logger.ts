const isDevelopment = process.env.NODE_ENV !== 'production';

export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:mm:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
};

import pino from 'pino';
export const logger = pino(loggerConfig);

export default logger;
