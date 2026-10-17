# Technical Architecture Document (TAD): My Story

## 1. Technical Decisions & Rationales

```
┌───────────────────────────────────────────────────────────────────────┐
│                       MY STORY TECH STACK RATIONALE                   │
├──────────────┬──────────────────┬─────────────────┬───────────────────┤
│   FRONTEND   │   STYLING ENGINE │   DATABASE/AUTH │  COMPOSITING      │
│  Next.js 16  │   Tailwind v4    │    Supabase     │  HTML5 Canvas     │
│ (App Router) │ (PostCSS Loader) │  (Postgres SQL) │  (Browser Only)   │
└──────────────┴──────────────────┴─────────────────┴───────────────────┘
```

### 1.1 Next.js 16 & Turbopack
*   **Why**: Supports file-based routing so `/c/[slug]` dynamic pages are easily resolved, server-side rendering (SSR) makes dynamic campaign pages indexable by search engine web crawlers, and the Turbopack dev compiler speeds up hot reloading.

### 1.2 Tailwind CSS v4 & PostCSS
*   **Why**: Tailwind v4 is configured entirely in CSS variables, allowing us to implement a strict **60-30-10 Color Rule** that can be changed dynamically by redefining standard variables in `globals.css`. It removes the need for complex CSS files for components.

### 1.3 Supabase (Postgres, Auth, Storage)
*   **Why**: Supabase integrates Postgres database schemas, GoTrue Auth (supporting Google OAuth), and File Storage under a unified API. By utilizing Postgres triggers, we can automatically sync Google sign-ups into organizer profiles, and secure multi-tenant assets using **Row-Level Security (RLS)**.

