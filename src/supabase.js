import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_READY } from '../supabase_config'

// Safe Supabase initialization
export const supabase = IS_SUPABASE_READY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    })
  : null

// Log warning if Supabase is not ready (only in development)
if (!IS_SUPABASE_READY && import.meta.env.DEV) {
  console.warn('⚠️ Supabase not initialized: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}
