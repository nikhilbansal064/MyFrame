# Unified Layout and Caching Analysis

This report documents the architectural findings, layout container alignment details, and Next.js caching/compilation behavior for the **My Story Web App**.

---

## 1. Unified Layout Container Alignment Analysis

An investigation was conducted across all pages, headers, landing page sections, and dashboard stats panels to ensure desktop alignment under a unified `max-w-7xl` container.

### Layout Summary of Main Views

| Component / Page Path | Header Container Classes | Main Content Wrapper Classes |
| :--- | :--- | :--- |
| **Landing Page** (`src/app/page.js`) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| **Dashboard Page** (`src/app/dashboard/page.jsx`) | Inherits from `DashboardHeader` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| **Analytics Details Page** (`src/app/dashboard/campaign/[id]/page.jsx`) | Inherits from `DashboardHeader` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| **Participant Campaign Page** (`src/app/c/[slug]/page.jsx`) | Inherits from `CampaignParticipantClient` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| **Dashboard Header Component** (`src/components/DashboardHeader.jsx`) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | N/A (Header only) |
| **Participant Client Component** (`src/components/CampaignParticipantClient.jsx`) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

### Key Alignment Findings

1. **Perfect Width Consistency:** All primary views (Landing Page, Organiser Dashboard, Campaign Analytics Report, and Participant Canvas Workspace) are consistently bound by the `max-w-7xl mx-auto` container with matching paddings (`px-4 sm:px-6 lg:px-8`).
2. **Unified Navigation Headers:** Both headers (`DashboardHeader.jsx` and the custom dynamic header inside `CampaignParticipantClient.jsx`) implement identical layout containers. On desktops, brand elements, user metadata widgets, and sign-out controls align perfectly.
3. **Stat Panels Grid:** `DashboardStats.jsx` is nested inside `/dashboard/campaign/[id]/page.jsx`'s main wrapper. Because it does not declare its own max-width constraints, it flows naturally to fill the 7xl grid width. Its sub-grid layout (`sm:grid-cols-3` for stats counters, `lg:grid-cols-3` for trends and category graphs) is properly scoped to the parent bounds.
4. **Centered Lock Screens / Error Views:** Centered layout files like database configuration alerts, expired campaign pages, and unauthorized access dashboards purposefully use screen-centered layouts (`min-h-screen items-center justify-center`) without the `max-w-7xl` constraint, which is the expected behavior for overlay/full-screen notification states.

---

## 2. Next.js Caching & Build Compilation Considerations

For Next.js 15+ setups, dynamic data fetching and routing compilation must be carefully managed to avoid caching errors, stale views, or build failures.

### A. Route Static Optimization & SSG Risks
- **Issue:** `src/app/c/[slug]/page.jsx` is a server-side rendered (SSR) dynamic page. In Next.js 15, dynamic route pages that do not use dynamic headers/cookies or `generateStaticParams` are evaluated during build time to check if they can be statically pre-rendered.
- **Risk:** If built in a CI/CD environment where Supabase database variables are not set, the build process may statically pre-render `/c/[slug]` to the "Database Configuration Error" screen and serve this static error page to all participants, or fail the build entirely.
- **Proposed Solution:** Add an explicit dynamic flag at the top of `src/app/c/[slug]/page.jsx`:
  ```javascript
  export const dynamic = 'force-dynamic';
  ```
  This forces Next.js to render the page dynamically on each request, ensuring compilation succeeds without database keys during build time and always serves fresh campaign details.

### B. Client-side Route Caching (Router Cache)
- **Issue:** Next.js caches Client-side navigations (using `<Link>` or `router.push`) in a client memory cache (Router Cache).
- **Impact:** If an organiser updates or toggles a campaign state (e.g., pausing it or updating the title) and navigates to the participant view, they might see stale data due to client-side caching.
- **Verification:** Since the application triggers telemetry logs via POST (`/api/log-event`) and re-fetches details inside `useEffect` fallbacks, the impact is minimized, but developers must call `router.refresh()` in the dashboard after state updates to bust the client router cache.

### C. Direct Supabase JS Client Caching
- **Behavior:** The application uses direct supabase-js clients (e.g. `supabaseServer` on server components and `supabase` client-side).
- **Compilation Detail:** Next.js request memoization and data caching only apply to the standard `fetch()` API. Direct PostgreSQL connections and WebSocket queries bypassed standard Next.js route caches. This is advantageous here as it ensures that campaign updates (pauses, new dates) bypass caching and reflect instantly.

### D. POST Telemetry APIs
- **Behavior:** `/api/log-event` parses user headers and writes events. Next.js never caches API routes with `POST` methods, preventing telemetry logging from being blocked by caching layers.

---

## 3. Recommended Code Adjustments

To ensure absolute build-time safety and prevent static cache pollution:

```diff
// Proposed change in src/app/c/[slug]/page.jsx
+ export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import CampaignParticipantClient from '@/components/CampaignParticipantClient';
```
