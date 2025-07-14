#!/bin/bash

# Environment Setup Script for Resume Builder
# This script helps set up environment variables for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to setup environment for a specific environment
setup_environment() {
    local env_name=$1
    local source_file="config/${env_name}.env"
    local target_file=".env"
    local backend_target_file="backend/.env"
    
    print_header "Setting up ${env_name} environment..."
    
    if [ ! -f "$source_file" ]; then
        print_error "Source environment file $source_file not found!"
        exit 1
    fi
    
    # Copy environment file to root
    cp "$source_file" "$target_file"
    print_status "Copied $source_file to $target_file"
    
    # Copy environment file to backend
    cp "$source_file" "$backend_target_file"
    print_status "Copied $source_file to $backend_target_file"
    
    # Generate secure secrets for production/staging
    if [ "$env_name" = "production" ] || [ "$env_name" = "staging" ]; then
        print_warning "Generating secure secrets for ${env_name}..."
        
        JWT_SECRET=$(generate_secret)
        JWT_REFRESH_SECRET=$(generate_secret)
        SESSION_SECRET=$(generate_secret)
        
        # Replace placeholder secrets in both files
        sed -i.bak "s/CHANGE_ME_.*_JWT_SECRET_.*/${JWT_SECRET}/" "$target_file" "$backend_target_file"
        sed -i.bak "s/CHANGE_ME_.*_REFRESH_SECRET_.*/${JWT_REFRESH_SECRET}/" "$target_file" "$backend_target_file"
        sed -i.bak "s/CHANGE_ME_.*_SESSION_SECRET/${SESSION_SECRET}/" "$target_file" "$backend_target_file"
        
        # Remove backup files
        rm -f "${target_file}.bak" "${backend_target_file}.bak"
        
        print_status "Generated secure secrets for JWT and session"
        print_warning "Please update database passwords and external service credentials manually!"
    fi
    
    print_status "Environment setup complete for ${env_name}"
}

# Function to validate environment
validate_environment() {
    print_header "Validating environment configuration..."
    
    # Check if .env files exist
    if [ ! -f ".env" ]; then
        print_error ".env file not found in root directory"
        return 1
    fi
    
    if [ ! -f "backend/.env" ]; then
        print_error ".env file not found in backend directory"
        return 1
    fi
    
    # Check for required variables
    local required_vars=("NODE_ENV" "JWT_SECRET" "JWT_REFRESH_SECRET" "DB_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    # Check for placeholder values in production
    if grep -q "NODE_ENV=production" .env; then
        if grep -q "CHANGE_ME" .env; then
            print_error "Found placeholder values in production environment!"
            print_warning "Please update all CHANGE_ME values before deploying to production"
            return 1
        fi
    fi
    
    print_status "Environment validation passed"
    return 0
}

# Function to show current environment info
show_environment_info() {
    print_header "Current Environment Information"
    
    if [ -f ".env" ]; then
        local node_env=$(grep "^NODE_ENV=" .env | cut -d'=' -f2)
        local api_url=$(grep "^NEXT_PUBLIC_API_URL=" .env | cut -d'=' -f2)
        local db_host=$(grep "^DB_HOST=" .env | cut -d'=' -f2)
        local db_name=$(grep "^DB_NAME=" .env | cut -d'=' -f2)
        
        echo "Environment: $node_env"
        echo "API URL: $api_url"
        echo "Database Host: $db_host"
        echo "Database Name: $db_name"
    else
        print_warning "No .env file found"
    fi
}

# Function to backup current environment
backup_environment() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="backups/env_${timestamp}"
    
    print_header "Backing up current environment to $backup_dir"
    
    mkdir -p "$backup_dir"
    
    if [ -f ".env" ]; then
        cp ".env" "$backup_dir/"
        print_status "Backed up root .env"
    fi
    
    if [ -f "backend/.env" ]; then
        cp "backend/.env" "$backup_dir/"
        print_status "Backed up backend .env"
    fi
    
    print_status "Environment backup complete"
}

# Main script logic
case "${1:-help}" in
    "development"|"dev")
        setup_environment "development"
        ;;
    "staging")
        backup_environment
        setup_environment "staging"
        ;;
    "production"|"prod")
        backup_environment
        setup_environment "production"
        ;;
    "validate")
        validate_environment
        ;;
    "info")
        show_environment_info
        ;;
    "backup")
        backup_environment
        ;;
    "help"|*)
        echo "Usage: $0 {development|staging|production|validate|info|backup}"
        echo ""
        echo "Commands:"
        echo "  development  - Set up development environment"
        echo "  staging      - Set up staging environment (with backup)"
        echo "  production   - Set up production environment (with backup)"
        echo "  validate     - Validate current environment configuration"
        echo "  info         - Show current environment information"
        echo "  backup       - Backup current environment files"
        echo "  help         - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 development     # Set up for local development"
        echo "  $0 staging         # Set up for staging deployment"
        echo "  $0 validate        # Check current environment"
        ;;
esac 