# Development Guide — My Story

## Quick Start

```bash
# Recommended: automated start (auto-scaffolds .env.local if missing)
./scripts/run-dev.sh

# Start with a clean cache
./scripts/run-dev.sh --clean

# Manual start
npm run dev
```

App runs at **http://localhost:3000**

---

## Dev Bypass Mode (Fully Offline)

Dev Bypass lets you run and test the full application without a Supabase instance or Docker.

**How to activate:**
1. Click **"Developer Bypass"** on the landing page or dashboard login prompt
2. The app simulates a Google Auth session with mock profile **"Developer Organiser"**
3. localStorage is seeded with **3 sample campaigns**

No Supabase URL, anon key, or Docker setup is needed. All data reads and writes fall back to localStorage automatically.

> **Note:** Dev Bypass is only active when Supabase is unreachable. In production (where Supabase is live), it is effectively disabled.

---

## Environment Variables

The file `.env.local` is required for Supabase-connected development. `run-dev.sh` will scaffold it automatically if it does not exist.

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

To find your local anon key, run `supabase status` after starting the local Supabase stack.

---

## Project File Structure

```
src/
├── app/
│   ├── page.js                              # Landing page
│   ├── globals.css                          # Global styles + print CSS
│   ├── dashboard/
│   │   ├── page.jsx                         # Organiser dashboard
│   │   └── campaign/[id]/
│   │       └── page.jsx                     # Campaign analytics page
│   ├── c/[slug]/
│   │   └── page.jsx                         # Participant page (SSR)
│   └── api/
│       └── log-event/
│           └── route.js                     # Telemetry API route
├── components/
│   ├── LiveCanvasEditor.jsx                 # Canvas compositor
│   ├── CampaignCreator.jsx                  # Campaign creation modal
│   ├── CampaignEditor.jsx                   # Campaign edit modal
│   ├── CampaignParticipantClient.jsx        # Participant client view
│   ├── DashboardHeader.jsx                  # Shared header navigation
│   ├── DashboardStats.jsx                   # Analytics charts
│   └── ui/
│       └── PageContainer.jsx               # Layout wrapper
└── lib/
    ├── AuthContext.jsx                      # Auth + Dev Bypass logic
    ├── supabaseClient.js                    # Supabase client initialisation
    └── logger.js                           # Dev-mode logger

supabase/
└── migrations/
    └── 20260530000000_init.sql             # Full DB schema migration

tests/                                       # Playwright E2E specs
scripts/
└── run-dev.sh                              # Dev server automation script
```

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run built production bundle |
| `npm run lint` | Run ESLint |
| `npx playwright test` | Full E2E test suite |
| `npx playwright test tests/campaign-flow.spec.js` | Core campaign flow tests only |

---

## Manual Testing Checklist

Work through these scenarios after any significant change:

1. **Auth** — Click "Developer Bypass" → confirm you land on the dashboard with the mock "Developer Organiser" session
2. **Dashboard** — Confirm stats cards and charts load dynamically from seeded data
3. **Create campaign** — Fill the creation form, upload a PNG frame → campaign saves to localStorage and appears in the list with a shareable link
4. **Participant view** — Visit `/c/[slug]` → confirm the frame overlay loads correctly
5. **Canvas interaction** — Upload a photo → drag and pinch-to-zoom adjust position and scale; frame overlays correctly at all zoom levels
6. **Export** — Click download → file is a 1080×1080px JPEG with `myStory` watermark in the bottom-right corner

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Offline-first with localStorage fallback** | All Supabase calls gracefully fall back to localStorage, so development works without a running Supabase or Docker instance |
| **Optimistic UI for deletions** | Campaign deletion updates the UI immediately and rolls back on failure, preventing perceived lag |
| **Client-side-only compositing** | Participant photos are composited in the browser via the Canvas API — they are never uploaded to any server (privacy guarantee) |
| **`PageContainer` layout wrapper** | A single shared component enforces consistent `max-w-7xl` margins across all dashboard pages, preventing layout drift |
| **No new npm packages without approval** | Keeps the bundle size predictable and avoids introducing unmaintained dependencies |

---

## Current TODOs / Next Steps

- [ ] Fix remaining `e2e-detailed.spec.js` test failures (~129 failing): layout class assertions and watermark font property assertions
- [ ] **V2:** Organiser Frames Library feature (manage and reuse frames across campaigns)
- [ ] **V2:** Trendy / System Frames public gallery
- [ ] Production deployment — see [DEPLOYMENT.md](./DEPLOYMENT.md)
