-- Migration: Add projects table and relax project_tag constraints
-- Run in Supabase SQL Editor

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 2. Seed initial projects
INSERT INTO projects (name, slug) VALUES
  ('Herzen Co.', 'herzen-co'),
  ('Xelerate', 'xelerate'),
  ('Xyren', 'xyren'),
  ('Skydeo', 'skydeo'),
  ('ProntoBooks', 'prontobooks'),
  ('Xcaret', 'xcaret'),
  ('Family Office', 'family-office'),
  ('Brain', 'brain')
ON CONFLICT (slug) DO NOTHING;

-- 3. Drop the hardcoded CHECK constraints on project_tag columns
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_tag_check;
ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_project_tag_check;
