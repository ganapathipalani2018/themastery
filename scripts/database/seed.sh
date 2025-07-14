#!/bin/bash

# PostgreSQL Database Seeding Script
# This script populates the database with sample data for development

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SEEDS_DIR="$PROJECT_ROOT/seeds"
LOG_FILE="$PROJECT_ROOT/logs/seed.log"

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
Usage: $0 [OPTIONS] [SEED_FILE]

Database seeding tool for development data.

OPTIONS:
    -h, --help              Show this help message
    -l, --list              List available seed files
    -a, --all               Run all seed files
    -f, --force             Force seeding without confirmation
    -c, --clean             Clean existing data before seeding
    -v, --verbose           Verbose output
    -d, --database NAME     Target database name (default: $DB_NAME)

EXAMPLES:
    $0 --list                           # List available seed files
    $0 --all                            # Run all seed files
    $0 users.sql                        # Run specific seed file
    $0 --clean --all                    # Clean and reseed all data
    
EOF
}

# Create seeds directory and sample files
init_seeds() {
    info "Initializing seed system..."
    
    mkdir -p "$SEEDS_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create sample user seed file
    cat > "$SEEDS_DIR/01_users.sql" << 'EOF'
-- Sample Users Seed Data
-- This file contains sample user data for development

-- Insert sample users
INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at) VALUES
(
    gen_random_uuid(),
    'john.doe@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8/1xFJDl/2', -- password: password123
    'John Doe',
    true,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
),
(
    gen_random_uuid(),
    'jane.smith@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8/1xFJDl/2', -- password: password123
    'Jane Smith',
    true,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    gen_random_uuid(),
    'mike.johnson@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8/1xFJDl/2', -- password: password123
    'Mike Johnson',
    false,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
);

-- Insert sample templates
INSERT INTO templates (id, name, description, category, structure, styles, is_premium, created_at, updated_at) VALUES
(
    gen_random_uuid(),
    'Modern Professional',
    'Clean and modern template suitable for most industries',
    'professional',
    '{"sections": ["personal_info", "work_experience", "education", "skills"]}',
    '{"colors": {"primary": "#2563eb", "secondary": "#64748b"}, "fonts": {"primary": "Inter", "secondary": "Inter"}}',
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Creative Designer',
    'Colorful template perfect for creative professionals',
    'creative',
    '{"sections": ["personal_info", "work_experience", "projects", "skills", "education"]}',
    '{"colors": {"primary": "#7c3aed", "secondary": "#f59e0b"}, "fonts": {"primary": "Poppins", "secondary": "Open Sans"}}',
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Executive Premium',
    'Sophisticated template for senior professionals',
    'executive',
    '{"sections": ["personal_info", "work_experience", "education", "certifications", "skills"]}',
    '{"colors": {"primary": "#1f2937", "secondary": "#6b7280"}, "fonts": {"primary": "Playfair Display", "secondary": "Source Sans Pro"}}',
    true,
    NOW(),
    NOW()
);
EOF

    # Create sample resume seed file
    cat > "$SEEDS_DIR/02_resumes.sql" << 'EOF'
-- Sample Resumes Seed Data
-- This file contains sample resume data for development

-- Get user IDs for reference
WITH sample_users AS (
    SELECT id, email FROM users WHERE email IN ('john.doe@example.com', 'jane.smith@example.com')
),
sample_templates AS (
    SELECT id, name FROM templates WHERE name IN ('Modern Professional', 'Creative Designer')
)

