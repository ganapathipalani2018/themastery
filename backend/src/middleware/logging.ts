import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger, { loggerUtils } from '../config/logger';

// Custom token for Morgan to log user ID
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom token for request ID (if available)
morgan.token('request-id', (req: Request) => {
  return (req as any).requestId || 'unknown';
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const startTime = (req as any).startTime;
  if (startTime) {
    return `${Date.now() - startTime}ms`;
  }
  return 'unknown';
});

// Morgan format for structured logging
const morganFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
  requestId: ':request-id',
  referrer: ':referrer',
});

// Morgan stream that writes to Winston
const morganStream = {
  write: (message: string) => {
    try {
      const logData = JSON.parse(message.trim());
      logger.info('HTTP Request', logData);
    } catch (error) {
      // Fallback to plain text if JSON parsing fails
      logger.info('HTTP Request', { message: message.trim() });
    }
  },
};

// Morgan middleware for HTTP request logging
export const httpLogger = morgan(morganFormat, {
  stream: morganStream,
  skip: (req: Request, res: Response) => {
    // Skip logging for health check endpoints in production
    if (req.url === '/health' || req.url === '/api/health') {
      return process.env.NODE_ENV === 'production';
    }
    return false;
  },
});

// Middleware to add request start time
export const requestTimer = (req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
};

// Middleware to add request ID
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = Math.random().toString(36).substring(2, 15);
  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// Error logging middleware
export const errorLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error with request context
  loggerUtils.logError(error, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    requestId: (req as any).requestId,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(error);
};

// Performance monitoring middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      loggerUtils.logPerformance('Slow Request', duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userId: (req as any).user?.id,
        requestId: (req as any).requestId,
      });
    }
    
    // Call original end method
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
};

// Security event logging middleware
export const securityLogger = {
  // Log authentication attempts
  logAuthAttempt: (req: Request, success: boolean, userId?: string, reason?: string) => {
    loggerUtils.logSecurity('Authentication Attempt', {
      success,
      userId,
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: (req as any).requestId,
    });
  },

  // Log rate limit violations
  logRateLimit: (req: Request, limit: number) => {
    loggerUtils.logSecurity('Rate Limit Exceeded', {
      limit,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      requestId: (req as any).requestId,
    });
  },

  // Log suspicious activity
  logSuspiciousActivity: (req: Request, activity: string, details?: any) => {
    loggerUtils.logSecurity('Suspicious Activity', {
      activity,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      requestId: (req as any).requestId,
      ...details,
    });
  },
};

export default {
  httpLogger,
  requestTimer,
  requestId,
  errorLogger,
  performanceLogger,
  securityLogger,
}; 