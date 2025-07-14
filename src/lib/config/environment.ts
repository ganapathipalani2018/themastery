// Frontend Environment Configuration
// This module handles environment-specific configuration for the Next.js frontend

export interface EnvironmentConfig {
  apiUrl: string;
  appEnv: 'development' | 'staging' | 'production';
  enableDevtools: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

// Get environment variables with fallbacks
function getEnvVar(key: string, fallback: string = ''): string {
  if (typeof window !== 'undefined') {
    // Client-side: environment variables are baked into the build
    return process.env[key] || fallback;
  }
  // Server-side: can access all environment variables
  return process.env[key] || fallback;
}

// Validate and create environment configuration
function createEnvironmentConfig(): EnvironmentConfig {
  const appEnv = getEnvVar('NEXT_PUBLIC_APP_ENV', 'development') as 'development' | 'staging' | 'production';
  const apiUrl = getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
  const enableDevtools = getEnvVar('NEXT_PUBLIC_ENABLE_DEVTOOLS', 'false') === 'true';

  // Validate required environment variables
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is required');
  }

  // Environment flags
  const isDevelopment = appEnv === 'development';
  const isStaging = appEnv === 'staging';
  const isProduction = appEnv === 'production';

  return {
    apiUrl,
    appEnv,
    enableDevtools: enableDevtools && isDevelopment, // Only enable in development
    isDevelopment,
    isStaging,
    isProduction,
  };
}

// Export the configuration
export const config = createEnvironmentConfig();

// Environment-specific API configurations
export const apiConfig = {
  baseURL: config.apiUrl,
  timeout: config.isDevelopment ? 30000 : 10000, // Longer timeout in development
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Feature flags based on environment
export const features = {
  enableDevtools: config.enableDevtools,
  enableRegistration: true, // Can be controlled via environment variables if needed
  enablePasswordReset: true,
  enableEmailVerification: !config.isDevelopment, // Disabled in development by default
  enableAnalytics: config.isProduction,
  enableErrorReporting: !config.isDevelopment,
};

// UI configuration based on environment
export const uiConfig = {
  showEnvironmentBadge: !config.isProduction,
  environmentBadgeText: config.appEnv.toUpperCase(),
  environmentBadgeColor: config.isDevelopment 
    ? 'bg-green-500' 
    : config.isStaging 
    ? 'bg-yellow-500' 
    : 'bg-red-500',
};

// Logging configuration
export const loggingConfig = {
  level: config.isDevelopment ? 'debug' : config.isStaging ? 'info' : 'warn',
  enableConsoleLogging: !config.isProduction,
  enableRemoteLogging: config.isProduction || config.isStaging,
};

// Utility functions
export function getEnvironmentInfo() {
  return {
    appEnv: config.appEnv,
    apiUrl: config.apiUrl,
    isDevelopment: config.isDevelopment,
    isStaging: config.isStaging,
    isProduction: config.isProduction,
    features,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
  };
}

export function validateEnvironment() {
  const requiredVars = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_APP_ENV'];
  const missing = requiredVars.filter(varName => !getEnvVar(varName));
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    if (config.isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Log environment info in development
if (config.isDevelopment && typeof window !== 'undefined') {
  console.log('Environment Configuration:', getEnvironmentInfo());
}

export default config; 