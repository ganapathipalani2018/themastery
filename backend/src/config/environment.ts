import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment file based on NODE_ENV
const envFile = `.env.${NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

// Try to load environment-specific file first, then fallback to .env
dotenv.config({ path: envPath });
dotenv.config(); // Fallback to .env

// Environment validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default(3001),
  
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default(5433),
  DB_NAME: z.string().default('resumebuilderdb'),
  DB_USER: z.string().default('resumeuser'),
  DB_PASSWORD: z.string().default('resumepass123'),
  DB_SSL: z.string().transform(val => val === 'true').default(false),
  DB_MAX_CONNECTIONS: z.string().transform(Number).default(20),
  DB_CONNECTION_TIMEOUT: z.string().transform(Number).default(30000),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Security
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default(12),
  SESSION_SECRET: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().transform(val => val === 'true').default(false),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(5),
  PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(3),
  
  // CORS
  CORS_ORIGIN: z.string().optional(),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default(true),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
  
  // Email Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(Number).optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  
  // SendGrid Configuration
  SENDGRID_API_KEY: z.string().optional(),
  DEFAULT_EMAIL_SENDER: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default(5242880), // 5MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // External Services
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  
  // Feature Flags
  ENABLE_REGISTRATION: z.string().transform(val => val !== 'false').default(true),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default(false),
  ENABLE_PASSWORD_RESET: z.string().transform(val => val !== 'false').default(true),
  ENABLE_SWAGGER_DOCS: z.string().transform(val => val !== 'false').default(true),
});

// Validate environment variables
function validateEnvironment() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.issues.forEach((issue: z.ZodIssue) => {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Environment validation failed.');
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnvironment();

// Environment-specific configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isStaging = config.NODE_ENV === 'staging';
export const isProduction = config.NODE_ENV === 'production';

// Database configuration
export const dbConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  ssl: config.DB_SSL,
  max: config.DB_MAX_CONNECTIONS,
  connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT,
  idleTimeoutMillis: 30000,
};

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

// Security configuration
export const securityConfig = {
  bcryptSaltRounds: config.BCRYPT_SALT_ROUNDS,
  sessionSecret: config.SESSION_SECRET,
  cookieDomain: config.COOKIE_DOMAIN,
  cookieSecure: config.COOKIE_SECURE,
  corsOrigin: config.CORS_ORIGIN,
  corsCredentials: config.CORS_CREDENTIALS,
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  authMaxRequests: config.AUTH_RATE_LIMIT_MAX_REQUESTS,
  passwordResetMaxRequests: config.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS,
};

// Google OAuth configuration
export const googleOAuthConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  redirectUri: config.GOOGLE_REDIRECT_URI,
};

// Email configuration
export const emailConfig = {
  sendgridApiKey: config.SENDGRID_API_KEY,
  defaultSender: config.DEFAULT_EMAIL_SENDER,
  frontendUrl: config.FRONTEND_URL,
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  user: config.EMAIL_USER,
  password: config.EMAIL_PASSWORD,
  from: config.EMAIL_FROM,
};

// Feature flags
export const features = {
  enableRegistration: config.ENABLE_REGISTRATION,
  enableEmailVerification: config.ENABLE_EMAIL_VERIFICATION,
  enablePasswordReset: config.ENABLE_PASSWORD_RESET,
  enableSwaggerDocs: config.ENABLE_SWAGGER_DOCS,
};

// Logging configuration
export const loggingConfig = {
  level: config.LOG_LEVEL,
  file: config.LOG_FILE,
};

// Utility function to get environment info
export function getEnvironmentInfo() {
  return {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    isDevelopment,
    isStaging,
    isProduction,
    features,
    database: {
      host: config.DB_HOST,
      port: config.DB_PORT,
      name: config.DB_NAME,
      ssl: config.DB_SSL,
    },
  };
}

// Utility function to validate required secrets in production
export function validateProductionSecrets() {
  if (isProduction) {
    const requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_PASSWORD',
    ];
    
    const missingSecrets = requiredSecrets.filter(secret => 
      !process.env[secret] || process.env[secret] === 'your-secret-key-change-in-production'
    );
    
    if (missingSecrets.length > 0) {
      console.error('Missing or default production secrets:');
      missingSecrets.forEach(secret => console.error(`  ${secret}`));
      throw new Error('Missing or default production secrets.');
    }
  }
}

export default config; 