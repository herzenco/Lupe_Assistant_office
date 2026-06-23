<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:lupe-dashboard-handoff-rules -->
# Keep Lupe's Dashboard Handoff Current

Before every push in this repo, use the repo-local skill at `skills/update-lupe-dashboard-handoff/SKILL.md`.

Update `LUPE_DASHBOARD_HANDOFF.md` whenever changes affect dashboard behavior, Lupe jobs, API contracts, Supabase migrations/schema, environment variable names, client helpers, deployment steps, or verification steps. Do not write secret values into the handoff.
<!-- END:lupe-dashboard-handoff-rules -->
