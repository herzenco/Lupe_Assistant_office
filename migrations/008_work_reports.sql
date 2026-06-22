-- Migration: Add work reports for Lupe, file intake, Document Dump, Codex, and Claude activity
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS work_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('lupe_tasks', 'lupe_folder', 'document_dump', 'codex', 'claude')),
  title text NOT NULL,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_reports_source_occurred
  ON work_reports(source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_reports_occurred
  ON work_reports(occurred_at DESC);

ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
