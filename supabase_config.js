// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || null

// Backend Configuration (OPTIONAL)
export const API_URL = import.meta.env.VITE_API_URL || null

// Environment
export const ENV = import.meta.env.VITE_ENV || 'development'

// Safe flags
export const IS_SUPABASE_READY = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
export const IS_API_READY = !!API_URL
