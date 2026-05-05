-- Migration: Add project_files table for tracking files per project
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project text NOT NULL,
  filename text NOT NULL,
  file_type text,
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_files_project ON project_files(project);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
