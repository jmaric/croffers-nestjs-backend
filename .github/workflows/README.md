# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### 1. CI (Continuous Integration) - `ci.yml`

**Triggers:**
- Pull requests to `master` or `develop`
- Pushes to `master` or `develop`

**Jobs:**
- **Test**: Runs linter, unit tests, and E2E tests with PostgreSQL and Redis services
- **Build**: Compiles TypeScript and uploads build artifacts
- **Docker**: Builds and pushes Docker image to Docker Hub (only on push events)

**Services:**
- PostgreSQL 16
- Redis 7

**Required Secrets:**
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password/token

---

### 2. CD (Continuous Deployment) - `cd.yml`

**Triggers:**
- Automatic: Pushes to `master` (deploys to staging)
- Manual: Workflow dispatch with environment selection

**Jobs:**
- **deploy-staging**: Automatically deploys to staging on master branch push
- **deploy-production**: Manually triggered production deployment (requires approval)
- **rollback**: Automatic rollback on deployment failure

**Required Secrets:**

**Staging:**
- `STAGING_HOST`: SSH host
- `STAGING_USERNAME`: SSH username
- `STAGING_SSH_KEY`: SSH private key
- `STAGING_PORT`: SSH port

**Production:**
- `PRODUCTION_HOST`: SSH host
- `PRODUCTION_USERNAME`: SSH username
- `PRODUCTION_SSH_KEY`: SSH private key
- `PRODUCTION_PORT`: SSH port
- `PRODUCTION_DATABASE_URL`: Production database connection string

**Monitoring:**
- `SENTRY_AUTH_TOKEN`: Sentry authentication token
- `SENTRY_ORG`: Sentry organization slug
- `SENTRY_PROJECT`: Sentry project slug
- `SLACK_WEBHOOK`: Slack webhook URL for notifications

---

### 3. Security (Security Checks) - `security.yml`

**Triggers:**
- Pull requests to `master` or `develop`
- Pushes to `master` or `develop`
- Scheduled daily at 2 AM UTC

**Jobs:**
- **dependency-scan**: npm audit and Snyk vulnerability scanning
- **code-scanning**: CodeQL static analysis for security vulnerabilities
- **secrets-scan**: TruffleHog secret detection in code history
- **dependency-review**: Review dependency changes in PRs
- **docker-scan**: Trivy container image scanning

**Required Secrets:**
- `SNYK_TOKEN`: Snyk authentication token

---

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your repository **Settings > Secrets and variables > Actions** and add:

```
# Docker (for CI)
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token

# Staging Server (for CD)
STAGING_HOST=staging.example.com
STAGING_USERNAME=deploy
STAGING_SSH_KEY=<private-key-content>
STAGING_PORT=22

# Production Server (for CD)
PRODUCTION_HOST=production.example.com
PRODUCTION_USERNAME=deploy
PRODUCTION_SSH_KEY=<private-key-content>
PRODUCTION_PORT=22
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/db

# Monitoring & Notifications
SENTRY_AUTH_TOKEN=your-sentry-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Security Scanning
SNYK_TOKEN=your-snyk-token
```

### 2. Configure GitHub Environments

1. Go to **Settings > Environments**
2. Create two environments: `staging` and `production`
3. For `production`:
   - Enable "Required reviewers" (add team members who can approve deployments)
   - Set wait timer (optional)

### 3. Server Setup (Staging & Production)

On your deployment servers, ensure:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/croffers-nest-backend
sudo chown deploy:deploy /var/www/croffers-nest-backend

# Clone repository
cd /var/www
git clone <repository-url> croffers-nest-backend
cd croffers-nest-backend

# Install dependencies
npm ci
npx prisma generate

# Create .env file with production settings
nano .env

# Build application
npm run build

# Start with PM2
pm2 start dist/src/main.js --name croffers-nest-backend
pm2 save
pm2 startup
```

### 4. Database Migrations

Migrations are automatically run during deployment. To run manually:

```bash
npx prisma migrate deploy
```

### 5. Health Check Endpoints

The CD workflow uses health check endpoints to verify deployment:

- `GET /health` - General health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

---

## Deployment Flow

### Staging Deployment (Automatic)

1. Developer pushes code to `master` branch
2. CI workflow runs tests and builds
3. If tests pass, CD workflow deploys to staging
4. Health check verifies deployment
5. Slack notification sent

### Production Deployment (Manual)

1. Go to **Actions > CD > Run workflow**
2. Select `production` environment
3. Approve deployment (if reviewers configured)
4. CD workflow deploys to production
5. Sentry release created
6. Health check verifies deployment
7. Slack notification sent

### Rollback

If deployment fails health check:
1. Automatic rollback to previous commit
2. Services restarted
3. Notification sent to Slack

Manual rollback:
```bash
ssh deploy@production.example.com
cd /var/www/croffers-nest-backend
git reset --hard <commit-hash>
npm ci
npx prisma generate
npm run build
pm2 restart croffers-nest-backend
```

---

## Monitoring

### CI Status Badge

Add to your main README.md:

```markdown
![CI Status](https://github.com/yourusername/croffers-nest-backend/workflows/CI/badge.svg)
```

### Coverage Reports

Coverage reports are uploaded to Codecov. Add to `.codecov.yml`:

```yaml
coverage:
  status:
    project:
      default:
        target: 80%
    patch:
      default:
        target: 70%
```

### Security Scanning

- **Dependabot**: Enable in repository settings for automatic dependency updates
- **CodeQL**: Results appear in Security tab
- **Snyk**: View detailed reports at snyk.io

---

## Troubleshooting

### Failed Tests

Check the Actions tab for detailed logs. Common issues:
- Database connection failures: Verify services are running
- Environment variables: Check test environment configuration

### Deployment Failures

1. Check SSH connection: `ssh deploy@host`
2. Verify server has sufficient resources
3. Check PM2 logs: `pm2 logs croffers-nest-backend`
4. Verify environment variables on server

### Docker Build Failures

1. Test locally: `docker build -t test .`
2. Check Dockerfile syntax
3. Verify .dockerignore excludes node_modules

---

## Best Practices

1. **Branch Protection**: Enable branch protection on `master`
   - Require pull request reviews
   - Require status checks to pass
   - Require linear history

2. **Commit Messages**: Use conventional commits
   ```
   feat: add new feature
   fix: bug fix
   docs: documentation changes
   chore: maintenance tasks
   ```

3. **Testing**: Write tests for new features
   - Unit tests for business logic
   - E2E tests for API endpoints
   - Maintain >80% coverage

4. **Security**: Review security scan results regularly
   - Address critical/high vulnerabilities immediately
   - Update dependencies monthly

5. **Monitoring**: Monitor deployment metrics
   - Response times
   - Error rates
   - Resource usage
