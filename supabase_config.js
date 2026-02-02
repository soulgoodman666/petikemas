// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Backend Configuration  
export const API_URL = import.meta.env.VITE_API_URL

// Environment
export const ENV = import.meta.env.VITE_ENV || 'development'

// Validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables')
}

if (!API_URL) {
  throw new Error('Missing required API_URL environment variable')
}
