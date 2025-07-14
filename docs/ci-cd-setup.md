# CI/CD Pipeline Setup Guide

This document provides comprehensive instructions for setting up and configuring the CI/CD pipeline for the Resume Builder application.

## Overview

The CI/CD pipeline consists of four main GitHub Actions workflows:

1. **Frontend CI** - Tests, lints, and builds the Next.js frontend
2. **Backend CI** - Tests, lints, and builds the Express.js backend  
3. **Code Quality** - Security scans, dependency checks, and code analysis
4. **Deploy** - Automated deployment to staging and production environments

## Workflow Details

### Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (frontend files only)
- Pull requests to `main` or `develop` branches (frontend files only)

**Jobs:**
- Runs on Node.js 18 and 20 (matrix strategy)
- Installs dependencies with caching
- Runs ESLint for code quality
- Performs TypeScript type checking
- Executes tests (when implemented)
- Builds the application
- Uploads build artifacts
- Runs security audit
- Analyzes bundle size

### Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (backend files only)
- Pull requests to `main` or `develop` branches (backend files only)

**Jobs:**
- Runs on Node.js 18 and 20 (matrix strategy)
- Starts PostgreSQL service for testing
- Installs dependencies with caching
- Runs ESLint for code quality
- Performs TypeScript type checking
- Sets up test database
- Executes tests (when implemented)
- Builds the application
- Uploads build artifacts
- Runs security audit
- Tests database connectivity

### Code Quality (`code-quality.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Sundays at midnight UTC)

**Jobs:**
- **Security Scan**: npm audit, Snyk security scanning
- **Dependency Check**: Outdated package detection, license compatibility
- **CodeQL Analysis**: GitHub's semantic code analysis
- **Docker Security**: Trivy vulnerability scanning for containers

### Deploy (`deploy.yml`)

**Triggers:**
- Successful completion of Frontend CI and Backend CI workflows
- Push to `main` (production) or `develop` (staging) branches

**Jobs:**
- **Staging Deployment**: Automatic deployment to staging environment
- **Production Deployment**: Deployment to production with manual approval
- **Rollback**: Automatic rollback on deployment failure

## Setup Instructions

### 1. Repository Secrets Configuration

Navigate to your GitHub repository → Settings → Secrets and Variables → Actions

#### Required Secrets

**AWS Deployment (if using AWS):**
```
AWS_ACCESS_KEY_ID=your_staging_access_key
AWS_SECRET_ACCESS_KEY=your_staging_secret_key
AWS_ACCESS_KEY_ID_PROD=your_production_access_key
AWS_SECRET_ACCESS_KEY_PROD=your_production_secret_key
AWS_REGION=us-east-1
```

**Security Scanning:**
```
SNYK_TOKEN=your_snyk_api_token
```

**Notifications:**
```
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

### 2. Environment Setup

Create GitHub Environments for deployment protection:

1. Go to Settings → Environments
2. Create `staging` environment
3. Create `production` environment
4. Configure protection rules for production:
   - Required reviewers
   - Wait timer (optional)
   - Deployment branches (main only)

### 3. Branch Protection Rules

Set up branch protection for `main` and `develop`:

1. Go to Settings → Branches
2. Add rule for `main`:
   - Require pull request reviews
   - Require status checks to pass before merging
   - Required status checks:
     - `Frontend CI/CD`
     - `Backend CI/CD`
     - `Security Scan`
     - `CodeQL Analysis`
   - Require branches to be up to date
   - Restrict pushes to matching branches

3. Add similar rule for `develop` branch

### 4. Required Package.json Scripts

Ensure the following scripts exist in your package.json files:

**Frontend (`package.json`):**
```json
{
  "scripts": {
    "lint": "next lint",
    "test:ci": "jest --ci --coverage",
    "type-check": "tsc --noEmit",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

**Backend (`backend/package.json`):**
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "test:ci": "jest --ci --coverage",
    "test:db": "npm run test -- --testNamePattern='database'",
    "type-check": "tsc --noEmit"
  }
}
```

## Deployment Configuration

### AWS ECS Deployment (Example)

Update the deployment steps in `deploy.yml`:

```yaml
- name: Deploy to staging
  run: |
    aws ecs update-service \
      --cluster staging-cluster \
      --service resumebuilder-service \
      --force-new-deployment
```

### Vercel Deployment (Alternative)

For Vercel deployment, replace deployment steps with:

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
    vercel-args: '--prod'
```

## Monitoring and Notifications

### Slack Integration

1. Create a Slack webhook in your workspace
2. Add the webhook URL to repository secrets as `SLACK_WEBHOOK_URL`
3. Notifications will be sent for:
   - Successful deployments
   - Failed deployments
   - Rollbacks

### GitHub Actions Dashboard

Monitor workflow runs in the Actions tab:
- View real-time logs
- Download artifacts
- Re-run failed workflows
- Monitor workflow performance

## Troubleshooting

### Common Issues

**1. Workflow not triggering:**
- Check branch protection rules
- Verify file paths in workflow triggers
- Ensure workflows are in `.github/workflows/` directory

**2. Build failures:**
- Check Node.js version compatibility
- Verify all required environment variables are set
- Review dependency installation logs

**3. Test failures:**
- Ensure test database is properly configured
- Check environment variables for test environment
- Verify test scripts exist in package.json

**4. Deployment failures:**
- Verify AWS credentials and permissions
- Check environment configuration
- Review deployment logs for specific errors

### Debugging Steps

1. **Check workflow syntax:**
   ```bash
   .github/validate-workflows.sh
   ```

2. **Validate locally:**
   ```bash
   # Frontend
   npm run lint
   npm run type-check
   npm run build
   
   # Backend
   cd backend
   npm run lint
   npm run type-check
   npm run build
   ```

3. **Test Docker builds:**
   ```bash
   docker build -t test-frontend .
   docker build -t test-backend ./backend
   ```

### Performance Optimization

**1. Caching:**
- Dependencies are cached using `actions/cache`
- Docker layers are cached for faster builds
- Build artifacts are cached between jobs

**2. Matrix Strategy:**
- Tests run in parallel across Node.js versions
- Reduces overall pipeline time

**3. Conditional Execution:**
- Workflows only run when relevant files change
- Security scans run on schedule to avoid blocking PRs

## Security Best Practices

1. **Secrets Management:**
   - Never commit secrets to repository
   - Use GitHub Secrets for sensitive data
   - Rotate secrets regularly

2. **Permissions:**
   - Use least privilege principle
   - Specify explicit permissions in workflows
   - Review third-party actions before use

3. **Dependency Security:**
   - Regular security scans with Snyk
   - Automated dependency updates
   - License compatibility checks

4. **Container Security:**
   - Trivy scans for container vulnerabilities
   - Use official base images
   - Regular image updates

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review security scan results
   - Check for outdated dependencies
   - Monitor workflow performance

2. **Monthly:**
   - Update workflow actions to latest versions
   - Review and update secrets
   - Audit deployment logs

3. **Quarterly:**
   - Review and update security policies
   - Performance optimization review
   - Disaster recovery testing

### Updating Workflows

1. Create feature branch for workflow changes
2. Test changes in pull request
3. Review workflow validation results
4. Merge after approval and testing

## Support

For issues with the CI/CD pipeline:
1. Check this documentation
2. Review workflow logs in GitHub Actions
3. Run local validation script
4. Create an issue with relevant logs and error messages 