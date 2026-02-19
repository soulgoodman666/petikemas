import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase ENV tidak ditemukan')
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,        // 🔥 PENTING
      autoRefreshToken: true,      // 🔥 PENTING
      detectSessionInUrl: true,    // 🔥 PENTING (login redirect)
      storage: window.localStorage // 🔥 AGAR TIDAK LOGOUT SAAT REFRESH
    }
  }
)
