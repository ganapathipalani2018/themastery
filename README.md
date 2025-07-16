# Resume Builder

[![Frontend CI](https://github.com/yourusername/resumebuilder/workflows/Frontend%20CI/badge.svg)](https://github.com/yourusername/resumebuilder/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/yourusername/resumebuilder/workflows/Backend%20CI/badge.svg)](https://github.com/yourusername/resumebuilder/actions/workflows/backend-ci.yml)
[![Code Quality](https://github.com/yourusername/resumebuilder/workflows/Code%20Quality/badge.svg)](https://github.com/yourusername/resumebuilder/actions/workflows/code-quality.yml)
[![Deploy](https://github.com/yourusername/resumebuilder/workflows/Deploy/badge.svg)](https://github.com/yourusername/resumebuilder/actions/workflows/deploy.yml)

A modern, full-stack resume builder application that helps users create professional resumes with AI-powered assistance, multiple templates, and real-time preview capabilities.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design built with Next.js and Tailwind CSS
- **Multiple Templates**: Choose from modern, traditional, and creative resume templates
- **Real-time Preview**: See your resume update live as you edit
- **AI Assistance**: Get AI-powered suggestions for skills, experience, and content enhancement
- **Export Options**: Download resumes in PDF and DOCX formats
- **User Management**: Secure authentication with JWT and user dashboard
- **Multi-version Support**: Manage multiple resume versions and cover letters
- **Subscription System**: Freemium model with premium features

## 🏗️ Architecture

### Technology Stack

- **Frontend:** Next.js 14 with TypeScript and Tailwind CSS
- **Backend:** Express.js with TypeScript
- **Database:** PostgreSQL 15 with connection pooling
- **Authentication:** JWT-based with refresh tokens
- **Containerization:** Docker and Docker Compose
- **CI/CD:** GitHub Actions with automated testing and deployment
- **Monitoring:** Sentry for error tracking and performance monitoring

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 5433    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Docker        │◄─────────────┘
                        │   Compose       │
                        └─────────────────┘
```

### Project Structure

```
resumebuilder/
├── src/                          # Frontend source code
│   ├── app/                      # Next.js app directory
│   ├── components/               # React components
│   └── lib/                      # Utilities and API clients
├── backend/                      # Backend source code
│   └── src/
│       ├── controllers/          # Route controllers
│       ├── middleware/           # Express middleware
│       ├── models/               # Database models
│       ├── routes/               # API routes
│       └── utils/                # Backend utilities
├── docs/                         # Documentation
├── scripts/                      # Build and deployment scripts
└── config/                       # Environment configurations
```

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** (recommended) or Node.js 18+ and PostgreSQL 15
- **Git** for version control
- **Make** (optional, for using Makefile commands)

### Option 1: Docker Development (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/resumebuilder.git
   cd resumebuilder
   ```

2. **Install Docker Desktop:**
   - Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Start Docker Desktop

3. **Build and start all services:**
   ```bash
   make build
   make up
   ```

   Or without Make:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Initialize the database:**
   ```bash
   make db-init
   ```

5. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001](http://localhost:3001)
   - API Documentation: [http://localhost:3001/api](http://localhost:3001/api)
   - Database: localhost:5433

For detailed Docker setup instructions, see [docs/docker-setup.md](docs/docker-setup.md).

### Option 2: Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/yourusername/resumebuilder.git
   cd resumebuilder
   npm install
   cd backend && npm install && cd ..
   ```

2. **Set up environment variables:**
   ```bash
   ./scripts/setup-env.sh development
   ```

3. **Start PostgreSQL database:**
   ```bash
   # Using Docker for database only
   docker run --name resumebuilder-db -e POSTGRES_DB=resumebuilderdb -e POSTGRES_USER=resumeuser -e POSTGRES_PASSWORD=resumepass123 -p 5433:5432 -d postgres:15-alpine
   ```

4. **Initialize the database:**
   ```bash
   psql -h localhost -p 5433 -U resumeuser -d resumebuilderdb -f database.sql
   ```

5. **Start the development servers:**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   cd backend && npm run dev
   ```

6. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001](http://localhost:3001)

## 📚 Documentation

- [Docker Setup Guide](docs/docker-setup.md) - Complete Docker development setup
- [Environment Configuration](docs/environment-configuration.md) - Environment variables and configuration
- [Security Guide](docs/security-guide.md) - Security best practices and implementation
- [CI/CD Setup](docs/ci-cd-setup.md) - Continuous integration and deployment setup
- [API Documentation](docs/api-documentation.md) - Complete API reference
- [Contributing Guidelines](docs/contributing.md) - How to contribute to the project
- [Code Style Guide](docs/code-style-guide.md) - Coding standards and best practices
- [Testing Strategy](docs/testing-strategy.md) - Testing approach and guidelines
- [Troubleshooting Guide](docs/troubleshooting.md) - Common issues and solutions
- [Deployment Guide](docs/deployment.md) - Production deployment instructions

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# End-to-end tests
npm run test:e2e

# Test with coverage
npm run test:coverage
```

## 🔧 Available Scripts

### Frontend Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run type-check` - TypeScript type checking

### Backend Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run type-check` - TypeScript type checking

### Docker Scripts (using Makefile)
- `make build` - Build all Docker images
- `make up` - Start all services
- `make down` - Stop all services
- `make logs` - View service logs
- `make db-init` - Initialize database
- `make db-backup` - Backup database
- `make db-restore` - Restore database from backup

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/verify-email` - Verify email address

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check
- `GET /health/detailed` - Comprehensive health information

For complete API documentation, see [docs/api-documentation.md](docs/api-documentation.md).

## 🚀 Deployment

This project supports deployment to multiple environments:

- **Development**: Local development with Docker Compose
- **Staging**: Automated deployment via GitHub Actions
- **Production**: Automated deployment with additional security and monitoring

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

## 🔐 Security

- JWT-based authentication with refresh tokens
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection protection
- XSS protection
- CORS configuration
- Security headers (Helmet.js)
- Environment-based configuration

For detailed security information, see [docs/security-guide.md](docs/security-guide.md).
