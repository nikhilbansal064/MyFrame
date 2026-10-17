# Developer Environment & Setup Guide

Welcome to the **"My Story"** codebase! This document outlines everything you need to run, test, and develop the application locally.

---

## 1. Quick Start (Development Bootup)

To boot up the application, verify dependencies, and launch the Next.js development server with Turbopack, run the automated dev script from the project root:

```bash
./scripts/run-dev.sh
```

### Clean Rebuild Option
If you encounter caching errors or visual styles fail to recompile during development, purge the local Next.js cache by passing the `--clean` flag:

```bash
./scripts/run-dev.sh --clean
```

---

## 2. Dev Script Automation Breakdown

The `./scripts/run-dev.sh` automates the following setup phases:
1. **Node.js Check**: Assures that Node.js (v18+) is locally installed.
2. **Dependency Installation**: Checks for `node_modules`. If absent, automatically performs `npm install`.
3. **Environment Setup**: Verifies `.env.local` existence. If missing, scaffolds a default local sandbox config:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE1OTg4Njk0MDAsImV4cCI6MTkwNDQ0NTQwMH0.mockanonkey
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. **Cache Eviction**: Optionally removes the `.next/` cache dir on `--clean` starts.
5. **Server Spawning**: Triggers `npm run dev` in Next.js Turbopack mode, mapping to [http://localhost:3000](http://localhost:3000).

---

## 3. Fully Offline Development & Developer Bypass Mode

"My Story" has been built with an **Offline-First Architecture**. If your Supabase local containers or network connections are offline, you do **NOT** need to spin up or connect to a database to develop or inspect features.

### How to Bypass Database Setup:
1. Open the application landing page at [http://localhost:3000](http://localhost:3000).
2. Look at the bottom of the landing card, and click the **"Developer Bypass"** button.
3. This triggers a full offline client-side simulation:
   * **Authentication**: Simulates a successful organizer sign-in with a mock developer profile (`Developer Organiser`).
   * **Database Fallback**: Creates a fully interactive local sandbox inside your browser's `localStorage` (named `mystory_sandbox_campaigns`).
   * **Pre-populated Stats & Data**: Instantly populates the dashboard with:
     * Three pre-configured sample campaigns (*Green Planet 2026*, *Summer Startup Summit 2026*, and a draft campaign).
     * 7-day view/download analytics and interactive line charts (rendered using Chart.js).
4. **Full E2E Testing**: You can create new campaigns, change settings, open the unique sharing URLs (`/c/[slug]`), upload mock images, adjust them in the cropping canvas, and download high-resolution 1080x1080px JPEG composited frames entirely locally without a single server connection.

---

## 4. Manual Testing Walkthrough

Use this standard checklist to verify features locally when building new components:

| Step | Scope | Action | Expected Output |
| :--- | :--- | :--- | :--- |
| **1** | Auth | Click "Developer Bypass" on Landing | Redirects to `/dashboard` with mock organizer session loaded. |
| **2** | Dashboard | Inspect statistics cards and line chart | Verify total views, downloads, and conversion rates load dynamically. |
| **3** | Campaign creation | Click "Launch Campaign" → fill details & upload PNG overlay frame | Campaign saves to local storage, displays in active list with sharing link. |
| **4** | Participant View | Click campaign URL slug (e.g. `/c/abc`) | Opens participant page, loads campaign overlay. |
| **5** | Compositor | Upload participant image (JPG/PNG) | Photo slots correctly beneath overlay. Crop, zoom, and dragging translation work smoothly. |
| **6** | Export | Click "Download Branded Photo" | Client compositing draws high-res canvas; triggers a browser download for a 1080x1080px JPEG. |

---

## 5. Development Command Reference

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Next.js Turbopack development server |
| `npm run build` | Compiles optimized production bundle |
| `npm run start` | Boots compiled production bundle locally |
| `npm run lint` | Runs ESLint diagnostic sweep |
