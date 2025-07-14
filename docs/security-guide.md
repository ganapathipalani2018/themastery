# Security Implementation Guide

This document outlines the comprehensive security measures implemented in the Resume Builder application.

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Security Headers](#security-headers)
3. [Rate Limiting](#rate-limiting)
4. [Input Validation](#input-validation)
5. [Authentication Security](#authentication-security)
6. [Data Protection](#data-protection)
7. [CORS Configuration](#cors-configuration)
8. [Security Monitoring](#security-monitoring)
9. [Environment Security](#environment-security)
10. [Security Testing](#security-testing)

## Security Architecture Overview

The application implements a multi-layered security approach:

```
Client Request
    ↓
Trust Proxy Configuration
    ↓
Security Headers
    ↓
CORS Validation
    ↓
Helmet Security Headers
    ↓
Rate Limiting
    ↓
Request Size Limits
    ↓
Input Sanitization
    ↓
SQL Injection Protection
    ↓
XSS Protection
    ↓
Input Validation (Zod)
    ↓
Authentication (if required)
    ↓
Application Logic
```

## Security Headers

### Implemented Headers

1. **Content Security Policy (CSP)**
   - Prevents XSS attacks by controlling resource loading
   - Configured for development and production environments
   - Allows only trusted sources for scripts, styles, and other resources

2. **HTTP Strict Transport Security (HSTS)**
   - Forces HTTPS connections in production
   - 1-year max age with subdomain inclusion
   - Preload enabled for enhanced security

3. **X-Frame-Options**
   - Set to `DENY` to prevent clickjacking attacks
   - Blocks embedding in iframes completely

4. **X-Content-Type-Options**
   - Set to `nosniff` to prevent MIME type sniffing
   - Protects against content-type confusion attacks

5. **X-XSS-Protection**
   - Enables browser XSS filtering
   - Set to block mode for enhanced protection

6. **Referrer-Policy**
   - Set to `strict-origin-when-cross-origin`
   - Balances privacy and functionality

7. **Permissions-Policy**
   - Disables unnecessary browser features
   - Prevents access to geolocation, microphone, and camera

### Configuration

```typescript
// Security headers are configured in backend/src/middleware/security.ts
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.your-domain.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};
```

## Rate Limiting

### Rate Limit Tiers

1. **General API Rate Limit**
   - 100 requests per 15 minutes per IP
   - Applied to all non-authentication endpoints
   - Includes exponential backoff

2. **Authentication Rate Limit**
   - 5 requests per 15 minutes per IP
   - Applied to login, register, refresh token endpoints
   - Stricter limits to prevent brute force attacks

3. **Password Reset Rate Limit**
   - 3 requests per hour per IP
   - Applied to password reset and forgot password endpoints
   - Prevents abuse of password reset functionality

4. **Speed Limiting**
   - Adds delay after 50 requests in 15 minutes
   - 500ms delay per request above threshold
   - Maximum delay of 20 seconds

### Configuration

```typescript
// Rate limiting configured in backend/src/middleware/security.ts
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests max
  'Too many authentication attempts, please try again later.'
);
```

## Input Validation

### Validation Strategy

1. **Zod Schema Validation**
   - Type-safe validation with TypeScript integration
   - Comprehensive schemas for all input types
   - Custom validation rules for business logic

2. **Sanitization**
   - NoSQL injection protection with express-mongo-sanitize
   - HTTP Parameter Pollution (HPP) protection
   - Custom SQL injection pattern detection
   - XSS pattern detection and sanitization

### Validation Schemas

```typescript
// Example validation schema from backend/src/utils/validation.ts
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)
- Maximum 128 characters

## Authentication Security

### JWT Implementation

1. **Token Security**
   - Access tokens: 15-minute expiration
   - Refresh tokens: 7-day expiration
   - Secure token generation with crypto.randomBytes
   - Token verification with proper error handling

2. **Password Security**
   - bcrypt hashing with 12 salt rounds
   - Password strength validation
   - Protection against common password patterns

3. **Session Management**
   - Secure cookie configuration
   - HttpOnly cookies to prevent XSS access
   - Secure flag for HTTPS-only transmission
   - SameSite strict to prevent CSRF

### Cookie Configuration

```typescript
export const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  path: '/'
};
```

## Data Protection

### SQL Injection Prevention

1. **Parameterized Queries**
   - All database queries use parameterized statements
   - No string concatenation for SQL queries
   - Prepared statements for complex queries

2. **Pattern Detection**
   - Custom middleware detects SQL injection patterns
   - Blocks requests with suspicious SQL keywords
   - Logs potential attack attempts

### XSS Protection

1. **Input Sanitization**
   - Removes dangerous HTML tags and attributes
   - Sanitizes JavaScript event handlers
   - Prevents script injection in user inputs

2. **Output Encoding**
   - Proper encoding of user data in responses
   - Content-Type headers set correctly
   - JSON responses properly structured

## CORS Configuration

### CORS Policy

```typescript
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', // Frontend development
      'http://localhost:3001', // Backend development
      'https://your-domain.com', // Production frontend
      'https://api.your-domain.com' // Production API
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};
```

## Security Monitoring

### Logging

1. **Security Events**
   - Failed authentication attempts
   - Rate limit violations
   - Potential injection attempts
   - Suspicious request patterns

2. **Error Handling**
   - Detailed logging for security events
   - Sanitized error responses to clients
   - Stack traces only in development

3. **Audit Trail**
   - User authentication events
   - Password changes and resets
   - Administrative actions

### Health Monitoring

```typescript
// Enhanced health check with security status
app.get("/health", async (req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: { /* database status */ },
    security: {
      cors: "enabled",
      helmet: "enabled",
      rateLimit: "enabled",
      inputValidation: "enabled",
      sqlInjectionProtection: "enabled",
      xssProtection: "enabled"
    }
  };
});
```

## Environment Security

### Environment Variables

1. **Sensitive Data**
   - API keys stored in environment variables
   - Database credentials in .env files
   - JWT secrets with sufficient entropy

2. **Environment Separation**
   - Different configurations for dev/staging/production
   - Environment-specific security settings
   - Feature flags for security features

### Production Considerations

1. **HTTPS Enforcement**
   - All production traffic over HTTPS
   - HTTP redirects to HTTPS
   - Secure cookie flags enabled

2. **Database Security**
   - Connection pooling with limits
   - Database user with minimal privileges
   - Regular security updates

## Security Testing

### Automated Testing

1. **npm audit**
   - Regular dependency vulnerability scanning
   - Automated security updates where possible
   - CI/CD integration for security checks

2. **Rate Limit Testing**
   - Verify rate limits are enforced
   - Test different IP addresses
   - Validate error responses

### Manual Testing

1. **Input Validation Testing**
   - Test with malicious payloads
   - Verify sanitization works correctly
   - Check error handling

2. **Authentication Testing**
   - Test token expiration
   - Verify password requirements
   - Test session management

### Security Checklist

- [ ] All endpoints have appropriate rate limiting
- [ ] Input validation is implemented for all user inputs
- [ ] SQL injection protection is active
- [ ] XSS protection is implemented
- [ ] CORS is properly configured
- [ ] Security headers are set correctly
- [ ] Authentication tokens are secure
- [ ] Passwords are properly hashed
- [ ] Error messages don't leak sensitive information
- [ ] Logging captures security events
- [ ] Environment variables are secured
- [ ] Dependencies are up to date and vulnerability-free

## Security Updates

### Maintenance Schedule

1. **Weekly**
   - npm audit and dependency updates
   - Review security logs
   - Monitor rate limit effectiveness

2. **Monthly**
   - Security configuration review
   - Update security documentation
   - Review and update CSP policies

3. **Quarterly**
   - Comprehensive security audit
   - Penetration testing
   - Security training updates

### Incident Response

1. **Detection**
   - Monitor logs for security events
   - Set up alerts for suspicious activity
   - Regular security scans

2. **Response**
   - Immediate threat containment
   - Investigation and analysis
   - Communication with stakeholders

3. **Recovery**
   - System restoration
   - Security improvements
   - Documentation updates

## Contact and Support

For security issues or questions:
- Review this documentation
- Check the security middleware in `backend/src/middleware/security.ts`
- Refer to validation schemas in `backend/src/utils/validation.ts`
- Report security vulnerabilities through appropriate channels

Last updated: January 2025 