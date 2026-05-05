-- Migration: Add codexbar_costs table for CodexBar cost tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS codexbar_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_at timestamptz NOT NULL DEFAULT now(),
  month text NOT NULL,
  provider text NOT NULL,
  cost_usd numeric NOT NULL,
  tokens_total integer,
  payload jsonb
);

CREATE INDEX idx_codexbar_costs_month ON codexbar_costs(month);
CREATE INDEX idx_codexbar_costs_reported ON codexbar_costs(reported_at DESC);

ALTER TABLE codexbar_costs ENABLE ROW LEVEL SECURITY;
