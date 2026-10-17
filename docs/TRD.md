# Technical Requirements Document — My Story

## Tech Stack

| Technology | Version | Rationale |
|-----------|---------|-----------|
| **Next.js** | 16.2 (App Router) | SSR for SEO/OpenGraph on participant pages; CSR for the canvas editor |
| **React** | 19 | UI framework; concurrent features for smooth canvas interactions |
| **Tailwind CSS** | v4 | Utility-first styling with built-in dark theme support |
| **Supabase** | — | PostgreSQL database + Google OAuth + Storage (PNG frames) in a single managed platform |
| **Vercel** | — | Zero-config deployment with automatic CDN and preview environments |
| **Playwright** | — | End-to-end testing across Chromium, Firefox, and WebKit |
| **shadcn/ui** | — | Accessible, unstyled component primitives (Button, Card, Dialog, etc.) composed on top of Tailwind |

---

## Application Architecture

The app uses a hybrid SSR + CSR model:

- **Server-rendered pages** handle SEO-critical content (participant page `<head>` with OpenGraph tags).
- **Client-rendered pages** handle all interactive UI (dashboard, canvas editor, analytics charts).
- **API routes** handle anonymous server-side telemetry writes only.

### Route Map

| Route | Rendering | Purpose |
|-------|-----------|---------|
| `/` | Static | Marketing / hero landing page |
| `/dashboard` | CSR (protected) | Organiser campaign management |
| `/dashboard/campaign/[id]` | CSR (protected) | Campaign analytics and stats |
| `/c/[slug]` | SSR + CSR | Participant page — SSR for SEO, client for canvas |
| `/api/log-event` | Server (API route) | Anonymous telemetry event logging |

---

## Key Components

| Component | Responsibility |
|-----------|---------------|
| `AuthContext.jsx` | Google OAuth session management, Dev Bypass mode, localStorage fallback |
| `LiveCanvasEditor.jsx` | Canvas rendering (background photo + foreground frame + watermark), drag/zoom/touch handling, JPEG export |
| `CampaignCreator.jsx` | Campaign creation modal/form — title, slug, dates, frame upload |
| `CampaignEditor.jsx` | Campaign editing modal — update existing campaign fields |
| `CampaignParticipantClient.jsx` | Participant view — telemetry firing, expired/scheduled/inactive state gates |
| `DashboardHeader.jsx` | Shared top navigation bar for all dashboard pages |
| `DashboardStats.jsx` | Analytics charts and device-category stat cards |
| `PageContainer.jsx` | Unified layout wrapper (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) for consistent margins |

---

## Database Schema

### `public.organisers`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, references `auth.users` |
| `email` | text | |
| `full_name` | text | |
| `avatar_url` | text | |
| `created_at` | timestamptz | |

### `public.campaigns`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `creator_id` | uuid | FK → `organisers.id` |
| `title` | text | max 80 chars |
| `description` | text | max 300 chars |
| `slug` | text | unique |
| `frame_url` | text | PNG CDN URL |
| `start_date` | timestamptz | |
| `end_date` | timestamptz | |
| `is_active` | boolean | |
| `is_public` | boolean | |
| `settings` | jsonb | |
| `metadata` | jsonb | |
| `created_at` | timestamptz | |

### `public.participants` (event log)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → `campaigns.id` |
| `event_type` | text | `'view'` \| `'download'` |
| `user_agent` | text | |
| `locale` | text | |
| `created_at` | timestamptz | |

### Views

| View | Description |
|------|-------------|
| `campaign_daily_stats` | Aggregated daily view/download counts per campaign |
| `campaign_device_stats` | Device category breakdown (Mobile / Tablet / Desktop) per campaign |

### Auto-Trigger

**`handle_new_user()`** — Fires on `INSERT` to `auth.users`. Syncs the new user's profile into `public.organisers` on first Google login.

---

## V2 Planned Schema

### `public.frames` (decoupled frame library)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `url` | text | |
| `title` | text | |
| `creator_id` | uuid | FK → `organisers.id`, nullable (system frames) |
| `is_system` | boolean | |
| `is_public` | boolean | |
| `usage_count` | integer | |
| `created_at` | timestamptz | |

---

## Storage Architecture

| Property | Value |
|----------|-------|
| **Bucket** | `campaign-frames` |
| **Path pattern** | `/frames/[user_uuid]/[filename].png` |
| **Read access** | Public (anyone can fetch frame URLs for display) |
| **Write access** | Authenticated organisers may only write to their own `[user_uuid]` folder (enforced by RLS) |

---

## Canvas Compositing

The participant canvas operates on a fixed **1080×1080px logical resolution** regardless of the CSS display size on screen.

### Layer Order

1. **Background** — Participant's photo, drawn with a scale + translate transform (user-controlled via drag/zoom)
2. **Foreground** — Campaign PNG frame, drawn at `(0, 0, 1080, 1080)` at full canvas size
3. **Watermark** — `myStory` text, bottom-right position

### Watermark Spec

```
Position:  (972, 972)          // 10% padding from bottom-right (1080 × 0.9 = 972)
Font:      24px sans-serif
Color:     rgba(0, 0, 0, 0.3)  // semi-transparent black
```

### Export

```js
canvas.toDataURL('image/jpeg', 0.95)
```

Output: 1080×1080px JPEG at 95% quality.

---

## API Routes

### `POST /api/log-event`

Logs an anonymous participant telemetry event to `public.participants`.

**Request body:**
```json
{
  "campaign_id": "uuid",
  "event_type": "view | download",
  "user_agent": "string",
  "locale": "string"
}
```

**Response:** `204 No Content` on success.

No authentication required. No PII is accepted or stored.

---

## Security & RLS Policies

### `public.campaigns`
- `SELECT`: organisers can only read their own campaigns (`creator_id = auth.uid()`)
- `INSERT` / `UPDATE` / `DELETE`: organisers can only modify their own campaigns (`creator_id = auth.uid()`)

### `public.participants`
- `INSERT`: allowed for **anonymous** requests (no auth token required)
- `SELECT`: blocked for all — no participant can read the event log

### `public.frames` (V2)
- `SELECT`: public frames readable by all; private frames readable only by owner
- `INSERT` / `UPDATE` / `DELETE`: organisers manage only their own frames (`creator_id = auth.uid()`)
