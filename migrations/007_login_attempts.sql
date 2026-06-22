-- Migration: Add durable login attempt tracking for dashboard auth
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS login_attempts (
  client_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_reset_at ON login_attempts(reset_at);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
