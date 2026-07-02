# Lupe Command Center Handoff

## What Changed

The dashboard now tracks work reports instead of time spent per project.

The dashboard also includes a Content Asset Bridge for Lupe's content approval and Instagram publishing workflow. It registers image assets from an approved shared Lupe folder, creates temporary tokenized public URLs for selected assets, and revokes/expires those public exposures without deleting the source files.

The main dashboard shows five visible daily report streams:

- `lupe_tasks` - what Lupe worked on throughout the day
- `document_dump` - new files added to Document Dump and how Lupe categorized them
- `codex` - what Herzen worked on with Codex
- `investments` - what Lupe found in the Investment folder
- `claude` - what Herzen worked on with Claude

The API still accepts `lupe_folder` for compatibility, but Lupe Folder is no longer shown as a visible Work Reports section on the dashboard.

The login flow now uses a PIN. Configure `LOGIN_PIN` in local and deployment environments. `LOGIN_PASSWORD` still works as a temporary fallback, but should be removed after deployment is confirmed.

## Dashboard Setup

Run these Supabase migrations before deploying the new dashboard:

1. `migrations/007_login_attempts.sql`
2. `migrations/008_work_reports.sql`
3. `migrations/009_investment_work_reports.sql`
4. `migrations/010_content_asset_bridge.sql`

The migrations add:

- `login_attempts` for durable dashboard login rate limiting
- `work_reports` for Lupe/Codex/Claude/investment/file-intake activity reports
- `content_assets` and `content_asset_exposures` for local asset registration, temporary public media URLs, and exposure audit cleanup

Required dashboard environment variables:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
LOGIN_PIN=...
DASHBOARD_API_KEY=...
MONTHLY_BUDGET_USD=150
LUPE_HEALTH_MACHINE_ID=lupe-main-machine
CONTENT_ASSET_BASE_DIRS=/path/to/shared/lupe/folder
CONTENT_ASSET_PUBLIC_BASE_URL=https://public-dashboard-or-tunnel.example
```

`CONTENT_ASSET_PUBLIC_BASE_URL` must be reachable by Instagram and must point at a dashboard instance that can read the paths under `CONTENT_ASSET_BASE_DIRS`.

## Content Asset Bridge API

Lupe scripts should register source files that already exist in the shared folder:

```http
POST /api/content-assets
Authorization: Bearer $DASHBOARD_API_KEY
Content-Type: application/json
```

```json
{
  "path": "/path/to/shared/lupe/folder/Content/post.jpg",
  "tags": ["instagram"],
  "metadata": {
    "campaign": "xyren"
  }
}
```

The response returns `{ "ok": true, "asset": { ... } }`. Use `asset.id` to expose the asset:

```http
POST /api/content-assets/:id/expose
Authorization: Bearer $DASHBOARD_API_KEY
Content-Type: application/json
```

```json
{
  "ttl_seconds": 3600,
  "note": "Instagram publish window",
  "content_task_id": "approval-123"
}
```

The response returns `exposure.public_url`. That URL uses `/public/content-assets/:token`, is unauthenticated, and works only while the exposure is active and unexpired.

After Instagram publish succeeds, Lupe should immediately revoke the exposure:

```http
POST /api/content-assets/:id/revoke
Authorization: Bearer $DASHBOARD_API_KEY
```

Run cleanup from a scheduled job or ad hoc script:

```http
POST /api/content-assets/cleanup
Authorization: Bearer $DASHBOARD_API_KEY
```

Inspection/debugging UI is available at `/content-assets`.

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

Batch payloads are also accepted by sending an array of report objects. The dashboard now works best when reports include item-level details in `details`.

Valid `source` values:

- `lupe_tasks`
- `lupe_folder`
- `document_dump`
- `codex`
- `investments`
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
  "tasks": [
    {
      "title": "Review Document Dump intake",
      "project": "Lupe Office",
      "status": "complete",
      "summary": "Reviewed incoming files and flagged invoices for categorization."
    }
  ],
  "completed": ["Updated dashboard report watcher"],
  "blocked": [],
  "projects": ["Xyren", "Herzen Co."],
  "count": 4
}
```

### 2. Document Dump Categorization Report

Watch the Document Dump folder and report both new files and Lupe's categorization decisions.

Source: `document_dump`

Recommended details:

```json
{
  "files": [
    {
      "name": "invoice.pdf",
      "path": "/path/to/Document Dump/invoice.pdf",
      "category": "finance",
      "destination": "Finance/Invoices",
      "summary": "Invoice from vendor. Lupe moved it into Finance/Invoices."
    }
  ],
  "categories": ["finance"],
  "added": 1
}
```

