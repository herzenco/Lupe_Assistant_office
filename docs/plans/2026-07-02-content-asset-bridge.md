# Content Asset Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Content Asset Bridge module that registers local Lupe-folder media, exposes selected assets at temporary public token URLs, and revokes/cleans those exposures without touching source files.

**Architecture:** Keep the dashboard as the bridge. Store registry and exposure audit rows in Supabase, read media from the dashboard server filesystem only after validating paths against configured base directories, and serve public media only through unguessable active tokens.

**Tech Stack:** Next.js App Router route handlers, Supabase service-role queries, Node filesystem/crypto helpers, React dashboard UI, Node test runner.

---

### Task 1: Core Bridge Helpers

**Files:**
- Create: `tests/contentAssets.test.ts`
- Create: `src/lib/contentAssets.ts`

**Step 1: Write failing tests**

Cover allowed-base path validation, directory traversal rejection, supported image MIME detection, metadata hashing, public URL construction, token shape, and expiry status.

**Step 2: Run test to verify it fails**

Run: `node --test tests/contentAssets.test.ts`

Expected: FAIL because `src/lib/contentAssets.ts` does not exist yet.

**Step 3: Write minimal implementation**

Implement reusable helpers without database coupling.

**Step 4: Run test to verify it passes**

Run: `node --test tests/contentAssets.test.ts`

Expected: PASS.

### Task 2: Schema

**Files:**
- Create: `migrations/010_content_asset_bridge.sql`
- Modify: `supabase-schema.sql`
- Modify: `src/lib/types.ts`

**Step 1: Add tables**

Create `content_assets` and `content_asset_exposures` with indexes, uniqueness on source path, and audit fields.

**Step 2: Add TypeScript types**

Expose asset/exposure row types for UI and API responses.

### Task 3: API Routes

**Files:**
- Create: `src/app/api/content-assets/route.ts`
- Create: `src/app/api/content-assets/[id]/route.ts`
- Create: `src/app/api/content-assets/[id]/expose/route.ts`
- Create: `src/app/api/content-assets/[id]/revoke/route.ts`
- Create: `src/app/api/content-assets/cleanup/route.ts`

**Step 1: Registration/listing**

Validate local paths, capture file metadata, and upsert registry rows.

**Step 2: Exposure**

Create tokenized exposure rows with TTL/expiration and return a public URL.

**Step 3: Revoke and cleanup**

Mark exposure rows revoked/expired and set `cleaned_up_at`; never delete source files.

### Task 4: Public Serving

**Files:**
- Create: `src/app/public/content-assets/[token]/route.ts`
- Modify: `src/proxy.ts`

**Step 1: Public auth exception**

Allow only `/public/content-assets/...` through the proxy.

**Step 2: Token route**

Look up active exposure token, reject expired/revoked rows, validate source path again, and stream the file with the recorded MIME type.

### Task 5: Dashboard UI

**Files:**
- Create: `src/app/content-assets/page.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/MobileNav.tsx`

**Step 1: List and inspect**

Show registered assets, metadata, exposure state, public URL, expiration, and audit status.

**Step 2: Manual revoke**

Add a client-side revoke button that calls the protected route and refreshes the list.

### Task 6: Docs and Handoff

**Files:**
- Modify: `.env.example`
- Modify: `lupe.env.example`
- Modify: `README.md`
- Modify: `LUPE_DASHBOARD_HANDOFF.md`

**Step 1: Document setup**

Explain base directory config, public URL config, and local filesystem caveat.

**Step 2: Add curl examples**

Include register, expose, revoke, cleanup, and list examples for Lupe scripts.

### Task 7: Verification

**Files:**
- No new files.

**Step 1: Run focused tests**

Run: `node --test tests/contentAssets.test.ts`

**Step 2: Run full verification**

Run: `npm test`

Run: `npm run build`

Expected: all commands exit successfully.
