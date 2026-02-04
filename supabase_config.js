// Supabase Configuration
// Safe for production - NEVER throws errors at module scope

// Core Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || null

// Optional backend configuration
export const API_URL = import.meta.env.VITE_API_URL || null

// Environment detection
export const ENV = import.meta.env.VITE_ENV || 'development'
export const IS_DEVELOPMENT = import.meta.env.DEV
export const IS_PRODUCTION = import.meta.env.PROD

// Safe initialization flags
export const IS_SUPABASE_READY = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
export const IS_API_READY = !!API_URL

// Configuration object for easy consumption
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isReady: IS_SUPABASE_READY,
  env: ENV
}

// Development warnings (only in development mode)
if (IS_DEVELOPMENT) {
  if (!IS_SUPABASE_READY) {
    console.warn('⚠️ Supabase Configuration:')
    console.warn('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.warn('   VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
    console.warn('')
    console.warn('📝 To fix: Create .env file with:')
    console.warn('   VITE_SUPABASE_URL=https://your-project.supabase.co')
    console.warn('   VITE_SUPABASE_ANON_KEY=your-anon-key')
  }
  
  if (!API_URL) {
    console.warn('⚠️ API_URL not configured (optional)')
  }
}

// Export default for convenience
export default SUPABASE_CONFIG
