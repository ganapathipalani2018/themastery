import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay (for debugging)
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Error filtering
  beforeSend(event, hint) {
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
      return null;
    }
    
    // Filter out known non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Filter out network errors that are expected
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          // Don't send fetch errors unless they're server errors
          return null;
        }
        
        if (error.message.includes('Non-Error promise rejection')) {
          return null;
        }
      }
    }
    
    return event;
  },
  
  // Additional context
  initialScope: {
    tags: {
      component: 'frontend',
    },
  },
  
  // Integration configuration
  integrations: [
    // Replay integration would be added here if needed
    // new Sentry.Replay({
    //   maskAllText: true,
    //   blockAllMedia: true,
    // }),
  ],
}); 