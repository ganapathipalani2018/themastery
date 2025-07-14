# Docker Setup for Resume Builder

This document provides instructions for setting up and running the Resume Builder application using Docker containers.

## Prerequisites

### Install Docker Desktop

1. **Download Docker Desktop for macOS:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Download and install Docker Desktop for Mac
   - Start Docker Desktop application

2. **Verify Installation:**
   ```bash
   docker --version
   docker-compose --version
   ```

## Project Structure

```
resumebuilder/
├── docker-compose.yml          # Main compose configuration
├── docker-compose.override.yml # Development overrides
├── Dockerfile                  # Frontend container
├── backend/
│   ├── Dockerfile             # Backend container
│   └── .dockerignore          # Backend ignore file
├── .dockerignore              # Frontend ignore file
├── Makefile                   # Helper commands
├── scripts/
│   └── init-db.sh            # Database initialization
└── docs/
    └── docker-setup.md       # This file
```

## Services

### 1. PostgreSQL Database (`postgres`)
- **Image:** `postgres:15-alpine`
- **Port:** `5433:5432`
- **Database:** `resumebuilderdb`
- **User:** `resumeuser`
- **Password:** `resumepass123`

### 2. Backend API (`backend`)
- **Build:** `./backend/Dockerfile`
- **Port:** `3001:3001`
- **Environment:** Development with hot reloading
- **Dependencies:** PostgreSQL

### 3. Frontend Application (`frontend`)
- **Build:** `./Dockerfile`
- **Port:** `3000:3000`
- **Environment:** Development with hot reloading
- **Dependencies:** Backend API

## Quick Start

### 1. Using Make Commands (Recommended)

```bash
# View available commands
make help

# Build all images
make build

# Start all services
make up

# View logs
make logs-f

# Stop all services
make down
```

### 2. Using Docker Compose Directly

```bash
# Build all images
docker-compose build

# Start all services in background
docker-compose up -d

# Start all services with logs
docker-compose up

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Development Workflow

### Starting Development Environment

1. **Build and start all services:**
   ```bash
   make build
   make up
   ```

2. **Check service status:**
   ```bash
   make status
   ```

3. **View logs:**
   ```bash
   make logs-f
   ```

### Accessing Services

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** localhost:5433

### Hot Reloading

Both frontend and backend support hot reloading:
- **Frontend:** Changes to React/Next.js files trigger automatic reload
- **Backend:** Changes to TypeScript files trigger automatic restart via nodemon

### Database Management

```bash
# Connect to database shell
make db-shell

# Or using docker-compose
docker-compose exec postgres psql -U resumeuser -d resumebuilderdb
```

### Container Shell Access

```bash
# Backend container shell
make backend-shell

# Frontend container shell
make frontend-shell

# Database container shell
docker-compose exec postgres sh
```

## Environment Variables

### Backend Environment Variables
- `NODE_ENV=development`
- `PORT=3001`
- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_NAME=resumebuilderdb`
- `DB_USER=resumeuser`
- `DB_PASSWORD=resumepass123`
- `JWT_SECRET=dev-jwt-secret-key-change-in-production`
- `JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production`

### Frontend Environment Variables
- `NODE_ENV=development`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `NEXT_PUBLIC_APP_ENV=development`

## Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :3001
   lsof -i :5433
   
   # Stop conflicting services
   make down
   ```

2. **Database Connection Issues:**
   ```bash
   # Check database health
   docker-compose exec postgres pg_isready -U resumeuser
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Build Issues:**
   ```bash
   # Clean rebuild
   make clean
   make build
   ```

4. **Permission Issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Debugging

1. **View service logs:**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Execute commands in containers:**
   ```bash
   docker-compose exec [service-name] [command]
   ```

3. **Inspect container:**
   ```bash
   docker-compose exec [service-name] sh
   ```

## Production Considerations

For production deployment, create a `docker-compose.prod.yml` file with:

- Environment-specific secrets
- Production database configuration
- SSL/TLS certificates
- Load balancer configuration
- Health checks and monitoring
- Backup strategies

## Cleanup

### Remove Development Environment

```bash
# Stop and remove containers, networks, and volumes
make clean

# Or using docker-compose
docker-compose down -v --rmi all --remove-orphans
docker system prune -f
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/) 