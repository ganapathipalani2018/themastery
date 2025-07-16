import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
// @ts-ignore
import csurf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// CORS Configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000', // Frontend development
      'http://localhost:3001', // Backend development
      'https://your-domain.com', // Production frontend
      'https://api.your-domain.com', // Production API
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];

    if (isDevelopment) {
      // In development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
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
export const helmetOptions = {
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
  frameguard: { action: 'deny' as const },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const }
};

// Rate Limiting Configuration
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General API rate limit
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limit for authentication endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs for auth
  'Too many authentication attempts, please try again later.'
);

// Password reset rate limit
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // limit each IP to 3 password reset requests per hour
  'Too many password reset attempts, please try again later.'
);

// Slow down configuration for repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable the warning
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize req.body
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body);
  }
  // Sanitize req.params
  if (req.params && typeof req.params === 'object') {
    mongoSanitize.sanitize(req.params);
  }
  // Do not touch req.query to avoid assignment errors
  hpp()(req, res, next);
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
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

// Cookie security configuration
export const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // Only send over HTTPS in production
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  path: '/'
};

// Request size limits
export const requestSizeLimits = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true }
};

// SQL Injection Protection Middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
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

  const checkForSQLInjection = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
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
  const suspicious = 
    checkObject(req.query) || 
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

// XSS Protection Middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
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

  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some(pattern => pattern.test(value));
  };

  const sanitizeObject = (obj: any): any => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (checkForXSS(obj[key])) {
          console.warn(`Potential XSS attempt from IP: ${req.ip}, URL: ${req.url}`);
          obj[key] = obj[key].replace(/<script[^>]*>.*?<\/script>/gi, '');
          obj[key] = obj[key].replace(/javascript:/gi, '');
          obj[key] = obj[key].replace(/vbscript:/gi, '');
          obj[key] = obj[key].replace(/on\w+=/gi, '');
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
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

// CSRF Protection Middleware
export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  }
});

// Trust proxy configuration for accurate IP addresses
export const trustProxyConfig = (app: any) => {
  if (isProduction) {
    app.set('trust proxy', 1); // Trust first proxy
  } else {
    app.set('trust proxy', true); // Trust all proxies in development
  }
}; 