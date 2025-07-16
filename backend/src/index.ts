// Initialize Sentry before any other imports
import { initSentry } from './config/sentry';
initSentry();

import express from 'express';
import { config } from './config/environment';
import logger from './config/logger';
import { httpLogger } from './middleware/logging';
import { securityHeaders, corsOptions, helmetOptions, requestSizeLimits, sanitizeInput, sqlInjectionProtection, xssProtection } from './middleware/security';
import { sentryUserContext, sentryErrorHandler, sentryPerformanceMiddleware, sentryErrorHandlerMiddleware } from './middleware/sentry';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import userRoutes from './routes/users';
import healthRoutes from './routes/health';
import monitoringRoutes from './routes/monitoring';
import { errorLogger } from './middleware/logging';
import { sessionCleanupService } from './services/sessionCleanupService';
import { Request, Response } from 'express';

console.log('Starting backend/src/index.ts');
console.log('Loaded config:', config);

const app = express();
const PORT = config.PORT;

app.use(httpLogger);
app.use(sentryPerformanceMiddleware);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(helmet(helmetOptions));
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(sentryUserContext);

// Health check endpoints (before authentication)
app.use('/health', healthRoutes);

// Monitoring endpoints (requires authentication)
app.use('/api/monitoring', monitoringRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    message: 'Resume Builder API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      monitoring: '/api/monitoring',
      health: '/health'
    },
    documentation: 'Coming soon...'
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Error logging middleware (before global error handler)
app.use(errorLogger);

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);
app.use(sentryErrorHandlerMiddleware);

// Catch-all route for undefined endpoints (must be last)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'ENDPOINT_NOT_FOUND',
    message: 'The requested endpoint was not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      ...(isDevelopment && { details: err.message })
    });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'FILE_TOO_LARGE',
      message: 'File size exceeds limit'
    });
  }
  return res.status(err.status || 500).json({
    success: false,
    error: err.code || 'SERVER_ERROR',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack, details: err })
  });
});

// Start session cleanup service (runs every 24 hours)
sessionCleanupService.start(24);
logger.info('Session cleanup service started');

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});