ALTER TABLE system_health
  ADD COLUMN IF NOT EXISTS machine_id text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS hostname text;

CREATE INDEX IF NOT EXISTS idx_system_health_machine_timestamp
  ON system_health(machine_id, timestamp DESC);
