#!/bin/bash

# PostgreSQL Database Migration Script
# This script manages database schema migrations with versioning

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
LOG_FILE="$PROJECT_ROOT/logs/migration.log"

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
Usage: $0 [COMMAND] [OPTIONS]

Database migration management tool.

COMMANDS:
    init                    Initialize migration system
    create NAME             Create a new migration file
    up [VERSION]            Apply migrations (up to specific version)
    down [VERSION]          Rollback migrations (down to specific version)
    status                  Show migration status
    reset                   Reset database and apply all migrations
    rollback [STEPS]        Rollback N migrations (default: 1)
    
OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Verbose output
    -f, --force             Force operation without confirmation
    -d, --database NAME     Target database name (default: $DB_NAME)

EXAMPLES:
    $0 init                                 # Initialize migration system
    $0 create add_user_preferences          # Create new migration
    $0 up                                   # Apply all pending migrations
    $0 up 20240101_120000                   # Apply migrations up to version
    $0 down 20240101_120000                 # Rollback to specific version
    $0 rollback 2                           # Rollback 2 migrations
    $0 status                               # Show current status
    
EOF
}

# Initialize migration system
init_migration_system() {
    info "Initializing migration system..."
    
    # Create migrations directory
    mkdir -p "$MIGRATIONS_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create migration tracking table
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    checksum VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);
EOF
    
    success "Migration system initialized"
}

# Create new migration file
create_migration() {
    local name="$1"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local version="${timestamp}_${name}"
    local up_file="$MIGRATIONS_DIR/${version}_up.sql"
    local down_file="$MIGRATIONS_DIR/${version}_down.sql"
    
    info "Creating migration: $version"
    
    # Create up migration file
    cat > "$up_file" << EOF
-- Migration: $name
-- Created: $(date)
-- Version: $version

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

EOF
    
    # Create down migration file
    cat > "$down_file" << EOF
-- Rollback: $name
-- Created: $(date)
-- Version: $version

-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example_table;

EOF
    
    success "Migration files created:"
    echo "  Up:   $up_file"
    echo "  Down: $down_file"
}

# Get applied migrations
get_applied_migrations() {
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT version FROM schema_migrations ORDER BY version;
    " 2>/dev/null | sed 's/^[ \t]*//' | grep -v '^$' || true
}

# Get available migrations
get_available_migrations() {
    find "$MIGRATIONS_DIR" -name "*_up.sql" -exec basename {} \; | sed 's/_up\.sql$//' | sort
}

# Calculate file checksum
calculate_checksum() {
    local file="$1"
    if [ -f "$file" ]; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        echo ""
    fi
}

# Apply single migration
apply_migration() {
    local version="$1"
    local up_file="$MIGRATIONS_DIR/${version}_up.sql"
    local down_file="$MIGRATIONS_DIR/${version}_down.sql"
    
    if [ ! -f "$up_file" ]; then
        error_exit "Migration file not found: $up_file"
    fi
    
    info "Applying migration: $version"
    
    # Calculate checksum
    local checksum=$(calculate_checksum "$up_file")
    
    # Extract description from migration file
    local description=$(grep "^-- Migration:" "$up_file" | sed 's/^-- Migration: //' || echo "")
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Apply migration
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$up_file" >> "$LOG_FILE" 2>&1; then
        # Record migration
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO schema_migrations (version, description, checksum) 
            VALUES ('$version', '$description', '$checksum');
        " >> "$LOG_FILE" 2>&1
        
        success "Applied migration: $version"
    else
        error_exit "Failed to apply migration: $version"
    fi
}

# Rollback single migration
rollback_migration() {
    local version="$1"
    local down_file="$MIGRATIONS_DIR/${version}_down.sql"
    
    if [ ! -f "$down_file" ]; then
        error_exit "Rollback file not found: $down_file"
    fi
    
    info "Rolling back migration: $version"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Apply rollback
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$down_file" >> "$LOG_FILE" 2>&1; then
        # Remove migration record
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            DELETE FROM schema_migrations WHERE version = '$version';
        " >> "$LOG_FILE" 2>&1
        
        success "Rolled back migration: $version"
    else
        error_exit "Failed to rollback migration: $version"
    fi
}

