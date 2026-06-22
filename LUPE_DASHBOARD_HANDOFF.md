# Lupe Command Center Handoff

## What Changed

The dashboard now tracks work reports instead of time spent per project.

The main dashboard shows five daily report streams:

- `lupe_tasks` - what Lupe worked on throughout the day
- `lupe_folder` - new files added to the Lupe Folder
- `document_dump` - new files added to Document Dump and how Lupe categorized them
- `codex` - what Herzen worked on with Codex
- `claude` - what Herzen worked on with Claude

The login flow now uses a PIN. Configure `LOGIN_PIN` in local and deployment environments. `LOGIN_PASSWORD` still works as a temporary fallback, but should be removed after deployment is confirmed.

## Dashboard Setup

Run these Supabase migrations before deploying the new dashboard:

1. `migrations/007_login_attempts.sql`
2. `migrations/008_work_reports.sql`

The migrations add:

- `login_attempts` for durable dashboard login rate limiting
- `work_reports` for Lupe/Codex/Claude/file-intake activity reports

Required dashboard environment variables:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
LOGIN_PIN=...
DASHBOARD_API_KEY=...
MONTHLY_BUDGET_USD=150
LUPE_HEALTH_MACHINE_ID=lupe-main-machine
```

## Report API

Lupe and other local jobs should send reports to:

```http
POST /api/reports
Authorization: Bearer $DASHBOARD_API_KEY
Content-Type: application/json
```

Single report payload:

```json
{
  "source": "lupe_tasks",
  "title": "Hourly Lupe task summary",
  "summary": "Reviewed inbox, drafted Xyren content notes, and updated task statuses.",
  "details": {
    "tasks": [
      "Reviewed inbox",
      "Drafted Xyren content notes",
      "Updated task statuses"
    ],
    "count": 3
  },
  "occurred_at": "2026-06-22T15:00:00.000Z"
}
```

Batch payloads are also accepted by sending an array of report objects.

Valid `source` values:

- `lupe_tasks`
- `lupe_folder`
- `document_dump`
- `codex`
- `claude`

## Lupe Client Helper

The Python client now includes:

```python
log_work_report(
    source="lupe_tasks",
    title="Hourly Lupe task summary",
    summary="What changed in plain English.",
    details={"tasks": ["Task A", "Task B"], "count": 2},
)
```

The helper posts to `/api/reports` and uses the same queue/retry behavior as other dashboard events.

## Jobs Lupe Should Add

### 1. Hourly Lupe Task Report

Run once per hour during active working hours.

Source: `lupe_tasks`

Recommended details:

```json
{
  "tasks": ["..."],
  "completed": ["..."],
  "blocked": ["..."],
  "projects": ["Xyren", "Herzen Co."],
  "count": 4
}
```

### 2. Lupe Folder New File Report

Watch the Lupe Folder and report new files.

Source: `lupe_folder`

Recommended details:

```json
{
  "files": [
    {
      "name": "example.pdf",
      "path": "/path/to/example.pdf",
      "type": "pdf"
    }
  ],
  "added": 1
}
```

### 3. Document Dump Categorization Report

Watch the Document Dump folder and report both new files and Lupe's categorization decisions.

Source: `document_dump`

Recommended details:

```json
{
  "files": [
    {
      "name": "invoice.pdf",
      "category": "finance",
      "destination": "Finance/Invoices",
      "reason": "Invoice from vendor"
    }
  ],
  "categories": ["finance"],
  "added": 1
}
```

### 4. Codex Work Report

Watch/read the Codex activity file on Desktop/Lupe and summarize what Herzen worked on with Codex.

Source: `codex`

Recommended details:

```json
{
  "sessions": ["Lupe dashboard auth update"],
  "repos": ["Lupe_Assistant_office"],
  "files_changed": ["src/app/page.tsx"],
  "count": 1
}
```

### 5. Claude Work Report

Watch/read the Claude activity file on Desktop/Lupe and summarize what Herzen worked on with Claude.

Source: `claude`

Recommended details:

```json
{
  "sessions": ["Research and writing support"],
  "projects": ["Xyren"],
  "outputs": ["Draft outline"],
  "count": 1
}
```

## Verification

After deployment:

1. Log in with `LOGIN_PIN`.
2. Send a test report to `/api/reports`.
3. Confirm the dashboard shows the report under "Today's Work Reports."
4. Confirm `/api/reports?days=1&limit=50` returns the report.
5. Confirm Lupe's queued dashboard events still flush with `client/flush_queue.py`.

## Notes

The old timer API still exists for now, but the dashboard no longer displays project time tracking. Future cleanup can remove timer UI/routes/schema after confirming no active workflow still depends on them.
