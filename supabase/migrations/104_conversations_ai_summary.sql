-- Migration 104: Add AI summary columns to conversations
-- Used by WF-10 to persist the AI-generated conversation summary

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_summary     TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_at  TIMESTAMPTZ;
