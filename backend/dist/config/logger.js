"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerUtils = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("./environment");
// Custom log format for structured logging
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf((_a) => {
    var { timestamp, level, message, stack } = _a, meta = __rest(_a, ["timestamp", "level", "message", "stack"]);
    const logObject = {
        timestamp,
        level,
        message,
        environment: environment_1.config.NODE_ENV,
        service: 'resume-builder-backend',
    };
    // Add meta data if it exists
    if (meta && typeof meta === 'object') {
        Object.assign(logObject, meta);
    }
    // Add stack trace if it exists
    if (stack) {
        logObject.stack = stack;
    }
    return JSON.stringify(logObject);
}));
// Console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf((_a) => {
    var { timestamp, level, message, stack } = _a, meta = __rest(_a, ["timestamp", "level", "message", "stack"]);
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
}));
// Create logs directory
const logsDir = path_1.default.join(__dirname, '../../logs');
// Configure transports
const transports = [];
// Console transport for development
if (environment_1.isDevelopment) {
    transports.push(new winston_1.default.transports.Console({
        level: 'debug',
        format: consoleFormat,
    }));
}
else {
    // Simplified console for production
    transports.push(new winston_1.default.transports.Console({
        level: 'info',
        format: logFormat,
    }));
}
// File transports for all environments
{
    // Combined logs (all levels)
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: logFormat,
    }));
    // Error logs only
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat,
    }));
    // Debug logs for development
    if (environment_1.isDevelopment) {
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, 'debug-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '50m',
            maxFiles: '7d',
            level: 'debug',
            format: logFormat,
        }));
    }
}
// Create the logger
const logger = winston_1.default.createLogger({
    level: environment_1.isDevelopment ? 'debug' : 'info',
    format: logFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});
// Handle uncaught exceptions
logger.exceptions.handle(new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logsDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
}));
// Handle unhandled promise rejections
logger.rejections.handle(new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logsDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
}));
// Utility functions for structured logging
exports.loggerUtils = {
    // Log HTTP requests
    logRequest: (req, res, duration) => {
        var _a;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        });
    },
    // Log authentication events
    logAuth: (event, userId, details) => {
        logger.info('Authentication Event', Object.assign({ event,
            userId }, details));
    },
    // Log database operations
    logDatabase: (operation, table, details) => {
        logger.debug('Database Operation', Object.assign({ operation,
            table }, details));
    },
    // Log errors with context
    logError: (error, context) => {
        logger.error('Application Error', Object.assign({ message: error.message, stack: error.stack, name: error.name }, context));
    },
    // Log security events
    logSecurity: (event, details) => {
        logger.warn('Security Event', Object.assign({ event }, details));
    },
    // Log performance metrics
    logPerformance: (operation, duration, details) => {
        logger.info('Performance Metric', Object.assign({ operation, duration: `${duration}ms` }, details));
    },
};
exports.default = logger;