# Apply migrations up to version
migrate_up() {
    local target_version="$1"
    
    info "Applying migrations..."
    
    local applied_migrations=($(get_applied_migrations))
    local available_migrations=($(get_available_migrations))
    
    local applied_count=0
    
    for version in "${available_migrations[@]}"; do
        # Check if migration is already applied
        if [[ " ${applied_migrations[*]} " =~ " ${version} " ]]; then
            continue
        fi
        
        # Apply migration
        apply_migration "$version"
        ((applied_count++))
        
        # Stop if we've reached the target version
        if [ -n "$target_version" ] && [ "$version" = "$target_version" ]; then
            break
        fi
    done
    
    if [ $applied_count -eq 0 ]; then
        info "No migrations to apply"
    else
        success "Applied $applied_count migration(s)"
    fi
}

# Rollback migrations down to version
migrate_down() {
    local target_version="$1"
    
    info "Rolling back migrations..."
    
    local applied_migrations=($(get_applied_migrations | tac))
    local rollback_count=0
    
    for version in "${applied_migrations[@]}"; do
        # Stop if we've reached the target version
        if [ -n "$target_version" ] && [ "$version" = "$target_version" ]; then
            break
        fi
        
        # Rollback migration
        rollback_migration "$version"
        ((rollback_count++))
    done
    
    if [ $rollback_count -eq 0 ]; then
        info "No migrations to rollback"
    else
        success "Rolled back $rollback_count migration(s)"
    fi
}

# Rollback N migrations
rollback_steps() {
    local steps="${1:-1}"
    
    info "Rolling back $steps migration(s)..."
    
    local applied_migrations=($(get_applied_migrations | tac))
    local rollback_count=0
    
    for version in "${applied_migrations[@]}"; do
        if [ $rollback_count -ge $steps ]; then
            break
        fi
        
        rollback_migration "$version"
        ((rollback_count++))
    done
    
    if [ $rollback_count -eq 0 ]; then
        info "No migrations to rollback"
    else
        success "Rolled back $rollback_count migration(s)"
    fi
}

# Show migration status
show_status() {
    info "Migration Status:"
    echo
    
    local applied_migrations=($(get_applied_migrations))
    local available_migrations=($(get_available_migrations))
    
    printf "%-30s %-10s %-20s\n" "Version" "Status" "Applied At"
    printf "%-30s %-10s %-20s\n" "-------" "------" "----------"
    
    for version in "${available_migrations[@]}"; do
        if [[ " ${applied_migrations[*]} " =~ " ${version} " ]]; then
            # Get applied timestamp
            export PGPASSWORD="$DB_PASSWORD"
            local applied_at=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT applied_at FROM schema_migrations WHERE version = '$version';
            " 2>/dev/null | sed 's/^[ \t]*//' | grep -v '^$' || echo "Unknown")
            
            printf "%-30s %-10s %-20s\n" "$version" "${GREEN}Applied${NC}" "$applied_at"
        else
            printf "%-30s %-10s %-20s\n" "$version" "${YELLOW}Pending${NC}" "-"
        fi
    done
    
    echo
    info "Total migrations: ${#available_migrations[@]}"
    info "Applied migrations: ${#applied_migrations[@]}"
    info "Pending migrations: $((${#available_migrations[@]} - ${#applied_migrations[@]}))"
}

# Reset database and apply all migrations
reset_database() {
    warning "This will reset the database and apply all migrations!"
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Reset operation cancelled"
        return 0
    fi
    
    info "Resetting database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop all tables
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
EOF
    
    # Reinitialize migration system
    init_migration_system
    
    # Apply all migrations
    migrate_up ""
    
    success "Database reset completed"
}

# Test database connection
test_connection() {
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error_exit "Failed to connect to database. Check connection parameters."
    fi
}

# Main execution
main() {
    local command=""
    local verbose=false
    local force=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            init|create|up|down|status|reset|rollback)
                command="$1"
                shift
                break
                ;;
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                error_exit "Unknown command: $1"
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
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Test database connection
    test_connection
    
    # Execute command
    case $command in
        init)
            init_migration_system
            ;;
        create)
            if [ $# -eq 0 ]; then
                error_exit "Migration name is required"
            fi
            create_migration "$1"
            ;;
        up)
            migrate_up "${1:-}"
            ;;
        down)
            migrate_down "${1:-}"
            ;;
        status)
            show_status
            ;;
        reset)
            reset_database
            ;;
        rollback)
            rollback_steps "${1:-1}"
            ;;
        *)
            error_exit "Command is required. Use --help for usage information."
            ;;
    esac
}

# Handle script interruption
trap 'log "ERROR" "Migration process interrupted"; exit 1' INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 