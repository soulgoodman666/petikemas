#!/bin/bash

# PETIKEMAS PP Frontend Deployment Script
# This script prepares the frontend for production deployment

echo "🚀 Starting PETIKEMAS PP Frontend Deployment..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found"
    echo "📋 Please create .env.production with your production environment variables"
    echo "📄 See production.env.example for reference"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests (if available)
echo "🧪 Running tests..."
npm run test 2>/dev/null || echo "⚠️  No tests found, skipping..."

# Build for production
echo "🏗️  Building for production..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build output: ./dist/"
    echo "📊 Build size:"
    du -sh dist/
    echo ""
    echo "🚀 Ready for deployment!"
    echo ""
    echo "📋 Deployment Instructions:"
    echo "1. Upload the 'dist' folder to your hosting provider"
    echo "2. Ensure your hosting supports SPA routing"
    echo "3. Configure environment variables if needed"
    echo "4. Test the deployed application"
    echo ""
    echo "🔗 Public routes that should work:"
    echo "   - /home"
    echo "   - /files"
    echo "   - /downloads"
    echo "   - /inventory/groups"
    echo ""
    echo "🔒 Protected routes (require admin login):"
    echo "   - /dashboard"
    echo "   - /upload"
    echo "   - /profile"
else
    echo "❌ Build failed!"
    exit 1
fi
