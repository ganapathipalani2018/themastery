"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Initialize Sentry before any other imports
const sentry_1 = require("./config/sentry");
(0, sentry_1.initSentry)();
const express_1 = __importDefault(require("express"));
const environment_1 = require("./config/environment");
const logger_1 = __importDefault(require("./config/logger"));
const logging_1 = require("./middleware/logging");
const security_1 = require("./middleware/security");
const sentry_2 = require("./middleware/sentry");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
const health_1 = __importDefault(require("./routes/health"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const logging_2 = require("./middleware/logging");
console.log('Starting backend/src/index.ts');
console.log('Loaded config:', environment_1.config);
const app = (0, express_1.default)();
const PORT = environment_1.config.PORT;
app.use(logging_1.httpLogger);
app.use(sentry_2.sentryPerformanceMiddleware);
app.use(security_1.securityHeaders);
app.use((0, cors_1.default)(security_1.corsOptions));
app.use((0, helmet_1.default)(security_1.helmetOptions));
app.use(express_1.default.json(security_1.requestSizeLimits.json));
app.use(express_1.default.urlencoded(security_1.requestSizeLimits.urlencoded));
app.use((0, cookie_parser_1.default)());
app.use(security_1.sanitizeInput);
app.use(security_1.sqlInjectionProtection);
app.use(security_1.xssProtection);
app.use(sentry_2.sentryUserContext);
// Health check endpoints (before authentication)
app.use('/health', health_1.default);
// Monitoring endpoints (requires authentication)
app.use('/api/monitoring', monitoring_1.default);
// API routes
app.use('/api/auth', auth_1.default);
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
app.use(logging_2.errorLogger);
// Sentry error handler (must be before other error handlers)
app.use(sentry_2.sentryErrorHandler);
app.use(sentry_2.sentryErrorHandlerMiddleware);
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
app.use((err, req, res) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (err.name === 'ValidationError') {
        return res.status(400).json(Object.assign({ success: false, error: 'VALIDATION_ERROR', message: 'Invalid input data' }, (isDevelopment && { details: err.message })));
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
    return res.status(err.status || 500).json(Object.assign({ success: false, error: err.code || 'SERVER_ERROR', message: isDevelopment ? err.message : 'Internal server error' }, (isDevelopment && { stack: err.stack, details: err })));
});
app.listen(PORT, () => {
    logger_1.default.info('Server started on port', PORT);
    console.log('Server started on port', PORT);
});