### 1.4 HTML5 Canvas API (Client-Side)
*   **Why**: All image compositing (rendering the participant's photo underneath the transparent frame PNG) runs inside the user's browser via 2D Canvas context. This has two key advantages:
    1.  **Zero Server Costs**: The client device performs the pixel-blending computation, saving massive backend costs.
    2.  **Privacy First**: The participant's photo is processed entirely in memory on the device and is never uploaded to any cloud database, eliminating security risks.

---

## 2. Database Schema Configuration

The Postgres schema decouples frames from campaigns. This enables organizers to manage their custom frame assets independently and permits the system to offer public, trending overlays directly to participants.

```
                  ┌──────────────────────┐
                  │      auth.users      │
                  └──────────┬───────────┘
                             │ (1:1 synced via Trigger)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      public.organisers                       │
├──────────────┬──────────────┬────────────────────────────────┤
│ COLUMN NAME  │ TYPE         │ CONSTRAINT                     │
├──────────────┼──────────────┼────────────────────────────────┤
│ id           │ uuid         │ Primary Key, FK auth.users     │
│ email        │ text         │ NOT NULL                       │
│ full_name    │ text         │                                │
│ avatar_url   │ text         │                                │
│ is_public    │ boolean      │ DEFAULT true                   │
│ settings     │ jsonb        │ DEFAULT '{}'                   │
│ created_at   │ timestamptz  │ DEFAULT now()                  │
└──────────────┴──────┬───────┴────────────────────────────────┘
                      │ (1:N Creator relation)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                        public.frames                         │
├──────────────┬──────────────┬────────────────────────────────┤
│ COLUMN NAME  │ TYPE         │ CONSTRAINT                     │
├──────────────┼──────────────┼────────────────────────────────┤
│ id           │ uuid         │ Primary Key, gen_random_uuid() │
│ url          │ text         │ NOT NULL (Overlay CDN URL)     │
│ title        │ text         │                                │
│ creator_id   │ uuid         │ FK public.organisers(id)       │
│ is_system    │ boolean      │ DEFAULT false                  │
│ is_public    │ boolean      │ DEFAULT true                   │
│ usage_count  │ integer      │ DEFAULT 0                      │
│ created_at   │ timestamptz  │ DEFAULT now()                  │
└──────────────┴──────┬───────┴────────────────────────────────┘
                      │ (1:N Frame relation)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                       public.campaigns                       │
├──────────────┬──────────────┬────────────────────────────────┤
│ COLUMN NAME  │ TYPE         │ CONSTRAINT                     │
├──────────────┼──────────────┼────────────────────────────────┤
│ id           │ uuid         │ Primary Key, gen_random_uuid() │
│ slug         │ text         │ UNIQUE, NOT NULL               │
│ creator_id   │ uuid         │ FK public.organisers(id)       │
│ title        │ text         │ NOT NULL                       │
│ description  │ text         │                                │
│ frame_id     │ uuid         │ FK public.frames(id) NOT NULL  │
│ start_date   │ timestamptz  │ NOT NULL                       │
│ end_date     │ timestamptz  │ NOT NULL                       │
│ is_active    │ boolean      │ DEFAULT true                   │
│ is_public    │ boolean      │ DEFAULT true                   │
│ settings     │ jsonb        │ DEFAULT '{}'                   │
│ metadata     │ jsonb        │ DEFAULT '{}'                   │
│ created_at   │ timestamptz  │ DEFAULT now()                  │
└──────────────┴──────┬───────┴────────────────────────────────┘
                      │ (1:N Analytics relation)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                      public.participants                     │
├──────────────┬──────────────┬────────────────────────────────┤
│ COLUMN NAME  │ TYPE         │ CONSTRAINT                     │
├──────────────┼──────────────┼────────────────────────────────┤
│ id           │ bigint       │ Primary Key, Auto-increment    │
│ campaign_id  │ uuid         │ FK public.campaigns(id) NULL   │
│ frame_id     │ uuid         │ FK public.frames(id) NOT NULL  │
│ event_type   │ text         │ CHECK (view, download)         │
│ user_agent   │ text         │                                │
│ locale       │ text         │                                │
│ region       │ text         │                                │
│ metadata     │ jsonb        │ DEFAULT '{}'                   │
│ created_at   │ timestamptz  │ DEFAULT now()                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Database Views (Analytics)
1.  **`public.campaign_daily_stats`**: Groups logs daily by `campaign_id` and `event_type` to fuel the trend lines:
    ```sql
    select 
      campaign_id, 
      date_trunc('day', created_at) as event_date, 
      event_type, 
      count(*) as event_count
    from public.participants 
    where campaign_id is not null
    group by campaign_id, date_trunc('day', created_at), event_type;
    ```
2.  **`public.campaign_device_stats`**: Parses user agents into Mobile, Tablet, and Desktop for campaigns:
    ```sql
    select 
      campaign_id, 
      case 
        when user_agent ilike '%mobile%' then 'Mobile' 
        when user_agent ilike '%tablet%' then 'Tablet' 
        else 'Desktop' 
      end as device_category, 
      count(*) as event_count
    from public.participants 
    where campaign_id is not null
    group by campaign_id, device_category;
    ```
3.  **`public.frame_daily_stats`**: Tracks analytics per frame (for system/trendy frames and global frame metrics):
    ```sql
    select 
      frame_id, 
      date_trunc('day', created_at) as event_date, 
      event_type, 
      count(*) as event_count
    from public.participants 
    group by frame_id, date_trunc('day', created_at), event_type;
    ```

### 2.2 Scalability Rationale
Decoupling frames from campaigns directly solves critical scale bottlenecks:
*   **Indefinite Edge Caching**: Transparent overlay PNGs (often 1-2MB) can be cached indefinitely at the CDN edge (e.g., Cloudflare) because frame assets are immutable and linked to a constant, stable `public.frames.url`. Changing campaign options or deleting a campaign no longer invalidates the cached image.
*   **Reduced Database Load**: Participants render composites locally. Heavy graphics are delivered from edge CDNs rather than through database file checks, saving DB connections.
*   **Optimized Hot-Asset Indexes**: An index on `public.frames(usage_count desc)` enables immediate execution of trending lists queries, preventing full-table scans.
*   **Concurrent Write Isolation**: Anonymous users incrementing a popular frame's popularity score call a Postgres RPC function (`public.increment_frame_usage`). This bypasses standard `public.campaigns` table write locks, avoiding transactional contention during viral traffic spikes.

### 2.3 Feature 1: Organiser Frames Library
The library allows organizers to manage and reuse their frames across campaigns.
*   **Direct Database Query**:
    ```sql
    select * from public.frames 
    where creator_id = auth.uid() 
    order by created_at desc;
    ```
*   **Endpoints & Routing Logic**:
    *   `GET /api/organiser/frames`: Returns JSON array of frames uploaded by the authenticated organizer. Leverages Supabase RLS (`auth.uid() = creator_id`).
    *   `POST /api/organiser/frames`: Multi-tenant upload. Uploads the PNG file to Supabase Storage at `/frames/[auth.uid()]/[unique-filename].png`, retrieves the public CDN URL, and writes a metadata record to `public.frames`.
    *   `DELETE /api/organiser/frames/[id]`: Restricts deletion if a frame is currently in use by active campaigns (FK constraint checking).

### 2.4 Feature 2: V2 Trendy Frames System
Enables participants to select trendy frames directly from a public directory without being tied to a specific campaign.
*   **Global Popularity Query**:
    ```sql
    select * from public.frames 
    where (is_public = true or is_system = true) 
    order by usage_count desc, created_at desc 
    limit 24;
    ```
*   **Endpoints & Routing Logic**:
    *   `GET /api/frames/trending`: Anonymous public endpoint returning system-wide trending frames.
    *   `POST /api/frames/[id]/use`: Secure increment trigger via RPC.
    *   **Participant Canvas Route**: Dynamic route `/canvas?frame_id=[id]` loads the composer directly with the requested frame. When a user downloads, telemetry is logged to `public.participants` with `campaign_id = NULL` and `frame_id = [id]`.

### 2.5 Database Migration script (Embedded to Decoupled Schema)
Run the following SQL migration script to safely transition from the embedded campaign schema to the decoupled frames schema without data loss:

```sql
-- Step 1: Create the frames table
create table if not exists public.frames (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text,
  creator_id uuid references public.organisers(id) on delete set null,
  is_system boolean default false not null,
  is_public boolean default true not null,
  usage_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Step 2: Set up RLS on public.frames
alter table public.frames enable row level security;

create policy "Allow public read of public/system frames" on public.frames
  for select using (is_public = true or is_system = true or auth.uid() = creator_id);

create policy "Allow organisers to insert their own frames" on public.frames
  for insert with check (auth.uid() = creator_id);

create policy "Allow organisers to update their own frames" on public.frames
  for update using (auth.uid() = creator_id);

create policy "Allow organisers to delete their own frames" on public.frames
  for delete using (auth.uid() = creator_id);

-- Step 3: Add temporary frame_id column to public.campaigns
alter table public.campaigns add column frame_id uuid references public.frames(id) on delete restrict;

-- Step 4: Migrate data and backfill campaigns.frame_id
with migrated_frames as (
  insert into public.frames (url, title, creator_id, is_public, is_system, created_at)
  select 
    frame_url, 
    coalesce(title || ' Frame', 'Default Frame') as title, 
    creator_id, 
    is_public, 
    false as is_system, 
    created_at
  from public.campaigns
  returning id, url
)
update public.campaigns c
set frame_id = mf.id
from migrated_frames mf
where c.frame_url = mf.url;

-- Step 5: Enforce NOT NULL on frame_id and clean up campaigns
alter table public.campaigns alter column frame_id set not null;
alter table public.campaigns drop column frame_url;

-- Step 6: Refactor participants to nullable campaign_id and introduce frame_id
alter table public.participants alter column campaign_id drop not null;
alter table public.participants add column frame_id uuid references public.frames(id) on delete cascade;

-- Backfill participants.frame_id using campaigns mapping
update public.participants p
set frame_id = c.frame_id
from public.campaigns c
where p.campaign_id = c.id;

-- Enforce NOT NULL constraint on participants.frame_id
alter table public.participants alter column frame_id set not null;

-- Step 7: Recreate Daily and Device stats views
drop view if exists public.campaign_daily_stats;
drop view if exists public.campaign_device_stats;

create or replace view public.campaign_daily_stats as
select
  campaign_id,
  date_trunc('day', created_at) as event_date,
  event_type,
  count(*) as event_count
from public.participants
where campaign_id is not null
group by campaign_id, date_trunc('day', created_at), event_type;

create or replace view public.campaign_device_stats as
select
  campaign_id,
  case 
    when user_agent ilike '%mobile%' then 'Mobile'
    when user_agent ilike '%tablet%' then 'Tablet'
    else 'Desktop'
  end as device_category,
  count(*) as event_count
from public.participants
where campaign_id is not null
group by campaign_id, device_category;

create or replace view public.frame_daily_stats as
select
  frame_id,
  date_trunc('day', created_at) as event_date,
  event_type,
  count(*) as event_count
from public.participants
group by frame_id, date_trunc('day', created_at), event_type;

-- Step 8: Indexes for scalability
create index if not exists idx_participants_frame_id on public.participants(frame_id);
create index if not exists idx_frames_usage_count on public.frames(usage_count desc);

-- Step 9: RPC utility function to atomically increment usage count
create or replace function public.increment_frame_usage(frame_id uuid)
returns void as $$
begin
  update public.frames
  set usage_count = usage_count + 1
  where id = frame_id;
end;
$$ language plpgsql security definer;
```

### 2.2 Sync Profile Trigger
Whenever a user logs in via Google OAuth for the first time, Supabase creates a record in `auth.users`. We listen to this event and sync it to the `public.organisers` table automatically:
```sql
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.organisers (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;
```

---

## 3. Storage Bucket Configuration

All campaign PNG frames are uploaded to a Supabase Storage bucket named `campaign-frames`.

### Multi-Tenant Security Rules (Storage RLS)
*   **Select**: Anyone can download transparent PNG overlays:
    ```sql
    bucket_id = 'campaign-frames'
    ```
*   **Insert/Update/Delete**: Authenticated organizers can only manage folders matching their user UUID:
    ```sql
    bucket_id = 'campaign-frames' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'frames'
    and (storage.foldername(name))[2] = auth.uid()::text
    ```

---

## 4. Canvas Manipulator & Image Blending Math

Inside [LiveCanvasEditor.jsx](file:///Users/nikhil.agarwal/Projects/my_story_web_app/src/components/LiveCanvasEditor.jsx), the compositing coordinates are calculated based on three variables:
*   `scale`: Zoom factor (ranging from `0.1` to `5`).
*   `translate.x` & `translate.y`: Horizontal and vertical drag offsets.

### Blending Formula (1080x1080px Target)
To avoid low-res pixelation, the canvas draws the composited image at its full 1080x1080px logical coordinate grid, regardless of what the CSS layout size of the canvas is on the screen:
1.  **Background Drawing**:
    *   Saves context state.
    *   Translates by `translate.x` and `translate.y`.
    *   Scales the drawing context by `scale`.
    *   Draws the participant's uploaded photo centered.
    *   Restores context.
2.  **Foreground Frame Drawing**:
    *   Draws the transparent PNG frame overlay directly on top at `(0, 0, 1080, 1080)`.
3.  **Exporting**:
    *   Converts the drawn canvas to a JPEG data URL: `canvas.toDataURL('image/jpeg', 0.95)`.
    *   Downloads the composited picture locally.
