# PETIKEMAS PP Frontend Deployment Guide

## Overview
This guide covers deploying the PETIKEMAS PP React + Vite frontend to production hosting.

## Prerequisites

### Environment Setup
- Node.js 18+ installed
- Supabase project configured
- Admin users created in Supabase

### Required Files
- `.env.production` - Production environment variables
- `dist/` folder - Built application

## Build Process

### 1. Environment Configuration
```bash
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
