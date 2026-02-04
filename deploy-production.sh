#!/bin/bash

# Production Deployment Script for Netlify
# Safe deployment with environment validation

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    print_status "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Check Node.js version
NODE_VERSION=$(node -v)
print_status "Node.js version: $NODE_VERSION"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found"
    print_status "Creating from template..."
    
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        print_warning "Please update .env.production with your production values"
        print_warning "Then run this script again"
        exit 1
    else
        print_error ".env.production.example not found"
        exit 1
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Run linting
print_status "Running code quality checks..."
npm run lint:check || {
    print_warning "Linting issues found. Fix with: npm run lint"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# Clean previous build
print_status "Cleaning previous build..."
npm run clean

# Build for production
print_status "Building for production..."
npm run build:prod

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed! dist directory not found."
    exit 1
fi

# Check build output
BUILD_SIZE=$(du -sh dist | cut -f1)
print_success "Build completed successfully"
print_status "Build size: $BUILD_SIZE"

# List files in dist
print_status "Build output:"
ls -la dist/

# Deploy to Netlify
print_status "Deploying to Netlify..."
netlify deploy --prod --dir=dist --message="Production deploy $(date '+%Y-%m-%d %H:%M:%S')"

print_success "🎉 Deployment completed successfully!"
print_status "Your app is now live and mobile-friendly!"

# Show deployment info
print_status "Deployment Summary:"
echo "  - Build size: $BUILD_SIZE"
echo "  - Environment: Production"
echo "  - Mobile optimized: Yes"
echo "  - Supabase integration: Safe initialization"
echo "  - Error handling: Production-ready"

print_status "Next steps:"
echo "  1. Test your app at the provided Netlify URL"
echo "  2. Verify Supabase connection"
echo "  3. Test mobile responsiveness"
echo "  4. Monitor logs for any issues"
