# PETIKEMAS PP Frontend Deployment Guide

## Overview
This guide covers deploying the PETIKEMAS PP React + Vite frontend to production hosting with **safe environment configuration**.

## 🛡️ Safe Configuration Features

### ✅ No Runtime Errors
- **NEVER throws errors** at module scope for missing environment variables
- **Safe fallbacks** for all environment variables
- **Development warnings** instead of crashes
- **Production-ready** error handling

### ✅ Supabase Safety
- **Conditional initialization** - only creates client if credentials exist
- **Null fallback** - app continues to work even without Supabase
- **Development logging** - helpful warnings in dev mode
- **Production silence** - no console spam in production

## Prerequisites

### Environment Setup
- Node.js 18+ installed
- Supabase project configured
- Admin users created in Supabase

### Required Files
- `.env.production` - Production environment variables
- `dist/` folder - Built application

## 🚀 Quick Deploy

### Option 1: Automated Script
```bash
# Make script executable
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

### Option 2: Manual Deploy
```bash
# 1. Setup environment
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Build
npm run build:prod

# 3. Deploy
netlify deploy --prod --dir=dist
```

## 🔧 Environment Configuration

### 1. Environment Variables
Create `.env.production`:
```bash
# Required Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional API
VITE_API_URL=https://api.petikemas.com/api/v1

# Environment
VITE_ENV=production
VITE_MOBILE_OPTIMIZED=true
```

### 2. Safe Configuration Files

#### `supabase_config.js` - Safe Configuration
```javascript
// ✅ SAFE: Never throws errors at module scope
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || null
export const IS_SUPABASE_READY = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

// Development warnings only (no production console spam)
if (import.meta.env.DEV && !IS_SUPABASE_READY) {
  console.warn('⚠️ Supabase not configured')
}
```

#### `supabase.js` - Safe Initialization
```javascript
// ✅ SAFE: Conditional initialization
export const supabase = IS_SUPABASE_READY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {...})
  : null

// ✅ SAFE: Development warning only
if (!IS_SUPABASE_READY && import.meta.env.DEV) {
  console.warn('⚠️ Supabase not initialized')
}
```

## 🌐 Netlify Configuration

### `netlify.toml` - Production Ready
```toml
[build]
  command = "npm run build:prod"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  VITE_ENV = "production"

# SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

## 📱 Mobile Optimization

### Vite Configuration
```javascript
export default defineConfig({
  base: '/', // Netlify compatible
  build: {
    target: 'es2015', // Mobile compatibility
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})
```

### HTML Meta Tags
```html
<!-- Mobile optimized -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#2563eb">

<!-- Preconnect to Supabase -->
<link rel="preconnect" href="https://your-project.supabase.co">
```

## 🔍 Troubleshooting

### Environment Issues
```bash
# Check environment variables
npm run build:prod

# Should see warnings in development, not errors
# Should build successfully even without env vars
```

### Common Issues

#### ❌ "Missing required Supabase environment variables"
**✅ FIXED:** This error no longer exists. App now handles missing env vars safely.

#### ❌ Build crashes due to missing env vars
**✅ FIXED:** All environment variables have safe fallbacks.

#### ❌ Runtime errors in production
**✅ FIXED:** Conditional initialization prevents runtime crashes.

### Debug Mode
```bash
# Development mode shows helpful warnings
npm run dev

# Production mode is silent and safe
npm run build:prod
```

## 📊 Build Analysis

### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze
```

### Expected Output
```
dist/
├── assets/
│   ├── vendor-[hash].js     (~200KB)
│   ├── router-[hash].js     (~50KB)
│   ├── supabase-[hash].js   (~30KB)
│   └── ui-[hash].js         (~20KB)
├── index.html               (~5KB)
└── favicon.ico              (~4KB)
Total: ~300KB gzipped
```

## 🎯 Production Checklist

### Pre-Deploy Checklist
- [ ] `.env.production` created with correct values
- [ ] Supabase CORS includes Netlify domain
- [ ] Build completes without errors
- [ ] Bundle size is reasonable (< 500KB gzipped)
- [ ] Mobile responsiveness tested

### Post-Deploy Checklist
- [ ] App loads without console errors
- [ ] Supabase connection works
- [ ] Login/logout functions
- [ ] File upload/download works
- [ ] Mobile experience is smooth
- [ ] PWA features (if enabled)

## 🔄 CI/CD Integration

### GitHub Actions (Optional)
```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:prod
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
```

## 📞 Support

### Environment Issues
- Check `.env.production` format
- Verify Netlify environment variables
- Ensure VITE_ prefix for all env vars

### Build Issues
- Run `npm run clean` before building
- Check Node.js version (18+)
- Verify all dependencies installed

### Runtime Issues
- Check browser console for errors
- Verify Supabase credentials
- Test in both development and production

---

## 🎉 Success Metrics

✅ **Safe Configuration**: No runtime crashes from missing env vars  
✅ **Mobile Ready**: Responsive design with touch optimization  
✅ **Performance**: < 3s load time, < 500KB bundle size  
✅ **Security**: Proper headers and CSP policies  
✅ **Reliability**: Graceful fallbacks and error handling
# Create production environment file
cp production.env.example .env.production

# Update with production values
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_API_URL=https://your-api.com/api/v1
VITE_ENV=production
```

