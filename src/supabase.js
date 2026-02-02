import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase_config';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);