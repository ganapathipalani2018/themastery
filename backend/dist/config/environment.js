"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingConfig = exports.features = exports.rateLimitConfig = exports.securityConfig = exports.jwtConfig = exports.dbConfig = exports.isProduction = exports.isStaging = exports.isDevelopment = exports.config = void 0;
exports.getEnvironmentInfo = getEnvironmentInfo;
exports.validateProductionSecrets = validateProductionSecrets;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
// Load environment file based on NODE_ENV
const envFile = `.env.${NODE_ENV}`;
const envPath = path_1.default.resolve(process.cwd(), envFile);
// Try to load environment-specific file first, then fallback to .env
dotenv_1.default.config({ path: envPath });
dotenv_1.default.config(); // Fallback to .env
// Environment validation schema
const envSchema = zod_1.z.object({
    // Application
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    PORT: zod_1.z.string().transform(Number).default(3001),
    // Database
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.string().transform(Number).default(5433),
    DB_NAME: zod_1.z.string().default('resumebuilderdb'),
    DB_USER: zod_1.z.string().default('resumeuser'),
    DB_PASSWORD: zod_1.z.string().default('resumepass123'),
    DB_SSL: zod_1.z.string().transform(val => val === 'true').default(false),
    DB_MAX_CONNECTIONS: zod_1.z.string().transform(Number).default(20),
    DB_CONNECTION_TIMEOUT: zod_1.z.string().transform(Number).default(30000),
    // JWT Configuration
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Security
    BCRYPT_SALT_ROUNDS: zod_1.z.string().transform(Number).default(12),
    SESSION_SECRET: zod_1.z.string().optional(),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
    COOKIE_SECURE: zod_1.z.string().transform(val => val === 'true').default(false),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default(100),
    AUTH_RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default(5),
    PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default(3),
    // CORS
    CORS_ORIGIN: zod_1.z.string().optional(),
    CORS_CREDENTIALS: zod_1.z.string().transform(val => val === 'true').default(true),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE: zod_1.z.string().optional(),
    // Email (for future implementation)
    EMAIL_HOST: zod_1.z.string().optional(),
    EMAIL_PORT: zod_1.z.string().transform(Number).optional(),
    EMAIL_USER: zod_1.z.string().optional(),
    EMAIL_PASSWORD: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().optional(),
    // File Upload
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default(5242880), // 5MB
    UPLOAD_DIR: zod_1.z.string().default('./uploads'),
    // External Services
    REDIS_URL: zod_1.z.string().optional(),
    SENTRY_DSN: zod_1.z.string().optional(),
    // Feature Flags
    ENABLE_REGISTRATION: zod_1.z.string().transform(val => val !== 'false').default(true),
    ENABLE_EMAIL_VERIFICATION: zod_1.z.string().transform(val => val === 'true').default(false),
    ENABLE_PASSWORD_RESET: zod_1.z.string().transform(val => val !== 'false').default(true),
    ENABLE_SWAGGER_DOCS: zod_1.z.string().transform(val => val !== 'false').default(true),
});
// Validate environment variables
function validateEnvironment() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Environment validation failed:');
            error.issues.forEach((issue) => {
                console.error(`  ${issue.path.join('.')}: ${issue.message}`);
            });
            throw new Error('Environment validation failed.');
        }
        throw error;
    }
}
// Export validated configuration
exports.config = validateEnvironment();
// Environment-specific configurations
exports.isDevelopment = exports.config.NODE_ENV === 'development';
exports.isStaging = exports.config.NODE_ENV === 'staging';
exports.isProduction = exports.config.NODE_ENV === 'production';
// Database configuration
exports.dbConfig = {
    host: exports.config.DB_HOST,
    port: exports.config.DB_PORT,
    database: exports.config.DB_NAME,
    user: exports.config.DB_USER,
    password: exports.config.DB_PASSWORD,
    ssl: exports.config.DB_SSL,
    max: exports.config.DB_MAX_CONNECTIONS,
    connectionTimeoutMillis: exports.config.DB_CONNECTION_TIMEOUT,
    idleTimeoutMillis: 30000,
};
// JWT configuration
exports.jwtConfig = {
    secret: exports.config.JWT_SECRET,
    refreshSecret: exports.config.JWT_REFRESH_SECRET,
    expiresIn: exports.config.JWT_EXPIRES_IN,
    refreshExpiresIn: exports.config.JWT_REFRESH_EXPIRES_IN,
};
// Security configuration
exports.securityConfig = {
    bcryptSaltRounds: exports.config.BCRYPT_SALT_ROUNDS,
    sessionSecret: exports.config.SESSION_SECRET,
    cookieDomain: exports.config.COOKIE_DOMAIN,
    cookieSecure: exports.config.COOKIE_SECURE,
    corsOrigin: exports.config.CORS_ORIGIN,
    corsCredentials: exports.config.CORS_CREDENTIALS,
};
// Rate limiting configuration
exports.rateLimitConfig = {
    windowMs: exports.config.RATE_LIMIT_WINDOW_MS,
    maxRequests: exports.config.RATE_LIMIT_MAX_REQUESTS,
    authMaxRequests: exports.config.AUTH_RATE_LIMIT_MAX_REQUESTS,
    passwordResetMaxRequests: exports.config.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS,
};
// Feature flags
exports.features = {
    enableRegistration: exports.config.ENABLE_REGISTRATION,
    enableEmailVerification: exports.config.ENABLE_EMAIL_VERIFICATION,
    enablePasswordReset: exports.config.ENABLE_PASSWORD_RESET,
    enableSwaggerDocs: exports.config.ENABLE_SWAGGER_DOCS,
};
// Logging configuration
exports.loggingConfig = {
    level: exports.config.LOG_LEVEL,
    file: exports.config.LOG_FILE,
};
// Utility function to get environment info
function getEnvironmentInfo() {
    return {
        nodeEnv: exports.config.NODE_ENV,
        port: exports.config.PORT,
        isDevelopment: exports.isDevelopment,
        isStaging: exports.isStaging,
        isProduction: exports.isProduction,
        features: exports.features,
        database: {
            host: exports.config.DB_HOST,
            port: exports.config.DB_PORT,
            name: exports.config.DB_NAME,
            ssl: exports.config.DB_SSL,
        },
    };
}
// Utility function to validate required secrets in production
function validateProductionSecrets() {
    if (exports.isProduction) {
        const requiredSecrets = [
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'DB_PASSWORD',
        ];
        const missingSecrets = requiredSecrets.filter(secret => !process.env[secret] || process.env[secret] === 'your-secret-key-change-in-production');
        if (missingSecrets.length > 0) {
            console.error('Missing or default production secrets:');
            missingSecrets.forEach(secret => console.error(`  ${secret}`));
            throw new Error('Missing or default production secrets.');
        }
    }
}
exports.default = exports.config;