### 2. Build Application
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Or use the deployment script
chmod +x deploy.sh
./deploy.sh
```

### 3. Build Output
```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── index-*.css     # Styles
│   └── index-*.js      # JavaScript
├── 404.html           # Custom 404 page
└── _redirects         # SPA routing rules
```

## Hosting Configuration

### SPA Routing Requirements
The application uses React Router and requires SPA routing support:

#### Netlify
```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel
```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### GitHub Pages
```yaml
# .github/workflows/deploy.yml
- name: Setup Pages
  uses: actions/configure-pages@v3
- name: Upload artifact
  uses: actions/upload-pages-artifact@v2
  with:
    path: './dist'
```

#### Apache Server
```apache
# .htaccess
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]
```

#### Nginx
```nginx
# nginx.conf
location / {
    try_files $uri $uri/ /index.html;
}
```

## Route Access Control

### Public Routes (No Authentication Required)
- `/` - Root redirect to home
- `/home` - Public home page
- `/files` - Public file listing
- `/downloads` - Public downloads
- `/inventory/groups` - Public inventory
- `/login` - Admin login page

### Protected Routes (Admin Authentication Required)
- `/dashboard` - Admin dashboard
- `/upload` - File upload (admin only)
- `/profile` - Admin profile

### Authentication Flow
1. User accesses protected route
2. `ProtectedRoute` component checks authentication
3. If not authenticated, redirects to `/login`
4. After login, validates admin role against database
5. If not admin, automatically logs out

## Environment Variables

### Production Variables
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_API_URL=https://your-api.com/api/v1
VITE_ENV=production
```

### Security Notes
- Only variables prefixed with `VITE_` are exposed to frontend
- Supabase keys should be restricted to necessary operations
- Use different keys for development and production

## Deployment Platforms

### Netlify
```bash
# Deploy to Netlify
npm run build
npx netlify deploy --prod --dir=dist
```

### Vercel
```bash
# Deploy to Vercel
npm run build
npx vercel --prod
```

### GitHub Pages
```bash
# Deploy to GitHub Pages
npm run build
npx gh-pages -d dist
```

### Static Hosting
```bash
# Upload dist folder to any static hosting service
# Ensure SPA routing is configured
```

## Post-Deployment Checklist

### ✅ Verification Steps
1. **Public Access**
   - [ ] Home page loads without authentication
   - [ ] File listing works for guests
   - [ ] Downloads work for guests
   - [ ] 404 page works correctly

2. **Admin Authentication**
   - [ ] Login page loads
   - [ ] Admin login works with correct credentials
   - [ ] Protected routes redirect to login
   - [ ] Admin dashboard accessible after login

3. **File Operations**
   - [ ] Admin can upload files
   - [ ] Admin can delete files
   - [ ] Public users can download files
   - [ ] File metadata displays correctly

4. **Security**
   - [ ] Environment variables are not exposed
   - [ ] Admin validation works correctly
   - [ ] Non-admin users cannot access protected routes
   - [ ] RLS policies are enforced

### 🔍 Testing Commands
```bash
# Test build locally
npm run build
npm run preview

# Check build size
du -sh dist/

# Test environment variables
npm run build --mode production
```

## Troubleshooting

### Common Issues

#### SPA Routing Not Working
**Problem**: Direct links to routes return 404
**Solution**: Configure SPA routing on hosting platform

#### Environment Variables Missing
**Problem**: Application crashes on load
**Solution**: Check `.env.production` file exists and contains required variables

#### Supabase Connection Failed
**Problem**: Cannot connect to Supabase
**Solution**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

#### Admin Access Not Working
**Problem**: Admin login fails or routes not protected
**Solution**: Check admins table exists and contains admin users

### Debug Mode
```bash
# Build with sourcemaps for debugging
npm run build -- --sourcemap

# Preview production build locally
npm run preview
```

## Performance Optimization

### Build Optimization
- Code splitting for vendor libraries
- Lazy loading for route components
- Image optimization
- CSS minification

### CDN Configuration
- Serve static assets from CDN
- Enable gzip compression
- Set appropriate cache headers

## Monitoring

### Analytics
- Track page views and user interactions
- Monitor authentication success rates
- Track file upload/download metrics

### Error Tracking
- Monitor JavaScript errors
- Track authentication failures
- Log API connection issues

## Security Considerations

### Frontend Security
- Environment variables are client-side (use only public keys)
- Validate all user inputs
- Implement proper error handling

### Backend Security
- Supabase RLS policies enforce data security
- Admin validation happens at database level
- File access controlled by storage policies

## Maintenance

### Regular Tasks
- Update dependencies
- Rotate Supabase keys
- Monitor performance metrics
- Update admin users as needed

### Backup Strategy
- Backup Supabase database regularly
- Version control application code
- Document configuration changes

This deployment guide ensures your PETIKEMAS PP frontend is properly configured for production hosting with proper SPA routing, security, and access control.
