#!/bin/bash

# GitHub Actions Workflow Validation Script
# This script validates the syntax and checks for common issues in GitHub Actions workflows

set -e

echo "🔍 Validating GitHub Actions workflows..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ File not found: $1${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Found: $1${NC}"
    return 0
}

# Function to validate YAML syntax
validate_yaml() {
    if command -v yamllint >/dev/null 2>&1; then
        echo "🔧 Validating YAML syntax with yamllint..."
        yamllint .github/workflows/ || echo -e "${YELLOW}⚠️  yamllint not available or found issues${NC}"
    elif command -v python3 >/dev/null 2>&1; then
        echo "🔧 Validating YAML syntax with Python..."
        python3 -c "
import yaml
import sys
import os

workflow_dir = '.github/workflows'
errors = []

for filename in os.listdir(workflow_dir):
    if filename.endswith('.yml') or filename.endswith('.yaml'):
        filepath = os.path.join(workflow_dir, filename)
        try:
            with open(filepath, 'r') as file:
                yaml.safe_load(file)
            print(f'✅ {filename}: Valid YAML syntax')
        except yaml.YAMLError as e:
            print(f'❌ {filename}: YAML syntax error - {e}')
            errors.append(filename)

if errors:
    sys.exit(1)
"
    else
        echo -e "${YELLOW}⚠️  No YAML validator available (yamllint or python3)${NC}"
    fi
}

# Function to check workflow structure
check_workflow_structure() {
    echo "🔧 Checking workflow structure..."
    
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            filename=$(basename "$workflow")
            echo "📋 Checking $filename..."
            
            # Check for required fields
            if ! grep -q "^name:" "$workflow"; then
                echo -e "${RED}❌ Missing 'name' field in $filename${NC}"
            fi
            
            if ! grep -q "^on:" "$workflow"; then
                echo -e "${RED}❌ Missing 'on' field in $filename${NC}"
            fi
            
            if ! grep -q "^jobs:" "$workflow"; then
                echo -e "${RED}❌ Missing 'jobs' field in $filename${NC}"
            fi
            
            # Check for checkout action
            if ! grep -q "uses: actions/checkout@" "$workflow"; then
                echo -e "${YELLOW}⚠️  No checkout action found in $filename${NC}"
            fi
            
            # Check for Node.js setup in CI workflows
            if [[ "$filename" == *"ci.yml" ]] && ! grep -q "uses: actions/setup-node@" "$workflow"; then
                echo -e "${YELLOW}⚠️  No Node.js setup found in CI workflow $filename${NC}"
            fi
            
            echo -e "${GREEN}✅ Basic structure check completed for $filename${NC}"
        fi
    done
}

# Function to check for security best practices
check_security() {
    echo "🔧 Checking security best practices..."
    
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            filename=$(basename "$workflow")
            
            # Check for hardcoded secrets
            if grep -q "password\|secret\|token" "$workflow" | grep -v "\${{" | grep -v "secrets\."; then
                echo -e "${RED}❌ Potential hardcoded secrets in $filename${NC}"
            fi
            
            # Check for permissions
            if grep -q "permissions:" "$workflow"; then
                echo -e "${GREEN}✅ Permissions specified in $filename${NC}"
            else
                echo -e "${YELLOW}⚠️  No permissions specified in $filename${NC}"
            fi
        fi
    done
}

# Function to check dependencies
check_dependencies() {
    echo "🔧 Checking workflow dependencies..."
    
    # Check if required tools are available for the workflows
    echo "📦 Checking required tools..."
    
    if command -v node >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Node.js is available${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js not found (required for CI workflows)${NC}"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo -e "${GREEN}✅ npm is available${NC}"
    else
        echo -e "${YELLOW}⚠️  npm not found (required for CI workflows)${NC}"
    fi
    
    if command -v docker >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is available${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker not found (required for containerization workflows)${NC}"
    fi
}

# Main validation process
main() {
    echo "🚀 Starting GitHub Actions workflow validation..."
    echo ""
    
    # Check if .github/workflows directory exists
    if [ ! -d ".github/workflows" ]; then
        echo -e "${RED}❌ .github/workflows directory not found${NC}"
        exit 1
    fi
    
    # Check for workflow files
    echo "📁 Checking for workflow files..."
    check_file ".github/workflows/frontend-ci.yml"
    check_file ".github/workflows/backend-ci.yml"
    check_file ".github/workflows/deploy.yml"
    check_file ".github/workflows/code-quality.yml"
    
    echo ""
    
    # Validate YAML syntax
    validate_yaml
    echo ""
    
    # Check workflow structure
    check_workflow_structure
    echo ""
    
    # Check security practices
    check_security
    echo ""
    
    # Check dependencies
    check_dependencies
    echo ""
    
    echo -e "${GREEN}🎉 Workflow validation completed!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "1. Configure repository secrets in GitHub settings"
    echo "2. Set up branch protection rules"
    echo "3. Test workflows by creating a pull request"
    echo "4. Monitor workflow runs in the Actions tab"
}

# Run main function
main 