// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Database configuration for testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'test_resumebuilder';

// JWT configuration for testing
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_for_testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Session configuration for testing
process.env.SESSION_SECRET = 'test_session_secret_for_testing';

// CORS configuration for testing
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Rate limiting configuration for testing
process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// Email configuration for testing (if needed)
process.env.EMAIL_SERVICE = 'test';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';

// Upload configuration for testing
process.env.UPLOAD_MAX_SIZE = '5242880'; // 5MB
process.env.UPLOAD_ALLOWED_TYPES = 'image/jpeg,image/png,image/gif,application/pdf';

// Logging configuration for testing
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

// API versioning
process.env.API_VERSION = 'v1';

// Security headers configuration
process.env.SECURITY_HEADERS_ENABLED = 'true';

// Database connection pool configuration
process.env.DB_POOL_MIN = '2';
process.env.DB_POOL_MAX = '10';
process.env.DB_POOL_IDLE_TIMEOUT = '30000';

// Cache configuration for testing
process.env.CACHE_TTL = '300'; // 5 minutes

// External API configuration for testing
process.env.EXTERNAL_API_TIMEOUT = '5000';
process.env.EXTERNAL_API_RETRIES = '3';

// Feature flags for testing
process.env.FEATURE_EMAIL_VERIFICATION = 'false';
process.env.FEATURE_TWO_FACTOR_AUTH = 'false';
process.env.FEATURE_RATE_LIMITING = 'false';

// Monitoring and analytics (disabled for testing)
process.env.SENTRY_DSN = '';
process.env.ANALYTICS_ENABLED = 'false';

// SSL configuration for testing
process.env.SSL_ENABLED = 'false';

// Maintenance mode
process.env.MAINTENANCE_MODE = 'false';

// Debug configuration
process.env.DEBUG_ENABLED = 'false';
process.env.DEBUG_SQL = 'false';

// Test-specific configurations
process.env.TEST_TIMEOUT = '30000';
process.env.TEST_DB_SETUP = 'true';
process.env.TEST_SEED_DATA = 'true';

// Disable console logs during testing (optional)
if (process.env.SILENT_TESTS === 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Set timezone for consistent test results
process.env.TZ = 'UTC';

module.exports = {}; 