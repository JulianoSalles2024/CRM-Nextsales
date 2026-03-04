-- Adiciona coluna is_active em profiles (idempotente)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Check: deve retornar 1 linha com data_type = boolean e column_default = true
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
  AND column_name  = 'is_active';
