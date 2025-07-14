.PHONY: help build up down restart logs clean install test

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build all Docker images"
	@echo "  up        - Start all services"
	@echo "  down      - Stop all services"
	@echo "  restart   - Restart all services"
	@echo "  logs      - Show logs for all services"
	@echo "  logs-f    - Follow logs for all services"
	@echo "  clean     - Remove all containers, images, and volumes"
	@echo "  install   - Install dependencies in containers"
	@echo "  test      - Run tests in containers"
	@echo "  db-shell  - Connect to PostgreSQL shell"
	@echo "  backend-shell - Connect to backend container shell"
	@echo "  frontend-shell - Connect to frontend container shell"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Start all services with logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# Restart all services
restart: down up

# Show logs
logs:
	docker-compose logs

# Follow logs
logs-f:
	docker-compose logs -f

# Clean up everything
clean:
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -f

# Install dependencies
install:
	docker-compose exec backend npm install
	docker-compose exec frontend npm install

# Run tests
test:
	docker-compose exec backend npm test
	docker-compose exec frontend npm test

# Database shell
db-shell:
	docker-compose exec postgres psql -U resumeuser -d resumebuilderdb

# Backend shell
backend-shell:
	docker-compose exec backend sh

# Frontend shell
frontend-shell:
	docker-compose exec frontend sh

# View service status
status:
	docker-compose ps

# Rebuild and restart specific service
rebuild-backend:
	docker-compose build backend
	docker-compose up -d backend

rebuild-frontend:
	docker-compose build frontend
	docker-compose up -d frontend 