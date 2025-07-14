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
exports.sentryErrorHandlerMiddleware = exports.sentryPerformanceMiddleware = exports.sentryErrorHandler = exports.sentryUserContext = void 0;
const Sentry = __importStar(require("@sentry/node"));
const sentry_1 = require("../config/sentry");
const logger_1 = __importDefault(require("../config/logger"));
// Middleware to add user context to Sentry
const sentryUserContext = (req, res, next) => {
    const user = req.user;
    if (user) {
        (0, sentry_1.setSentryUser)({
            id: user.id,
            email: user.email,
            role: user.role || 'user',
        });
    }
    // Add request context
    (0, sentry_1.setSentryContext)('request', {
        id: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
};
exports.sentryUserContext = sentryUserContext;
// Middleware to capture and handle errors with Sentry
const sentryErrorHandler = (error, req, res, next) => {
    // Add additional context for the error
    Sentry.withScope((scope) => {
        // Add request information
        scope.setTag('method', req.method);
        scope.setTag('url', req.url);
        scope.setTag('statusCode', res.statusCode);
        scope.setContext('request', {
            id: req.requestId,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            headers: req.headers,
            ip: req.ip,
        });
        // Add user context if available
        const user = req.user;
        if (user) {
            scope.setUser({
                id: user.id,
                email: user.email,
                role: user.role,
            });
        }
        // Add error fingerprint for better grouping
        scope.setFingerprint([
            error.name,
            error.message,
            req.method,
            req.url,
        ]);
        // Set error level based on status code
        if (res.statusCode >= 500) {
            scope.setLevel('error');
        }
        else if (res.statusCode >= 400) {
            scope.setLevel('warning');
        }
        else {
            scope.setLevel('info');
        }
        // Capture the exception
        const sentryId = Sentry.captureException(error);
        // Log the error with Sentry ID for correlation
        logger_1.default.error('Error captured by Sentry', {
            sentryId,
            error: error.message,
            stack: error.stack,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            userId: user === null || user === void 0 ? void 0 : user.id,
            requestId: req.requestId,
        });
        // Add Sentry ID to response headers for debugging
        res.setHeader('X-Sentry-ID', sentryId);
    });
    // Continue with the next error handler
    next(error);
};
exports.sentryErrorHandler = sentryErrorHandler;
// Middleware to capture performance metrics
const sentryPerformanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Override end function to capture timing
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - startTime;
        // Add custom timing data to Sentry
        Sentry.setContext('performance', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: duration,
            requestSize: req.get('content-length') || 0,
            responseSize: res.get('content-length') || 0,
        });
        // Log performance metrics
        logger_1.default.info('Request performance', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: duration,
            requestId: req.requestId,
        });
        // Call the original end function
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.sentryPerformanceMiddleware = sentryPerformanceMiddleware;
// Simple error handler that captures exceptions with Sentry
const sentryErrorHandlerMiddleware = (error, req, res, next) => {
    // Capture the error with Sentry
    Sentry.captureException(error);
    // Continue with the next error handler
    next(error);
};
exports.sentryErrorHandlerMiddleware = sentryErrorHandlerMiddleware;
