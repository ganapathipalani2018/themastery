# Deployment Guide

This guide covers the deployment process for the Resume Builder application across different environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Overview

The Resume Builder application consists of:
- **Frontend**: Next.js application (Port 3000)
- **Backend**: Node.js/Express API (Port 3001)
- **Database**: PostgreSQL (Port 5432)
- **Redis**: Session storage (Port 6379)

## Prerequisites

### Development Environment
- Node.js 18+
- Docker and Docker Compose
- Git
- PostgreSQL client (optional)

### Production Environment
- Server with Docker support
- Domain name configured
- SSL certificates
- Load balancer (optional)

## Environment Configuration

### Environment Files

Create environment files for each environment:

```bash
# Development
config/development.env

# Staging
config/staging.env

# Production
config/production.env
```

### Required Environment Variables

```env
# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/resumebuilder
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resumebuilder
DB_USER=your_user
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Storage
UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=pdf,doc,docx,txt

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Docker Deployment

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Docker Setup

```bash
# Build production images
docker build -t resumebuilder-frontend .
docker build -t resumebuilder-backend ./backend

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Compose Override

Create `docker-compose.override.yml` for local development:

```yaml
version: '3.8'

services:
  frontend:
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    environment:
      - NODE_ENV=development
    
  backend:
    volumes:
      - ./backend/src:/app/src
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
```

## Production Deployment

### Server Setup

1. **Install Docker and Docker Compose**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose
   
   # Start Docker
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/resumebuilder.git
   cd resumebuilder
   ```

3. **Configure Environment**
   ```bash
   # Copy and configure production environment
   cp config/env.template config/production.env
   # Edit config/production.env with your values
   ```

4. **Deploy Application**
   ```bash
   # Deploy with production configuration
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Database Migration

```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

### SSL Configuration

#### Using Nginx Proxy Manager

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    volumes:
      - ./nginx/data:/data
      - ./nginx/letsencrypt:/etc/letsencrypt
```

#### Using Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Backup Strategy

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T database pg_dump -U $DB_USER $DB_NAME > backups/db_backup_$DATE.sql

# Automated backup with cron
0 2 * * * /path/to/backup-script.sh
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.PRIVATE_KEY }}
          script: |
            cd /path/to/resumebuilder
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
```

### Staging Environment

```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Run staging tests
npm run test:staging
```

## Monitoring and Logging

### Application Monitoring

```javascript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Checks

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### Log Management

```javascript
// Winston logging configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### Performance Monitoring

```bash
# Container monitoring
docker stats

# Resource usage
docker-compose exec backend npm run monitor

# Database performance
docker-compose exec database pg_stat_activity
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose ps database

# View database logs
docker-compose logs database

# Test connection
docker-compose exec backend npm run db:test
```

#### Application Not Starting
```bash
# Check container logs
docker-compose logs frontend
docker-compose logs backend

# Verify environment variables
docker-compose exec backend printenv

# Check port availability
netstat -tulpn | grep :3001
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check database performance
docker-compose exec database pg_stat_activity

# Analyze logs
tail -f logs/combined.log | grep ERROR
```

### Debugging Commands

```bash
# Enter container shell
docker-compose exec backend bash
docker-compose exec frontend bash

# Check application status
curl -I http://localhost:3000/health
curl -I http://localhost:3001/health

# View real-time logs
docker-compose logs -f --tail=100

# Restart specific service
docker-compose restart backend
```

### Rollback Procedure

```bash
# Quick rollback
git log --oneline -10
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml up -d --build

# Database rollback
docker-compose exec backend npm run migrate:rollback
```

## Security Considerations

### Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose pull
docker-compose up -d --build
```

### SSL Certificate Renewal
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew --dry-run
```

## Performance Optimization

### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
```

### Caching Strategy
```javascript
// Redis caching
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache user data
await client.setex(`user:${userId}`, 3600, JSON.stringify(userData));
```

### Load Balancing
```nginx
upstream backend {
    server backend1:3001;
    server backend2:3001;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

This deployment guide provides comprehensive instructions for deploying the Resume Builder application in various environments with proper monitoring and troubleshooting procedures. 