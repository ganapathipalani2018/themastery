"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.performanceLogger = exports.errorLogger = exports.requestId = exports.requestTimer = exports.httpLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
const logger_1 = __importStar(require("../config/logger"));
// Custom token for Morgan to log user ID
morgan_1.default.token('user-id', (req) => {
    var _a;
    return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous';
});
// Custom token for request ID (if available)
morgan_1.default.token('request-id', (req) => {
    return req.requestId || 'unknown';
});
// Custom token for response time in milliseconds
morgan_1.default.token('response-time-ms', (req) => {
    const startTime = req.startTime;
    if (startTime) {
        return `${Date.now() - startTime}ms`;
    }
    return 'unknown';
});
// Morgan format for structured logging
const morganFormat = JSON.stringify({
    timestamp: ':date[iso]',
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time-ms',
    contentLength: ':res[content-length]',
    userAgent: ':user-agent',
    ip: ':remote-addr',
    userId: ':user-id',
    requestId: ':request-id',
    referrer: ':referrer',
});
// Morgan stream that writes to Winston
const morganStream = {
    write: (message) => {
        try {
            const logData = JSON.parse(message.trim());
            logger_1.default.info('HTTP Request', logData);
        }
        catch (_a) {
            // Fallback to plain text if JSON parsing fails
            logger_1.default.info('HTTP Request', { message: message.trim() });
        }
    },
};
// Morgan middleware for HTTP request logging
exports.httpLogger = (0, morgan_1.default)(morganFormat, {
    stream: morganStream,
    skip: (req) => {
        // Skip logging for health check endpoints in production
        if (req.url === '/health' || req.url === '/api/health') {
            return process.env.NODE_ENV === 'production';
        }
        return false;
    },
});
// Middleware to add request start time
const requestTimer = (req, res, next) => {
    req.startTime = Date.now();
    next();
};
exports.requestTimer = requestTimer;
// Middleware to add request ID
const requestId = (req, res, next) => {
    const id = Math.random().toString(36).substring(2, 15);
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};
exports.requestId = requestId;
// Error logging middleware
const errorLogger = (error, req, res, next) => {
    var _a;
    // Log the error with request context
    logger_1.loggerUtils.logError(error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        requestId: req.requestId,
        body: req.body,
        params: req.params,
        query: req.query,
    });
    next(error);
};
exports.errorLogger = errorLogger;
// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
    const startTime = Date.now();
    // Override res.end to capture response time
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, cb) {
        var _a;
        const duration = Date.now() - startTime;
        // Log slow requests (> 1 second)
        if (duration > 1000) {
            logger_1.loggerUtils.logPerformance('Slow Request', duration, {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                requestId: req.requestId,
            });
        }
        // Call original end method
        return originalEnd(chunk, encoding, cb);
    };
    next();
};
exports.performanceLogger = performanceLogger;
// Security event logging middleware
exports.securityLogger = {
    // Log authentication attempts
    logAuthAttempt: (req, success, userId, reason) => {
        logger_1.loggerUtils.logSecurity('Authentication Attempt', {
            success,
            userId,
            reason,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.requestId,
        });
    },
    // Log rate limit violations
    logRateLimit: (req, limit) => {
        logger_1.loggerUtils.logSecurity('Rate Limit Exceeded', {
            limit,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            requestId: req.requestId,
        });
    },
    // Log suspicious activity
    logSuspiciousActivity: (req, activity, details) => {
        logger_1.loggerUtils.logSecurity('Suspicious Activity', Object.assign({ activity, ip: req.ip, userAgent: req.get('User-Agent'), url: req.url, method: req.method, requestId: req.requestId }, details));
    },
};
exports.default = {
    httpLogger: exports.httpLogger,
    requestTimer: exports.requestTimer,
    requestId: exports.requestId,
    errorLogger: exports.errorLogger,
    performanceLogger: exports.performanceLogger,
    securityLogger: exports.securityLogger,
};
