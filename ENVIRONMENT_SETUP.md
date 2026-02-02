# Environment Configuration Setup

## Overview
This project uses environment variables to manage configuration across different environments (development, staging, production).

## Environment Variables

### Required Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_URL` - Backend API URL
- `VITE_ENV` - Environment (development/staging/production)

## Setup Instructions

### 1. Development Environment
```bash
# Copy the example file
cp .env.example .env

# Update with your values
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8080/api/v1
VITE_ENV=development
```

### 2. Production Environment
```bash
# Copy the production example
cp env.production.example .env.production

# Update with production values
VITE_SUPABASE_URL=https://your-production-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_API_URL=https://your-production-api.com/api/v1
VITE_ENV=production
```

## Usage in Code

### Import Environment Variables
```javascript
// supabase_config.js
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const API_URL = import.meta.env.VITE_API_URL
export const ENV = import.meta.env.VITE_ENV || 'development'
```

### Validation
```javascript
// Environment validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables')
}
```

### Fallback Values
```javascript
// With fallback
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
```

## Security Best Practices

### ✅ Do
- Keep `.env` files in `.gitignore`
- Use different keys for different environments
- Rotate keys regularly
- Use environment-specific configurations

### ❌ Don't
- Commit `.env` files to version control
- Use production keys in development
- Share environment variables publicly
- Hardcode secrets in code

## Environment Files

### `.env` (Development)
- Used for local development
- Contains development URLs and keys
- Not committed to git

### `.env.production` (Production)
- Used for production deployment
- Contains production URLs and keys
- Not committed to git

### `.env.example` (Template)
- Template for required variables
- Committed to git for reference
- No actual values included

## Deployment

### Vite Build Process
```bash
# Development build
npm run build

# Production build (uses .env.production)
npm run build --mode production
```

### Environment Detection
```javascript
// Check current environment
const isProduction = import.meta.env.PROD
const isDevelopment = import.meta.env.DEV
const mode = import.meta.env.MODE
```

## Troubleshooting

### Missing Environment Variables
```javascript
// Error: Missing required Supabase environment variables
// Solution: Check .env file exists and contains required variables
```

### Invalid Supabase URL
```javascript
// Error: Invalid Supabase URL
// Solution: Verify VITE_SUPABASE_URL is correct
```

### API Connection Issues
```javascript
// Error: Network connection failed
// Solution: Check VITE_API_URL is accessible
```

## Security Notes

### Environment Variable Access
- Only variables prefixed with `VITE_` are exposed to frontend
- Server-side variables are not accessible in browser
- Use `.env` files for local development only

### Key Rotation
1. Generate new keys in Supabase dashboard
2. Update environment variables
3. Redeploy application
4. Test functionality

### Audit Trail
- Monitor environment variable usage
- Track key changes
- Review access logs regularly

## File Structure
```
frontend/
├── .env                    # Development (gitignored)
├── .env.example           # Template (committed)
├── .env.production        # Production (gitignored)
├── .gitignore             # Excludes env files
├── supabase_config.js     # Uses environment variables
├── src/services/api.js    # Uses environment variables
└── ENVIRONMENT_SETUP.md   # This documentation
```

This setup ensures secure, environment-specific configuration for your React + Vite application.
