# Environment Configuration Guide

This guide explains how to configure environment variables and settings for the Resume Builder application across different environments (development, staging, production).

## Overview

The Resume Builder application uses a comprehensive environment configuration system that:
- Validates all environment variables at startup
- Provides type-safe configuration access
- Supports multiple environments with different settings
- Includes feature flags and environment-specific optimizations
- Ensures security best practices for production deployments

## Environment Structure

### Backend Configuration (`backend/src/config/environment.ts`)

The backend uses a Zod schema to validate and provide type-safe access to environment variables:

```typescript
import { config, dbConfig, jwtConfig, securityConfig } from './config/environment';
```

**Key Features:**
- **Environment Validation**: All variables are validated at startup
- **Type Safety**: Full TypeScript support with proper types
- **Default Values**: Sensible defaults for development
- **Security Validation**: Ensures production secrets are properly set
- **Structured Configuration**: Organized into logical groups (database, JWT, security, etc.)

### Frontend Configuration (`src/lib/config/environment.ts`)

The frontend configuration handles Next.js environment variables and client-side settings:

```typescript
import { config, apiConfig, features, uiConfig } from '@/lib/config/environment';
```

**Key Features:**
- **SSR/Client Safety**: Handles both server-side and client-side rendering
- **API Configuration**: Centralized API client settings
- **Feature Flags**: Environment-based feature toggling
- **UI Configuration**: Environment indicators and visual cues

## Environment Files

### Template Files

Environment configuration templates are stored in the `config/` directory:

- `config/development.env` - Development environment settings
- `config/staging.env` - Staging environment settings  
- `config/production.env` - Production environment settings
- `config/env.template` - General template for reference

### Active Environment Files

The application looks for environment variables in:

1. **Root directory**: `.env` (for frontend)
2. **Backend directory**: `backend/.env` (for backend)
3. **Environment-specific**: `.env.development`, `.env.staging`, `.env.production`

## Environment Setup

### Automated Setup Script

Use the provided setup script to configure environments:

```bash
# Set up development environment
npm run env:dev
./scripts/setup-env.sh development

# Set up staging environment (with backup)
npm run env:staging
./scripts/setup-env.sh staging

# Set up production environment (with backup and secret generation)
npm run env:prod
./scripts/setup-env.sh production

# Validate current environment
npm run env:validate
./scripts/setup-env.sh validate

# Show current environment info
npm run env:info
./scripts/setup-env.sh info
```

### Manual Setup

1. **Copy Environment Template**:
   ```bash
   cp config/development.env .env
   cp config/development.env backend/.env
   ```

2. **Update Variables**: Edit the copied files with your specific values

3. **Validate Configuration**:
   ```bash
   npm run env:validate
   ```

## Environment Variables Reference

### Application Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Backend server port | `3001` | No |

### Frontend Variables (NEXT_PUBLIC_*)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` | Yes |
| `NEXT_PUBLIC_APP_ENV` | App environment | `development` | Yes |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | Enable dev tools | `false` | No |

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database hostname | `localhost` | Yes |
| `DB_PORT` | Database port | `5433` | No |
| `DB_NAME` | Database name | `resumebuilderdb` | Yes |
| `DB_USER` | Database username | `resumeuser` | Yes |
| `DB_PASSWORD` | Database password | `resumepass123` | Yes |
| `DB_SSL` | Enable SSL connection | `false` | No |
| `DB_MAX_CONNECTIONS` | Connection pool size | `20` | No |
| `DB_CONNECTION_TIMEOUT` | Connection timeout (ms) | `30000` | No |

### JWT Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | - | Yes |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` | No |

### Security Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` | No |
| `SESSION_SECRET` | Session secret | - | No |
| `COOKIE_SECURE` | Secure cookies only | `false` | No |
| `COOKIE_DOMAIN` | Cookie domain | - | No |
| `CORS_ORIGIN` | CORS allowed origins | - | No |
| `CORS_CREDENTIALS` | CORS credentials | `true` | No |

### Rate Limiting

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Auth endpoint limit | `5` | No |
| `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS` | Password reset limit | `3` | No |

### Logging

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level | `info` | No |
| `LOG_FILE` | Log file path | - | No |

