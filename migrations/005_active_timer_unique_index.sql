-- Migration: Prevent duplicate active timers per project
-- Run in Supabase SQL Editor after stopping or merging any duplicate active timers.

CREATE UNIQUE INDEX IF NOT EXISTS idx_timer_sessions_active_project
  ON timer_sessions(project)
  WHERE stopped_at IS NULL;
