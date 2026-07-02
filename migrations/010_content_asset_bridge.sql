-- Migration: Content Asset Bridge registry and exposure audit trail
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS content_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  absolute_path text NOT NULL UNIQUE,
  relative_path text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  sha256 text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_assets_relative_path
  ON content_assets(relative_path);

CREATE INDEX IF NOT EXISTS idx_content_assets_created
  ON content_assets(created_at DESC);

CREATE OR REPLACE FUNCTION update_content_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_assets_updated_at ON content_assets;
CREATE TRIGGER content_assets_updated_at
  BEFORE UPDATE ON content_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_content_assets_updated_at();

CREATE TABLE IF NOT EXISTS content_asset_exposures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  public_url text NOT NULL,
  exposed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  cleaned_up_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  note text,
  content_task_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_asset_exposures_asset
  ON content_asset_exposures(asset_id, exposed_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_asset_exposures_token
  ON content_asset_exposures(token);

CREATE INDEX IF NOT EXISTS idx_content_asset_exposures_cleanup
  ON content_asset_exposures(status, expires_at)
  WHERE cleaned_up_at IS NULL;

ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_asset_exposures ENABLE ROW LEVEL SECURITY;
