import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { setSentryUser, setSentryContext } from '../config/sentry';
import logger from '../config/logger';

// Middleware to add user context to Sentry
export const sentryUserContext = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (user) {
    setSentryUser({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    });
  }
  
  // Add request context
  setSentryContext('request', {
    id: (req as any).requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  next();
};

// Middleware to capture and handle errors with Sentry
export const sentryErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Add additional context for the error
  Sentry.withScope((scope) => {
    // Add request information
    scope.setTag('method', req.method);
    scope.setTag('url', req.url);
    scope.setTag('statusCode', res.statusCode);
    scope.setContext('request', {
      id: (req as any).requestId,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: req.headers,
      ip: req.ip,
    });
    
    // Add user context if available
    const user = (req as any).user;
    if (user) {
      scope.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    }
    
    // Add error fingerprint for better grouping
    scope.setFingerprint([
      error.name,
      error.message,
      req.method,
      req.url,
    ]);
    
    // Set error level based on status code
    if (res.statusCode >= 500) {
      scope.setLevel('error');
    } else if (res.statusCode >= 400) {
      scope.setLevel('warning');
    } else {
      scope.setLevel('info');
    }
    
    // Capture the exception
    const sentryId = Sentry.captureException(error);
    
    // Log the error with Sentry ID for correlation
    logger.error('Error captured by Sentry', {
      sentryId,
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userId: user?.id,
      requestId: (req as any).requestId,
    });
    
    // Add Sentry ID to response headers for debugging
    res.setHeader('X-Sentry-ID', sentryId);
  });
  
  // Continue with the next error handler
  next(error);
};

// Middleware to capture performance metrics
export const sentryPerformanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override end function to capture timing
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Add custom timing data to Sentry
    Sentry.setContext('performance', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: duration,
      requestSize: req.get('content-length') || 0,
      responseSize: res.get('content-length') || 0,
    });
    
    // Log performance metrics
    logger.info('Request performance', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: duration,
      requestId: (req as any).requestId,
    });
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Simple error handler that captures exceptions with Sentry
export const sentryErrorHandlerMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Capture the error with Sentry
  Sentry.captureException(error);
  
  // Continue with the next error handler
  next(error);
}; 