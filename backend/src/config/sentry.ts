import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from './environment';

const SENTRY_DSN = config.SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment and service information
    environment: config.NODE_ENV,
    serverName: 'resume-builder-backend',
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.postgresIntegration(),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (config.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        return null;
      }
      
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Filter out specific error types
        if (error instanceof Error) {
          // Skip validation errors (these are expected user errors)
          if (error.message.includes('ValidationError') || 
              error.message.includes('Invalid input') ||
              error.message.includes('Bad Request')) {
            return null;
          }
          
          // Skip authentication errors (normal part of operation)
          if (error.message.includes('Unauthorized') ||
              error.message.includes('Invalid token') ||
              error.message.includes('Access denied')) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Transaction filtering
    beforeSendTransaction(event) {
      // Don't track health check requests in production
      if (config.NODE_ENV === 'production' && 
          event.request?.url?.includes('/health')) {
        return null;
      }
      
      return event;
    },
  });
};

// Helper function to add user context to Sentry
export const setSentryUser = (user: { id: string; email?: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

// Helper function to add extra context
export const setSentryContext = (key: string, context: any) => {
  Sentry.setContext(key, context);
};

// Helper function to capture exceptions with additional context
export const captureException = (error: Error, context?: Record<string, any>) => {
  return Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    return Sentry.captureException(error);
  });
};

// Helper function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    return Sentry.captureMessage(message);
  });
};

export default Sentry; 