-- Insert sample resumes
INSERT INTO resumes (id, user_id, template_id, title, theme, is_public, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    t.id,
    'Software Engineer Resume',
    'modern',
    false,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '1 day'
FROM sample_users u, sample_templates t
WHERE u.email = 'john.doe@example.com' AND t.name = 'Modern Professional'

UNION ALL

SELECT 
    gen_random_uuid(),
    u.id,
    t.id,
    'UX Designer Portfolio',
    'creative',
    true,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
FROM sample_users u, sample_templates t
WHERE u.email = 'jane.smith@example.com' AND t.name = 'Creative Designer';

-- Insert sample personal info
WITH sample_resume AS (
    SELECT r.id, r.user_id 
    FROM resumes r 
    JOIN users u ON r.user_id = u.id 
    WHERE u.email = 'john.doe@example.com'
    LIMIT 1
)
INSERT INTO personal_info (id, resume_id, full_name, email, phone, location, website, linkedin, github, summary, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    sr.id,
    'John Doe',
    'john.doe@example.com',
    '+1 (555) 123-4567',
    'San Francisco, CA',
    'https://johndoe.dev',
    'https://linkedin.com/in/johndoe',
    'https://github.com/johndoe',
    'Experienced software engineer with 5+ years in full-stack development. Passionate about creating scalable web applications and leading development teams.',
    NOW(),
    NOW()
FROM sample_resume sr;

-- Insert sample work experience
WITH sample_resume AS (
    SELECT r.id, r.user_id 
    FROM resumes r 
    JOIN users u ON r.user_id = u.id 
    WHERE u.email = 'john.doe@example.com'
    LIMIT 1
)
INSERT INTO work_experience (id, resume_id, company, position, location, start_date, end_date, is_current, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    sr.id,
    'Tech Solutions Inc.',
    'Senior Software Engineer',
    'San Francisco, CA',
    '2022-01-01',
    NULL,
    true,
    'Lead a team of 4 developers in building scalable web applications using React and Node.js. Implemented CI/CD pipelines that reduced deployment time by 60%. Mentored junior developers and conducted code reviews.',
    NOW(),
    NOW()
FROM sample_resume sr

UNION ALL

SELECT 
    gen_random_uuid(),
    sr.id,
    'StartupXYZ',
    'Full Stack Developer',
    'San Francisco, CA',
    '2020-06-01',
    '2021-12-31',
    false,
    'Developed and maintained multiple web applications using React, Node.js, and PostgreSQL. Collaborated with design team to implement responsive user interfaces. Optimized database queries resulting in 40% performance improvement.',
    NOW(),
    NOW()
FROM sample_resume sr;

-- Insert sample education
WITH sample_resume AS (
    SELECT r.id, r.user_id 
    FROM resumes r 
    JOIN users u ON r.user_id = u.id 
    WHERE u.email = 'john.doe@example.com'
    LIMIT 1
)
INSERT INTO education (id, resume_id, institution, degree, field_of_study, location, start_date, end_date, gpa, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    sr.id,
    'University of California, Berkeley',
    'Bachelor of Science',
    'Computer Science',
    'Berkeley, CA',
    '2016-08-01',
    '2020-05-01',
    '3.8',
    'Relevant coursework: Data Structures, Algorithms, Database Systems, Software Engineering, Machine Learning',
    NOW(),
    NOW()
FROM sample_resume sr;

-- Insert sample skills
WITH sample_resume AS (
    SELECT r.id, r.user_id 
    FROM resumes r 
    JOIN users u ON r.user_id = u.id 
    WHERE u.email = 'john.doe@example.com'
    LIMIT 1
)
INSERT INTO skills (id, resume_id, name, category, proficiency_level, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    sr.id,
    skill_name,
    skill_category,
    skill_level,
    NOW(),
    NOW()
FROM sample_resume sr
CROSS JOIN (
    VALUES 
        ('JavaScript', 'programming', 'expert'),
        ('TypeScript', 'programming', 'advanced'),
        ('React', 'framework', 'expert'),
        ('Node.js', 'framework', 'advanced'),
        ('PostgreSQL', 'database', 'advanced'),
        ('Docker', 'tools', 'intermediate'),
        ('AWS', 'cloud', 'intermediate'),
        ('Git', 'tools', 'expert'),
        ('Python', 'programming', 'intermediate'),
        ('MongoDB', 'database', 'intermediate')
) AS skills_data(skill_name, skill_category, skill_level);
EOF

    success "Seed system initialized with sample files"
}

# List available seed files
list_seeds() {
    info "Available seed files in $SEEDS_DIR:"
    
    if [ ! -d "$SEEDS_DIR" ]; then
        warning "Seeds directory does not exist: $SEEDS_DIR"
        info "Run with --init to create sample seed files"
        return 1
    fi
    
    local seeds=($(ls "$SEEDS_DIR"/*.sql 2>/dev/null | sort || true))
    
    if [ ${#seeds[@]} -eq 0 ]; then
        warning "No seed files found in $SEEDS_DIR"
        info "Run with --init to create sample seed files"
        return 1
    fi
    
    echo
    printf "%-5s %-30s %-15s %-20s\n" "No." "Filename" "Size" "Date Modified"
    printf "%-5s %-30s %-15s %-20s\n" "---" "--------" "----" "-------------"
    
    local i=1
    for seed in "${seeds[@]}"; do
        local filename=$(basename "$seed")
        local size=$(du -h "$seed" | cut -f1)
        local date=$(date -r "$seed" '+%Y-%m-%d %H:%M:%S')
        printf "%-5s %-30s %-15s %-20s\n" "$i" "$filename" "$size" "$date"
        ((i++))
    done
    
    echo
}

# Clean existing data
clean_data() {
    warning "Cleaning existing data..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Clean data in reverse dependency order
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clean all tables
TRUNCATE TABLE 
    skills,
    projects,
    certifications,
    languages,
    custom_sections,
    education,
    work_experience,
    personal_info,
    resumes,
    templates,
    password_reset_tokens,
    email_verification_tokens,
    user_sessions,
    users
CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;
EOF
    
    success "Data cleaned successfully"
}

# Run single seed file
run_seed() {
    local seed_file="$1"
    
    if [ ! -f "$seed_file" ]; then
        # Try to find file in seeds directory
        if [ -f "$SEEDS_DIR/$seed_file" ]; then
            seed_file="$SEEDS_DIR/$seed_file"
        else
            error_exit "Seed file not found: $seed_file"
        fi
    fi
    
    info "Running seed file: $(basename "$seed_file")"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed_file" >> "$LOG_FILE" 2>&1; then
        success "Seed file executed successfully: $(basename "$seed_file")"
    else
        error_exit "Failed to execute seed file: $(basename "$seed_file")"
    fi
}

# Run all seed files
run_all_seeds() {
    info "Running all seed files..."
    
    if [ ! -d "$SEEDS_DIR" ]; then
        error_exit "Seeds directory does not exist: $SEEDS_DIR"
    fi
    
    local seeds=($(ls "$SEEDS_DIR"/*.sql 2>/dev/null | sort || true))
    
    if [ ${#seeds[@]} -eq 0 ]; then
        error_exit "No seed files found in $SEEDS_DIR"
    fi
    
    local success_count=0
    local total_count=${#seeds[@]}
    
    for seed in "${seeds[@]}"; do
        run_seed "$seed"
        ((success_count++))
    done
    
    success "Executed $success_count/$total_count seed files successfully"
}

# Generate sample data programmatically
generate_sample_data() {
    info "Generating additional sample data..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Generate more users
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Generate additional sample users
INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'user' || generate_series || '@example.com',
    '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8/1xFJDl/2',
    'User ' || generate_series,
    (random() > 0.3),
    NOW() - (random() * INTERVAL '90 days'),
    NOW() - (random() * INTERVAL '30 days')
FROM generate_series(4, 10);
EOF
    
    success "Additional sample data generated"
}

# Show seeding statistics
show_stats() {
    info "Database seeding statistics:"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Get table counts
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "Rows Inserted",
    n_tup_upd as "Rows Updated",
    n_tup_del as "Rows Deleted"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
EOF
    
    echo
    
    # Get current row counts
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_name = tables.table_name) as "Current Rows"
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
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
    local seed_file=""
    local clean=false
    local force=false
    local verbose=false
    local run_all=false
    local init_system=false
    local generate_data=false
    local show_statistics=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -l|--list)
                list_seeds
                exit 0
                ;;
            -a|--all)
                run_all=true
                shift
                ;;
            -c|--clean)
                clean=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            --init)
                init_system=true
                shift
                ;;
            --generate)
                generate_data=true
                shift
                ;;
            --stats)
                show_statistics=true
                shift
                ;;
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                seed_file="$1"
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
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log "INFO" "Starting database seeding process..."
    
    # Initialize seed system if requested
    if [ "$init_system" = true ]; then
        init_seeds
        exit 0
    fi
    
    # Show statistics if requested
    if [ "$show_statistics" = true ]; then
        test_connection
        show_stats
        exit 0
    fi
    
    # Test database connection
    test_connection
    
    # Clean data if requested
    if [ "$clean" = true ]; then
        if [ "$force" = false ]; then
            warning "This will delete all existing data!"
            read -p "Are you sure you want to proceed? (yes/no): " -r
            echo
            if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                info "Clean operation cancelled"
                exit 0
            fi
        fi
        clean_data
    fi
    
    # Execute seeding
    if [ "$run_all" = true ]; then
        run_all_seeds
    elif [ -n "$seed_file" ]; then
        run_seed "$seed_file"
    else
        error_exit "No seed file specified. Use --all to run all seeds or specify a file."
    fi
    
    # Generate additional data if requested
    if [ "$generate_data" = true ]; then
        generate_sample_data
    fi
    
    # Show final statistics
    show_stats
    
    success "Database seeding process completed successfully"
}

# Handle script interruption
trap 'log "ERROR" "Seeding process interrupted"; exit 1' INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 