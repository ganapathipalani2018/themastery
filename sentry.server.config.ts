import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.APP_VERSION || '1.0.0',
  
  // Error filtering for server-side
  beforeSend(event, hint) {
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    
    return event;
  },
  
  // Additional context
  initialScope: {
    tags: {
      component: 'server',
    },
  },
}); 