"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustProxyConfig = exports.xssProtection = exports.sqlInjectionProtection = exports.requestSizeLimits = exports.cookieOptions = exports.securityHeaders = exports.sanitizeInput = exports.speedLimiter = exports.passwordResetRateLimit = exports.authRateLimit = exports.generalRateLimit = exports.createRateLimit = exports.helmetOptions = exports.corsOptions = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const hpp_1 = __importDefault(require("hpp"));
// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
// CORS Configuration
exports.corsOptions = {
    origin: function (origin, callback) {
        var _a;
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        const allowedOrigins = [
            'http://localhost:3000', // Frontend development
            'http://localhost:3001', // Backend development
            'https://your-domain.com', // Production frontend
            'https://api.your-domain.com', // Production API
            ...(((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || [])
        ];
        if (isDevelopment) {
            // In development, allow all localhost origins
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400 // 24 hours
};
// Helmet Security Headers Configuration
exports.helmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", 'https://api.your-domain.com'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'"],
            childSrc: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};
// Rate Limiting Configuration
const createRateLimit = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: message || {
            error: 'Too many requests',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};
exports.createRateLimit = createRateLimit;
// General API rate limit
exports.generalRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
100, // limit each IP to 100 requests per windowMs
'Too many requests from this IP, please try again later.');
// Strict rate limit for authentication endpoints
exports.authRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
5, // limit each IP to 5 requests per windowMs for auth
'Too many authentication attempts, please try again later.');
// Password reset rate limit
exports.passwordResetRateLimit = (0, exports.createRateLimit)(60 * 60 * 1000, // 1 hour
3, // limit each IP to 3 password reset requests per hour
'Too many password reset attempts, please try again later.');
// Slow down configuration for repeated requests
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: () => 500, // begin adding 500ms of delay per request above 50
    maxDelayMs: 20000, // maximum delay of 20 seconds
    validate: { delayMs: false }, // Disable the warning
});
// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize req.body
    if (req.body && typeof req.body === 'object') {
        express_mongo_sanitize_1.default.sanitize(req.body);
    }
    // Sanitize req.params
    if (req.params && typeof req.params === 'object') {
        express_mongo_sanitize_1.default.sanitize(req.params);
    }
    // Do not touch req.query to avoid assignment errors
    (0, hpp_1.default)()(req, res, next);
};
exports.sanitizeInput = sanitizeInput;
// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Additional custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Remove potentially sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    next();
};
exports.securityHeaders = securityHeaders;
// Cookie security configuration
exports.cookieOptions = {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    path: '/'
};
// Request size limits
exports.requestSizeLimits = {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb', extended: true }
};
// SQL Injection Protection Middleware
const sqlInjectionProtection = (req, res, next) => {
    const suspiciousPatterns = [
        /('|(\\')|(;)|(\\;)|(\\)|(\\\\))/i,
        /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /((\%27)|(\'))((\%75)|u|(\%55))((\%6E)|n|(\%4E))((\%69)|i|(\%49))((\%6F)|o|(\%4F))((\%6E)|n|(\%4E))/i,
        /((\%27)|(\'))((\%73)|s|(\%53))((\%65)|e|(\%45))((\%6C)|l|(\%4C))((\%65)|e|(\%45))((\%63)|c|(\%43))((\%74)|t|(\%54))/i,
        /((\%27)|(\'))((\%69)|i|(\%49))((\%6E)|n|(\%4E))((\%73)|s|(\%53))((\%65)|e|(\%45))((\%72)|r|(\%52))((\%74)|t|(\%54))/i,
        /((\%27)|(\'))((\%64)|d|(\%44))((\%65)|e|(\%45))((\%6C)|l|(\%4C))((\%65)|e|(\%45))((\%74)|t|(\%54))((\%65)|e|(\%45))/i,
        /((\%27)|(\'))((\%75)|u|(\%55))((\%70)|p|(\%50))((\%64)|d|(\%44))((\%61)|a|(\%41))((\%74)|t|(\%54))((\%65)|e|(\%45))/i,
        /((\%27)|(\'))((\%64)|d|(\%44))((\%72)|r|(\%52))((\%6F)|o|(\%4F))((\%70)|p|(\%50))/i
    ];
    const checkForSQLInjection = (value) => {
        return suspiciousPatterns.some(pattern => pattern.test(value));
    };
    const checkObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string' && checkForSQLInjection(obj[key])) {
                return true;
            }
            if (typeof obj[key] === 'object' && obj[key] !== null && checkObject(obj[key])) {
                return true;
            }
        }
        return false;
    };
    // Check query parameters, body, and headers
    const suspicious = checkObject(req.query) ||
        checkObject(req.body) ||
        checkForSQLInjection(req.url);
    if (suspicious) {
        console.warn(`Potential SQL injection attempt from IP: ${req.ip}, URL: ${req.url}`);
        return res.status(400).json({
            success: false,
            error: 'INVALID_INPUT',
            message: 'Invalid input detected'
        });
    }
    next();
};
exports.sqlInjectionProtection = sqlInjectionProtection;
// XSS Protection Middleware
const xssProtection = (req, res, next) => {
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload=/gi,
        /onerror=/gi,
        /onclick=/gi,
        /onmouseover=/gi
    ];
    const checkForXSS = (value) => {
        return xssPatterns.some(pattern => pattern.test(value));
    };
    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (checkForXSS(obj[key])) {
                    console.warn(`Potential XSS attempt from IP: ${req.ip}, URL: ${req.url}`);
                    obj[key] = obj[key].replace(/<script[^>]*>.*?<\/script>/gi, '');
                    obj[key] = obj[key].replace(/javascript:/gi, '');
                    obj[key] = obj[key].replace(/vbscript:/gi, '');
                    obj[key] = obj[key].replace(/on\w+=/gi, '');
                }
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
        return obj;
    };
    // Sanitize query parameters and body
    if (req.query) {
        sanitizeObject(req.query);
    }
    if (req.body) {
        sanitizeObject(req.body);
    }
    next();
};
exports.xssProtection = xssProtection;
// Trust proxy configuration for accurate IP addresses
const trustProxyConfig = (app) => {
    if (isProduction) {
        app.set('trust proxy', 1); // Trust first proxy
    }
    else {
        app.set('trust proxy', true); // Trust all proxies in development
    }
};
exports.trustProxyConfig = trustProxyConfig;
