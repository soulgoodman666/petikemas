-- Struktur Database Baru untuk Role-Based Access Control
-- Menggunakan user_id sebagai foreign key, bukan email

-- 1. Tabel users (extended dari auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' atau 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel letters (surat)
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Foreign key ke users
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- User tujuan (opsional)
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel letter_permissions (untuk akses kontrol)
CREATE TABLE IF NOT EXISTS public.letter_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL, -- 'view', 'download', 'edit', 'delete'
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Siapa yang memberi akses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(letter_id, user_id, permission_type)
);

-- Indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_letters_owner_id ON public.letters(owner_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON public.letters(status);
CREATE INDEX IF NOT EXISTS idx_letter_permissions ON public.letter_permissions(letter_id, user_id);

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_letters_updated_at
  BEFORE UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
