#!/bin/bash

# PostgreSQL Database Backup Script
# This script creates backups of the resume builder database with rotation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

# Database configuration
DB_NAME="${DB_NAME:-resumebuilderdb}"
DB_USER="${DB_USER:-resumeuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_PASSWORD="${DB_PASSWORD:-resumepass123}"

# Backup configuration
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_FORMAT="${BACKUP_FORMAT:-custom}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    log "ERROR" "$1"
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

# Check if required tools are installed
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump is not installed. Please install PostgreSQL client tools."
    fi
    
    if ! command -v psql &> /dev/null; then
        error_exit "psql is not installed. Please install PostgreSQL client tools."
    fi
    
    success "All dependencies are available"
}

# Create backup directory if it doesn't exist
setup_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "INFO" "Created backup directory: $BACKUP_DIR"
    fi
    
    # Ensure log file exists
    touch "$LOG_FILE"
}

# Test database connection
test_connection() {
    log "INFO" "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error_exit "Failed to connect to database. Check connection parameters."
    fi
    
    success "Database connection successful"
}

# Create database backup
create_backup() {
    log "INFO" "Starting database backup..."
    log "INFO" "Database: $DB_NAME"
    log "INFO" "Backup file: $BACKUP_FILE"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup with custom format for better compression and restore options
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F "$BACKUP_FORMAT" \
        -Z "$COMPRESSION_LEVEL" \
        -v \
        -f "$BACKUP_FILE" \
        2>> "$LOG_FILE"; then
        
        # Get backup file size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        success "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
        
        # Verify backup integrity
        if pg_restore --list "$BACKUP_FILE" &> /dev/null; then
            success "Backup integrity verified"
        else
            warning "Backup integrity check failed"
        fi
    else
        error_exit "Failed to create database backup"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        log "INFO" "Deleting old backup: $(basename "$file")"
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.backup" -type f -mtime +$BACKUP_RETENTION_DAYS -print0)
    
    if [ $deleted_count -eq 0 ]; then
        log "INFO" "No old backups to clean up"
    else
        success "Deleted $deleted_count old backup(s)"
    fi
}

# Generate backup report
generate_report() {
    log "INFO" "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).txt"
    
    cat > "$report_file" << EOF
Database Backup Report
=====================
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
User: $DB_USER

Backup Details:
- File: $BACKUP_FILE
- Size: $(du -h "$BACKUP_FILE" | cut -f1)
- Format: $BACKUP_FORMAT
- Compression: Level $COMPRESSION_LEVEL

Recent Backups:
$(ls -lh "$BACKUP_DIR"/*.backup 2>/dev/null | tail -5 || echo "No backup files found")

Disk Usage:
$(df -h "$BACKUP_DIR")

Log Tail:
$(tail -20 "$LOG_FILE")
EOF
    
    success "Backup report generated: $report_file"
}

# Main execution
main() {
    log "INFO" "Starting database backup process..."
    
    # Load environment variables if .env exists
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi
    
    # Load backend environment variables if they exist
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        source "$PROJECT_ROOT/backend/.env"
    fi
    
    check_dependencies
    setup_backup_directory
    test_connection
    create_backup
    cleanup_old_backups
    generate_report
    
    success "Database backup process completed successfully"
}

# Handle script interruption
trap 'log "ERROR" "Backup process interrupted"; exit 1' INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 