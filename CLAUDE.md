# Lupe Command Center

## Overview
Next.js 15 (App Router, TypeScript) dashboard for monitoring and managing Lupe, an AI assistant running on a Mac Mini. Deployed to Vercel.

## Stack
- Next.js 15 + Tailwind CSS (dark theme, zinc-900/950)
- Supabase (project `lkrmyeravhuymdvrkdsa`) — server-only via service role key
- Auth: `jose` HS256 JWT cookie (7-day) + Bearer token for API
- Charts: Recharts | DnD: @hello-pangea/dnd | Icons: lucide-react

## Architecture
- Browser never talks to Supabase directly — all data flows through API routes
- Lupe pushes data via `POST /api/*` with `Authorization: Bearer $DASHBOARD_API_KEY`
- Herzen views dashboard (authenticated via JWT cookie)
- 30s polling on activity feed, 60s on other pages

## Key Files
- `src/middleware.ts` — Edge Middleware (auth gate for all routes)
- `src/lib/supabase.ts` — Admin client (service role)
- `src/lib/auth.ts` — JWT sign/verify
- `src/lib/types.ts` — All TypeScript interfaces
- `src/lib/constants.ts` — Budget, project tags, colors, enums
- `src/hooks/usePolling.ts` — Generic polling hook with visibility-pause
- `src/hooks/useTasks.ts` — Task CRUD with optimistic updates
- `supabase-schema.sql` — Database migration (6 tables)

## API Routes
| Route | Method | Consumer |
|-------|--------|----------|
| `/api/heartbeat` | POST/GET | Lupe pushes, dashboard reads |
| `/api/cost` | POST/GET | Lupe pushes, dashboard reads |
| `/api/session` | POST | Lupe pushes session data |
| `/api/sessions` | GET | Dashboard reads (paginated) |
| `/api/tasks` | GET/POST | Both |
| `/api/tasks/[id]` | PATCH/DELETE | Both |
| `/api/health` | GET | Dashboard reads |
| `/api/actions` | POST/GET | Lupe pushes, dashboard reads |
| `/api/calendar` | GET | Dashboard reads |
| `/api/auth/login` | POST | Dashboard login |
| `/api/auth/me` | GET | Dashboard session check |

## Environment Variables
See `.env.example`. Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `LOGIN_PASSWORD`, `DASHBOARD_API_KEY`.

## Commands
- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
