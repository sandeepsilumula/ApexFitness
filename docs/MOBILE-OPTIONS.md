# Mobile Options for Apex Fitness

Status: **saved for later, not started.** No code changed.

Date captured: 2026-09-25.

## Current Stack (verified)

- Next.js 16.3.6, **Pages Router** (`pages/`, not App Router)
- React 19.3, Tailwind CSS 4.3
- Prisma 7.10 + SQLite via `@prisma/adapter-better-sqlite3` (file-based DB)
- Cookie-session auth (custom `Session` model, no NextAuth)
- Stripe 22.6 for subscriptions, `@anthropic-ai/sdk` 0.128 for the coach
- Playwright 1.63 already installed for e2e
- PWA manifest **already exists** at `public/manifest.webmanifest` (192/512/maskable
  icons, `display: standalone`), linked from `pages/_document.tsx`
- **No service worker registered anywhere.** The manifest is currently inert.
- API routes live under `pages/api/`; frontend calls them through `lib/api-client.ts`

## Can the Same Link Be Used to Test Mobile?

Yes, in two distinct cases with different answers.

### Responsive web + PWA — yes, literally the same URL

The manifest and icons are already in place. The missing piece is a service
worker. Without one, the manifest does nothing for install or offline
behavior. That is one file to add.

### Native app — no

A native app is a separate binary distributed through the App Store or Play
Store. It never loads a URL as "the app". The backend can be the same host, but
the test build is not reachable by link.

### Testing mobile responsiveness on the same link today — yes

```bash
npx playwright open --device="iPhone 13"
```

Playwright is already a dev dependency, so this works against the existing dev
server at `http://localhost:3000`. This is the real test signal, and it will
reproduce the known P0 bug below.

## Root Cause of the P0 Mobile Overflow

One shell bug, six routes affected. Not per-page.

`components/layout/AppShell.tsx`:

```
<div className="flex min-h-screen">
  <Sidebar ... />          // w-60 shrink-0  — never yields
  <main className="flex-1 px-8 py-6">
```

`components/layout/Sidebar.tsx` renders `<aside className="flex w-60 shrink-0 flex-col ...">`.

The sidebar is pinned at 240px and refuses to shrink, the main column has fixed
`px-8` horizontal padding, and there is no breakpoint or wrapping anywhere. Below
roughly 600px viewport width the content overflows horizontally. This is why the
P0 audit item names `AppShell`/`Sidebar` as the cause rather than any page.

## Conversion Options, Ranked

### 1. PWA — cheapest, do this first

Add a service worker, fix the sidebar, add offline caching for static assets.

Gains: install to home screen, one URL, no store review, no separate codebase.

Ceiling: no background sync, no badge API on iOS, no BLE, no HealthKit, no push
notifications on iOS home-screen apps. For a fitness tracker this gets most of
the way.

### 2. Capacitor — native shell around the existing UI

`npx cap add ios` / `npx cap add android` against a static build of the app. Every
page already written is kept.

Two hard blockers:

- **Static build + cookie auth.** Capacitor serves from `file://` or
  `capacitor://`, so the relative `/api/*` calls break. Needs an absolute API
  base URL.
- **SQLite location.** The DB is server-side via Prisma. The device needs its own
  store — either a second Prisma schema targeting on-device SQLite plus a sync
  layer, or go API-only and drop the local DB.

Also: `@anthropic-ai/sdk` calls must move server-side or behind a proxy. **Never
ship an API key in the app bundle.**

### 3. React Native / Expo — real native, full UI rewrite

Best choice if HealthKit, Google Health Connect, or wearable integration
matters.

What survives: the API layer only — `lib/api-client.ts`, the zod schemas, and the
Prisma/Postgres backend.

What is lost: all 13 pages, all 144 tests, the entire `components/` tree. By far
the most work.

### 4. Flutter

Same tradeoff as option 3, different language, so zero reuse of existing React
code.

## Blocker Common to All Options

SQLite plus `better-sqlite3` is a native Node module backed by a file on disk.
Nothing about that survives onto a phone unmodified. Two architectures:

- **Server is source of truth** — works for the PWA now, and for native later.
  The device caches only.
- **Device is source of truth** for offline logs, with sync later — means building
  conflict resolution.

**Recommendation: server-as-source-of-truth.** Fitness logs are small and
naturally append-only, so sync stays trivial.

## Suggested Order of Work

1. Fix the `AppShell` / `Sidebar` responsive layout. One file. Unblocks the P0
   item and makes any mobile test meaningful.
2. Add a service worker and finish the PWA. Same link, installable, shippable now.
3. Re-evaluate PWA vs. Capacitor only once it is known whether HealthKit is
   actually required.

The P0 / P1 / P2 audit items are the shared prerequisite for every option.

## Related Pending Items

These were already pending user decision and remain open:

- `scripts/audit.js` hardcodes the validator password — delete or strip it.
- `pages/workouts/workouts.tsx` is a stray duplicate of `pages/workouts/index.tsx`.

Git remains untouched by explicit user instruction — see
`.claude/SESSION-REPORT.md` and the no-git-constraint note.