### Feature Flags

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENABLE_REGISTRATION` | Allow user registration | `true` | No |
| `ENABLE_EMAIL_VERIFICATION` | Require email verification | `false` | No |
| `ENABLE_PASSWORD_RESET` | Allow password reset | `true` | No |
| `ENABLE_SWAGGER_DOCS` | Enable API documentation | `true` | No |

### External Services

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EMAIL_HOST` | SMTP server host | - | No |
| `EMAIL_PORT` | SMTP server port | - | No |
| `EMAIL_USER` | SMTP username | - | No |
| `EMAIL_PASSWORD` | SMTP password | - | No |
| `EMAIL_FROM` | From email address | - | No |
| `REDIS_URL` | Redis connection URL | - | No |
| `SENTRY_DSN` | Sentry error tracking | - | No |

## Environment-Specific Configurations

### Development Environment

**Characteristics:**
- Relaxed security settings
- Verbose logging (debug level)
- Development-friendly rate limits
- DevTools enabled
- Local database connection
- Environment badge displayed

**Key Settings:**
```env
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
ENABLE_SWAGGER_DOCS=true
COOKIE_SECURE=false
```

### Staging Environment

**Characteristics:**
- Production-like security
- Moderate logging (info level)
- Moderate rate limits
- Email verification enabled
- SSL database connection
- Environment badge displayed

**Key Settings:**
```env
NODE_ENV=staging
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=200
ENABLE_EMAIL_VERIFICATION=true
COOKIE_SECURE=true
DB_SSL=true
```

### Production Environment

**Characteristics:**
- Maximum security settings
- Minimal logging (warn level)
- Strict rate limits
- All security features enabled
- SSL everywhere
- No environment badge
- No DevTools

**Key Settings:**
```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_SWAGGER_DOCS=false
COOKIE_SECURE=true
DB_SSL=true
```

## Security Considerations

### Production Secrets

**Critical**: Never use default or placeholder values in production!

The following variables MUST be changed for production:
- `JWT_SECRET` - Generate a strong 32+ character secret
- `JWT_REFRESH_SECRET` - Generate a different strong secret
- `DB_PASSWORD` - Use a strong database password
- `SESSION_SECRET` - Generate a strong session secret

### Secret Generation

The setup script automatically generates secure secrets for staging/production:

```bash
# This generates cryptographically secure secrets
./scripts/setup-env.sh production
```

Or manually generate secrets:
```bash
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

### Environment Validation

The application validates:
- Required variables are present
- JWT secrets meet minimum length requirements
- Production environments don't have placeholder values
- Database connection parameters are valid

## Troubleshooting

### Common Issues

1. **Environment Validation Errors**
   ```bash
   # Check what's missing
   npm run env:validate
   
   # View current configuration
   npm run env:info
   ```

2. **Database Connection Issues**
   ```bash
   # Verify database configuration
   cd backend && npm run env:info
   ```

3. **Frontend API Connection Issues**
   ```bash
   # Check API URL configuration
   echo $NEXT_PUBLIC_API_URL
   ```

4. **JWT Token Issues**
   ```bash
   # Verify JWT secrets are set and long enough
   grep JWT_SECRET .env
   ```

### Validation Commands

```bash
# Backend environment validation
cd backend && npm run env:validate

# Frontend build validation  
npm run build

# Full environment check
./scripts/setup-env.sh validate
```

## Best Practices

### Development

1. **Use the development template**: `npm run env:dev`
2. **Keep secrets in environment files**: Never commit real secrets
3. **Use environment validation**: Run `npm run env:validate` regularly
4. **Test environment switching**: Verify your app works in different environments

### Staging

1. **Use production-like settings**: SSL, secure cookies, email verification
2. **Test with real external services**: Email, monitoring, etc.
3. **Validate deployment process**: Use the same deployment process as production
4. **Monitor performance**: Ensure staging performance matches production expectations

### Production

1. **Generate secure secrets**: Use the automated script or strong manual generation
2. **Enable all security features**: SSL, secure cookies, rate limiting
3. **Monitor environment health**: Set up alerts for configuration issues
4. **Regular secret rotation**: Periodically update JWT and session secrets
5. **Backup configurations**: Keep secure backups of working configurations

### Security

1. **Never commit secrets**: Use `.gitignore` for `.env` files
2. **Use different secrets per environment**: Never reuse secrets across environments
3. **Validate in CI/CD**: Include environment validation in your deployment pipeline
4. **Monitor for placeholder values**: Alert if production has default values
5. **Use environment-specific domains**: Different domains for different environments

## Integration with Docker

The environment configuration works seamlessly with Docker:

```yaml
# docker-compose.yml
services:
  backend:
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

## Integration with CI/CD

Include environment validation in your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Validate Environment
  run: |
    npm run env:validate
    cd backend && npm run env:validate
```

This ensures deployments fail fast if environment configuration is invalid. 