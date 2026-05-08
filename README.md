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
