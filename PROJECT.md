# Project: My Story Web App Improvements

## Architecture
- Next.js (v16.2) App Router project using Tailwind CSS (v4) and React (v19).
- supabaseClient (`src/lib/supabaseClient.js`) connects to database backend.
- AuthContext (`src/lib/AuthContext.jsx`) implements session management, including Google Sign-in and a local offline Developer Bypass mode.
- Dashboard (`src/app/dashboard/page.jsx`) lists, deletes, and manages campaigns.
- CampaignCreator (`src/components/CampaignCreator.jsx`) provides the form modal to launch campaigns.
- CampaignParticipantClient (`src/components/CampaignParticipantClient.jsx`) maps to the client participant workspace.
- LiveCanvasEditor (`src/components/LiveCanvasEditor.jsx`) handles photo rendering, coordinate transformation, client-side compositing, and final image download.

## Code Layout
- `src/app/page.js` - Landing Page
- `src/app/dashboard/page.jsx` - Organizer Dashboard
- `src/app/dashboard/campaign/[id]/page.jsx` - Campaign Analytics Details Page
- `src/app/c/[slug]/page.jsx` - Dynamic participant SSR landing page
- `src/components/CampaignCreator.jsx` - Campaign Creation Modal
- `src/components/CampaignParticipantClient.jsx` - Participant Campaign Client UI
- `src/components/LiveCanvasEditor.jsx` - Workspace Canvas & Transform Engine
- `src/components/DashboardHeader.jsx` - Unified Header Layout
- `src/components/DashboardStats.jsx` - Charts & Locale Analytics Tables
- `src/app/globals.css` - Global print layout and custom styles
- `tests/` - Playwright integration and E2E specs

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Dashboard Interactions | Optimistic deletion (under 100ms) & Edit Campaign modal dialog integration | none | PLANNED |
| 2 | Canvas Security & Watermarks | Bottom-right `"myStory"` watermark (10% padding), disable context menu, disable select/highlight, `@media print` canvas hide | none | PLANNED |
| 3 | Spacing & Responsive Layouts | Desktop navbar/content wrapper max-w-7xl alignment on Landing, Dashboard, and Stats | none | PLANNED |
| 4 | E2E Testing & Hardening | Compile, pass all tests, expand tests with coverage for new features, verify clean audit | M1, M2, M3 | PLANNED |

## Interface Contracts
### Campaign Edit Data Structure
- `id` (uuid): Campaign ID to update.
- `title` (text): Campaign title (trimmed, max 80 chars).
- `description` (text): Campaign description (trimmed, max 300 chars).
- `start_date` (ISO string): Scheduling start date.
- `end_date` (ISO string): Scheduling end date.
- `frame_file` (File object/null): Selected PNG frame file for update.
- `frame_url` (text): Updated or existing frame CDN URL / base64 preview.

### Canvas Watermark Geometry
- Canvas dimensions: 1080x1080px (fixed logical dimensions).
- Padding: 10% (108px) from the bottom and right edges.
- Watermark position: Text bottom-right corner aligned precisely at (x=972, y=972).
- Font styling: `24px sans-serif`, fill color `rgba(0, 0, 0, 0.3)`.
