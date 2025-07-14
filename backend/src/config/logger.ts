import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config, isDevelopment } from './environment';

// Custom log format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject: Record<string, any> = {
      timestamp,
      level,
      message,
      environment: config.NODE_ENV,
      service: 'resume-builder-backend',
    };
    
    // Add meta data if it exists
    if (meta && typeof meta === 'object') {
      Object.assign(logObject, meta);
    }
    
    // Add stack trace if it exists
    if (stack) {
      logObject.stack = stack;
    }
    
    return JSON.stringify(logObject);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
  })
);

// Create logs directory
const logsDir = path.join(__dirname, '../../logs');

// Configure transports
const transports: winston.transport[] = [];

// Console transport for development
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
} else {
  // Simplified console for production
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: logFormat,
    })
  );
}

// File transports for all environments
{
  // Combined logs (all levels)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
      format: logFormat,
    })
  );

  // Error logs only
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
    })
  );

  // Debug logs for development
  if (isDevelopment) {
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'debug-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '7d',
        level: 'debug',
        format: logFormat,
      })
    );
  }
}

// Create the logger
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logsDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logsDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
  })
);

// Utility functions for structured logging
export const loggerUtils = {
  // Log HTTP requests
  logRequest: (req: any, res: any, duration: number) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
    });
  },

  // Log authentication events
  logAuth: (event: string, userId?: string, details?: any) => {
    logger.info('Authentication Event', {
      event,
      userId,
      ...details,
    });
  },

  // Log database operations
  logDatabase: (operation: string, table: string, details?: any) => {
    logger.debug('Database Operation', {
      operation,
      table,
      ...details,
    });
  },

  // Log errors with context
  logError: (error: Error, context?: any) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  },

  // Log security events
  logSecurity: (event: string, details?: any) => {
    logger.warn('Security Event', {
      event,
      ...details,
    });
  },

  // Log performance metrics
  logPerformance: (operation: string, duration: number, details?: any) => {
    logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  },
};

export default logger; 