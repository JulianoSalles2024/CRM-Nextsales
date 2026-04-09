-- Migration 120: adiciona billing_phone em companies
-- Popula automaticamente com o telefone do admin de cada empresa

ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_phone text;

UPDATE companies c
SET billing_phone = p.phone
FROM profiles p
WHERE p.company_id = c.id
  AND p.role = 'admin'
  AND p.phone IS NOT NULL
  AND c.billing_phone IS NULL;