### 3. Codex Work Report

Watch/read the Codex activity file on Desktop/Lupe and summarize what Herzen worked on with Codex.

Source: `codex`

Recommended details:

```json
{
  "sessions": [
    {
      "title": "Dashboard Work Reports UI",
      "repo": "Lupe_Assistant_office",
      "summary": "Updated dashboard sections and report rendering."
    }
  ],
  "files_changed": ["src/app/page.tsx"],
  "count": 1
}
```

### 4. Claude Work Report

Watch/read the Claude activity file on Desktop/Lupe and summarize what Herzen worked on with Claude.

Source: `claude`

Recommended details:

```json
{
  "sessions": [
    {
      "title": "Research and writing support",
      "project": "Xyren",
      "summary": "Prepared draft outline and summarized supporting notes."
    }
  ],
  "projects": ["Xyren"],
  "outputs": ["Draft outline"],
  "count": 1
}
```

### 5. Investment Folder Report

Watch/read the Investment folder and report new or changed files, latest trades, and current positions. This should report folder contents only; do not include account passwords, brokerage login details, full account numbers, or other secrets.

Source: `investments`

The dashboard Investments panel reads directly from `details.trades` and `details.positions`. Do not send a connectivity-only or auth-check report as the final dashboard report. Every scheduled investment run should include:

- `details.positions` as an array of current open positions
- `details.trades` as an array of new executed trades since the prior Desktop report
- If there are no new trades, include the latest visible same-day executed trades/fills and set `new_trade_count` to `0`
- `details.open_orders` and `details.stops` when broker stops or open orders are visible
- `details.account` with cash, buying power, equity/portfolio value, and capture time when available
- `details.report_path` pointing to the canonical Desktop Markdown report

For local testing, set `LUPE_DASHBOARD_URL=http://localhost:3000` so Codex automations post to the dashboard being viewed locally. For production, set `LUPE_DASHBOARD_URL` to the deployed dashboard URL. In both cases, `DASHBOARD_API_KEY` must match the dashboard environment.

Recommended details:

```json
{
  "files": [
    {
      "name": "brokerage-statement.pdf",
      "path": "/path/to/Investment/brokerage-statement.pdf",
      "type": "pdf",
      "category": "statement",
      "summary": "Monthly brokerage statement",
      "sensitive": true
    }
  ],
  "categories": ["statement"],
  "trades": [
    {
      "ticker": "AAPL",
      "side": "buy",
      "quantity": 5,
      "price": 210.25,
      "timestamp": "2026-06-23T14:30:00.000Z",
      "note": "Opened starter position from brokerage activity file."
    }
  ],
  "positions": [
    {
      "ticker": "AAPL",
      "shares": 5,
      "average_cost": 210.25,
      "market_value": 1051.25,
      "unrealized_pnl": 0,
      "status": "Open starter position"
    }
  ],
  "open_orders": [
    {
      "ticker": "AAPL",
      "side": "sell",
      "type": "stop-market",
      "quantity": 5,
      "stop_price": 199.5,
      "state": "confirmed",
      "time_in_force": "gtc",
      "created_at": "2026-06-23T14:35:00.000Z"
    }
  ],
  "account": {
    "cash": 500,
    "buying_power": 500,
    "portfolio_value": 1551.25,
    "captured_at": "2026-06-23T14:35:00.000Z"
  },
  "report_path": "/Users/herzen/Desktop/Lupe/Codex Work/Investment/investment_2026-06-23.md",
  "source_agent": "codex",
  "added": 1,
  "changed": 0,
  "new_trade_count": 1
}
```

## Verification

After deployment:

1. Log in with `LOGIN_PIN`.
2. Send a test report to `/api/reports`.
3. Confirm the dashboard shows the report under "Today's Work Reports."
4. Confirm `/api/reports?days=1&limit=50` returns the report.
5. Confirm Lupe's queued dashboard events still flush with `client/flush_queue.py`.

## Handoff Maintenance

This repo now includes a local skill for keeping this document current:

```text
skills/update-lupe-dashboard-handoff/SKILL.md
```

Before every push, use that skill to decide whether this handoff needs an update. Update this document whenever changes affect dashboard behavior, Lupe jobs, API contracts, Supabase migrations/schema, environment variable names, client helpers, deployment steps, or verification steps.

Do not write secret values, tokens, service-role keys, PINs, or passwords into this handoff.

## Notes

The old timer API still exists for now, but the dashboard no longer displays project time tracking. Future cleanup can remove timer UI/routes/schema after confirming no active workflow still depends on them.
