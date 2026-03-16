-- Migration 057 — owner_id em channel_connections
-- Permite identificar qual usuário (seller/admin) é dono de cada instância

ALTER TABLE channel_connections
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channel_connections_owner
  ON channel_connections(owner_id);
