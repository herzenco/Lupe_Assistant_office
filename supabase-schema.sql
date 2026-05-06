-- Lupe Command Center — Database Schema
-- Run this in Supabase SQL Editor (project lkrmyeravhuymdvrkdsa)

-- Heartbeats: Lupe pushes every 30s
CREATE TABLE heartbeats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('active', 'idle', 'error')),
  session_type text CHECK (session_type IN ('main', 'sub-agent', 'idle')),
  model text,
  task text,
  action_type text,
  detail text,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0
);

CREATE INDEX idx_heartbeats_timestamp ON heartbeats(timestamp DESC);

-- Cost entries: per-session cost tracking
CREATE TABLE cost_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text,
  model text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_entries_created ON cost_entries(created_at DESC);
CREATE INDEX idx_cost_entries_model ON cost_entries(model);

-- Sessions: chat/task session transcripts
CREATE TABLE sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  channel text CHECK (channel IN ('telegram', 'tui', 'api', 'other')),
  model text,
  summary text,
  transcript jsonb DEFAULT '[]'::jsonb,
  token_count integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);

-- Tasks: kanban task board
CREATE TABLE tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  project_tag text CHECK (project_tag IN ('Xelerate', 'Xyren', 'ProntoBooks', 'Herzen Co.', 'Skydeo', 'Family Office', 'Xcaret')),
  due_date date,
  complexity text DEFAULT 'medium' CHECK (complexity IN ('light', 'medium', 'heavy')),
  status text NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'in_progress', 'blocked', 'review', 'complete')),
  notes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project_tag);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- System health: machine metrics
CREATE TABLE system_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  cpu_pct numeric(5,2),
  ram_pct numeric(5,2),
  disk_pct numeric(5,2),
  gateway_status text DEFAULT 'unknown' CHECK (gateway_status IN ('up', 'down', 'unknown')),
  drive_status text DEFAULT 'unknown' CHECK (drive_status IN ('up', 'down', 'unknown')),
  integrations jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_system_health_timestamp ON system_health(timestamp DESC);

-- Actions: discrete business actions Lupe takes
CREATE TABLE actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL CHECK (action_type IN (
    'lead_found', 'email_sent', 'email_drafted', 'call_scheduled',
    'document_created', 'document_updated', 'task_completed',
    'research_completed', 'outreach_sent', 'file_moved',
    'error_logged', 'other'
  )),
  summary text NOT NULL,
  project_tag text CHECK (project_tag IN ('Xelerate', 'Xyren', 'ProntoBooks', 'Herzen Co.', 'Skydeo', 'Family Office', 'Xcaret')),
  session_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_timestamp ON actions(timestamp DESC);
CREATE INDEX idx_actions_type ON actions(action_type);
CREATE INDEX idx_actions_project ON actions(project_tag);

-- CodexBar costs: AI spend from local JSONL logs
CREATE TABLE codexbar_costs (
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

-- Projects: dynamic project registry
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Seed initial projects
INSERT INTO projects (name, slug) VALUES
  ('Herzen Co.', 'herzen-co'),
  ('Xelerate', 'xelerate'),
  ('Xyren', 'xyren'),
  ('Skydeo', 'skydeo'),
  ('ProntoBooks', 'prontobooks'),
  ('Xcaret', 'xcaret'),
  ('Family Office', 'family-office'),
  ('Brain', 'brain');

-- Timer sessions: project time tracking (supports multiple parallel timers)
CREATE TABLE timer_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  duration_seconds integer,
  user_id text
);

CREATE INDEX idx_timer_sessions_started ON timer_sessions(started_at DESC);
CREATE UNIQUE INDEX idx_timer_sessions_active_project
  ON timer_sessions(project)
  WHERE stopped_at IS NULL;

ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;

-- Cron runs: job execution logs
CREATE TABLE cron_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id text NOT NULL,
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'error', 'timeout')),
  error text,
  duration_ms integer,
  delivered boolean DEFAULT false,
  ran_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_runs_ran_at ON cron_runs(ran_at DESC);
CREATE INDEX idx_cron_runs_status ON cron_runs(status);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- RLS enabled but no policies — service role key bypasses RLS
ALTER TABLE heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
