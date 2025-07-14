#!/bin/bash

# PostgreSQL Database Restore Script
# This script restores the resume builder database from backup files

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/restore.log"

# Database configuration
DB_NAME="${DB_NAME:-resumebuilderdb}"
DB_USER="${DB_USER:-resumeuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_PASSWORD="${DB_PASSWORD:-resumepass123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "${RED}$1${NC}"
    exit 1
}

# Success logging
success() {
    log "INFO" "${GREEN}$1${NC}"
}

# Warning logging
warning() {
    log "WARN" "${YELLOW}$1${NC}"
}

# Info logging
info() {
    log "INFO" "${BLUE}$1${NC}"
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_FILE

Restore PostgreSQL database from backup file.

OPTIONS:
    -h, --help              Show this help message
    -l, --list              List available backup files
    -v, --verify            Verify backup file integrity only
    -f, --force             Force restore without confirmation
    -c, --clean             Clean database before restore
    -d, --database NAME     Target database name (default: $DB_NAME)
    -u, --user USER         Database user (default: $DB_USER)
    -H, --host HOST         Database host (default: $DB_HOST)
    -p, --port PORT         Database port (default: $DB_PORT)

EXAMPLES:
    $0 --list                                   # List available backups
    $0 --verify backups/resumebuilderdb_20240101_120000.backup
    $0 backups/resumebuilderdb_20240101_120000.backup
    $0 --force --clean latest                  # Restore latest backup with clean
    
EOF
}

# List available backup files
list_backups() {
    info "Available backup files in $BACKUP_DIR:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        warning "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi
    
    local backups=($(ls -t "$BACKUP_DIR"/*.backup 2>/dev/null || true))
    
    if [ ${#backups[@]} -eq 0 ]; then
        warning "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    echo
    printf "%-5s %-30s %-15s %-20s\n" "No." "Filename" "Size" "Date Modified"
    printf "%-5s %-30s %-15s %-20s\n" "---" "--------" "----" "-------------"
    
    local i=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(date -r "$backup" '+%Y-%m-%d %H:%M:%S')
        printf "%-5s %-30s %-15s %-20s\n" "$i" "$filename" "$size" "$date"
        ((i++))
    done
    
    echo
    info "Use 'latest' to restore the most recent backup"
}

# Verify backup file integrity
verify_backup() {
    local backup_file="$1"
    
    info "Verifying backup file integrity: $(basename "$backup_file")"
    
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    if ! pg_restore --list "$backup_file" &> /dev/null; then
        error_exit "Backup file is corrupted or invalid: $backup_file"
    fi
    
    success "Backup file integrity verified"
    
    # Show backup information
    info "Backup file information:"
    pg_restore --list "$backup_file" | head -20
}

# Get latest backup file
get_latest_backup() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/*.backup 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error_exit "No backup files found in $BACKUP_DIR"
    fi
    
    echo "$latest_backup"
}

# Test database connection
test_connection() {
    info "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
        error_exit "Failed to connect to database server. Check connection parameters."
    fi
    
    success "Database connection successful"
}

# Create database if it doesn't exist
create_database() {
    info "Checking if database exists: $DB_NAME"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        info "Database $DB_NAME already exists"
    else
        info "Creating database: $DB_NAME"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" &> /dev/null; then
            success "Database created successfully"
        else
            error_exit "Failed to create database: $DB_NAME"
        fi
    fi
}

# Clean database (drop and recreate)
clean_database() {
    warning "Cleaning database: $DB_NAME"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Terminate active connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " &> /dev/null || true
    
    # Drop database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" &> /dev/null; then
        success "Database dropped successfully"
    else
        error_exit "Failed to drop database: $DB_NAME"
    fi
    
    # Create database
    create_database
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    info "Starting database restore..."
    info "Backup file: $(basename "$backup_file")"
    info "Target database: $DB_NAME"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Restore database
    if pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$backup_file" \
        2>> "$LOG_FILE"; then
        
        success "Database restored successfully"
        
        # Verify restore by checking table count
        local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
        " 2>/dev/null | xargs)
        
        info "Restored $table_count tables"
    else
        error_exit "Failed to restore database"
    fi
}

# Confirm restore operation
confirm_restore() {
    local backup_file="$1"
    
    echo
    warning "WARNING: This will restore the database and may overwrite existing data!"
    echo
    info "Restore details:"
    echo "  Source: $(basename "$backup_file")"
    echo "  Target: $DB_NAME@$DB_HOST:$DB_PORT"
    echo "  User: $DB_USER"
    echo
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Restore operation cancelled"
        exit 0
    fi
}

# Main execution
main() {
    local backup_file=""
    local force=false
    local clean=false
    local verify_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -l|--list)
                list_backups
                exit 0
                ;;
            -v|--verify)
                verify_only=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -c|--clean)
                clean=true
                shift
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            -u|--user)
                DB_USER="$2"
                shift 2
                ;;
            -H|--host)
                DB_HOST="$2"
                shift 2
                ;;
            -p|--port)
                DB_PORT="$2"
                shift 2
                ;;
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done
    
    # Load environment variables if .env exists
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi
    
    # Load backend environment variables if they exist
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        source "$PROJECT_ROOT/backend/.env"
    fi
    
    # Ensure log directory exists
    mkdir -p "$BACKUP_DIR"
    touch "$LOG_FILE"
    
    log "INFO" "Starting database restore process..."
    
    # Handle special case for 'latest'
    if [ "$backup_file" = "latest" ]; then
        backup_file=$(get_latest_backup)
        info "Using latest backup: $(basename "$backup_file")"
    fi
    
    # Validate backup file
    if [ -z "$backup_file" ]; then
        error_exit "No backup file specified. Use --help for usage information."
    fi
    
    if [ ! -f "$backup_file" ]; then
        # Try to find file in backup directory
        if [ -f "$BACKUP_DIR/$backup_file" ]; then
            backup_file="$BACKUP_DIR/$backup_file"
        else
            error_exit "Backup file not found: $backup_file"
        fi
    fi
    
    # Verify backup file
    verify_backup "$backup_file"
    
    if [ "$verify_only" = true ]; then
        success "Backup verification completed"
        exit 0
    fi
    
    # Test database connection
    test_connection
    
    # Confirm restore operation
    if [ "$force" = false ]; then
        confirm_restore "$backup_file"
    fi
    
    # Clean database if requested
    if [ "$clean" = true ]; then
        clean_database
    else
        create_database
    fi
    
    # Restore database
    restore_database "$backup_file"
    
    success "Database restore process completed successfully"
}

# Handle script interruption
trap 'log "ERROR" "Restore process interrupted"; exit 1' INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 