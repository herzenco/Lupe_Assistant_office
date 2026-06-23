---
name: update-lupe-dashboard-handoff
description: Use before every push in the Lupe Office repo, and whenever dashboard setup, Lupe jobs, API contracts, migrations, deployment notes, environment variables, client helpers, or reporting behavior changes. Keeps LUPE_DASHBOARD_HANDOFF.md current so Lupe has the latest operational instructions.
---

# Update Lupe Dashboard Handoff

Use this skill before every push from this repo. The goal is to keep `LUPE_DASHBOARD_HANDOFF.md` accurate enough that Lupe can run the dashboard jobs without needing conversation history.

## Workflow

1. Read `LUPE_DASHBOARD_HANDOFF.md`.
2. Review the pending changes using git diff/status.
3. Check whether any change affects Lupe's setup or operation:
   - dashboard-visible behavior
   - `/api/*` request or response contracts
   - valid report sources or payload shapes
   - Supabase migrations, schema, RLS, indexes, or table names
   - environment variable names or requirements
   - Python client helpers or queue/retry behavior
   - Lupe scheduled jobs, file watchers, or local automation instructions
   - deployment, verification, rollback, or troubleshooting steps
4. If any item above changed, update `LUPE_DASHBOARD_HANDOFF.md` before pushing.
5. If nothing handoff-relevant changed, leave the file untouched.

## Handoff Update Rules

- Write for Lupe and Herzen, not for a developer already inside the diff.
- Include exact file names, endpoint paths, migration names, source values, and env var names.
- Do not include secret values, tokens, service-role keys, PINs, passwords, or private URLs beyond non-secret project identifiers already documented in the repo.
- Keep the document operational and concise: what changed, what Lupe needs to do, how to verify it works.
- Preserve existing useful sections instead of replacing the whole document.
- Remove or mark outdated instructions when behavior changes.

## Before Push Checklist

- `LUPE_DASHBOARD_HANDOFF.md` reflects the current branch behavior.
- Required migrations are listed in the order they should run.
- Required environment variables are listed by name only.
- Lupe job instructions match the valid API payloads.
- Verification steps match the current dashboard and API.
- Relevant checks for the change were run or the reason for skipping them is clear.
