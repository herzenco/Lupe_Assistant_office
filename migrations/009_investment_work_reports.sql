-- Migration: Allow Lupe to report Investment folder activity
-- Run in Supabase SQL Editor after 008_work_reports.sql

ALTER TABLE work_reports
  DROP CONSTRAINT IF EXISTS work_reports_source_check;

ALTER TABLE work_reports
  ADD CONSTRAINT work_reports_source_check
  CHECK (source IN ('lupe_tasks', 'lupe_folder', 'document_dump', 'codex', 'investments', 'claude'));
