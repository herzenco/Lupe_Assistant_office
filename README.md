This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lupe Machine Health

The dashboard displays the latest health report posted by Lupe's configured machine. On that machine, set:

```bash
LUPE_DASHBOARD_URL=https://your-dashboard.vercel.app
LUPE_DASHBOARD_KEY=match-your-dashboard-api-key
LUPE_MACHINE_ID=lupe-main-machine
LUPE_AGENT_NAME=Lupe
LUPE_GOOGLE_DRIVE_PATH=/Users/lupe/Library/CloudStorage/GoogleDrive-lupe@herzenco.co
```

Set `LUPE_HEALTH_MACHINE_ID=lupe-main-machine` in the dashboard deployment so `/health` prefers that machine's reports when other machines also send heartbeats.

## Launching Lupe

On Lupe's OpenClaw machine:

```bash
cp lupe.env.example lupe.env
```

Fill in `LUPE_DASHBOARD_KEY` in `lupe.env`, then launch OpenClaw through the dashboard-aware starter:

```bash
./scripts/start-lupe-openclaw.sh
```

That script loads `lupe.env`, verifies the dashboard connection, sends a startup heartbeat, flushes any queued dashboard events, then starts `openclaw`.
It also loads `$HOME/.openclaw/.env.secrets` when present, or the path in `LUPE_SECRETS_FILE` / `OPENCLAW_SECRETS_FILE`.

For Xyren content approvals, set `LUPE_API_TOKEN` in `lupe.env` or the OpenClaw secrets file. Without it, Lupe can still start, but content approval calls to `https://www.xyren.me/api/agent/content` will fail before the API can authenticate them.

By default it starts `openclaw tui`. To launch a different OpenClaw command, either pass it through:

```bash
./scripts/start-lupe-openclaw.sh gateway
```

or set `LUPE_OPENCLAW_COMMAND` in `lupe.env`.

## Content Asset Bridge

The dashboard can register image assets that already live in Lupe's shared folder, expose one asset at a temporary public URL for Instagram publishing, and revoke/expire that public exposure after publish succeeds. Source files stay private on disk and are never deleted by cleanup.

Configure the dashboard instance that can read the shared folder:

```bash
CONTENT_ASSET_BASE_DIRS=/Users/lupe/Library/CloudStorage/GoogleDrive-lupe@herzenco.co
CONTENT_ASSET_PUBLIC_BASE_URL=https://your-dashboard-public-url.example
DASHBOARD_API_KEY=...
```

`CONTENT_ASSET_PUBLIC_BASE_URL` must be reachable by Instagram's servers and must point to the dashboard server that can read `CONTENT_ASSET_BASE_DIRS`. If a deployed dashboard cannot access Lupe's local disk, run the dashboard on Lupe's machine behind a public tunnel or another reachable host with the shared folder mounted.

Run `migrations/010_content_asset_bridge.sql` in Supabase before using the bridge.

Lupe script examples:

```bash
export DASHBOARD_URL="http://localhost:3000"
export DASHBOARD_KEY="paste-dashboard-api-key"
export ASSET_PATH="/Users/lupe/Library/CloudStorage/GoogleDrive-lupe@herzenco.co/Content/post.jpg"

curl -sS -X POST "$DASHBOARD_URL/api/content-assets" \
  -H "Authorization: Bearer $DASHBOARD_KEY" \
  -H "Content-Type: application/json" \
  --data "{\"path\":\"$ASSET_PATH\",\"tags\":[\"instagram\"],\"metadata\":{\"campaign\":\"xyren\"}}"

curl -sS "$DASHBOARD_URL/api/content-assets" \
  -H "Authorization: Bearer $DASHBOARD_KEY"

curl -sS -X POST "$DASHBOARD_URL/api/content-assets/$ASSET_ID/expose" \
  -H "Authorization: Bearer $DASHBOARD_KEY" \
  -H "Content-Type: application/json" \
  --data '{"ttl_seconds":3600,"note":"Instagram publish window","content_task_id":"xyren-approval-123"}'

curl -sS -X POST "$DASHBOARD_URL/api/content-assets/$ASSET_ID/revoke" \
  -H "Authorization: Bearer $DASHBOARD_KEY"

curl -sS -X POST "$DASHBOARD_URL/api/content-assets/cleanup" \
  -H "Authorization: Bearer $DASHBOARD_KEY"
```

The returned exposure includes `public_url`, which is the value to hand to Instagram. The unauthenticated public media route is `/public/content-assets/:token`; all registration, listing, expose, revoke, and cleanup routes remain protected by the dashboard API key or dashboard session.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
