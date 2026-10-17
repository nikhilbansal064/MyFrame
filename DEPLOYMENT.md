# Production Deployment Plan & Steps

This guide outlines the complete, step-by-step plan to transition **"My Story"** from local development into a live, production-grade cloud environment. It is designed to be fully accessible to developers of all experience levels.

---

## Architecture Overview

"My Story" leverages a modern, highly scalable, serverless architecture:
* **Frontend/Serverless Backend**: **Next.js 16 (App Router)** hosted on **Vercel** for automatic global distribution, server-side rendering (SSR), and lightning-fast loading speeds.
* **Database & Auth**: **Supabase (PostgreSQL)** for secure storage of campaigns, organizers, and user sessions.
* **Asset Storage**: **Supabase Storage** for hosting high-res transparent PNG overlays under isolated, tenant-secured folders.
* **Client Processing**: HTML5 Canvas compositing happens **100% in the participant's browser**, eliminating server rendering CPU costs and protecting image privacy.

```
┌─────────────────────────────────┐
│     Next.js App on Vercel       │
│  (Static Landing / Dynamic SSR) │
└───────┬───────────────────┬─────┘
        │ (Assets/Data)     │ (Google Auth Redirect)
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ Supabase DB   │   │ Google OAuth  │
│ & Storage     │   │   Console     │
└───────────────┘   └───────────────┘
```

---

## Phase 1: Database Setup (Supabase)

Supabase provides your Postgres database, row-level security (RLS), Google sign-in integration, and storage buckets.

### Step 1.1: Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in or create a free account.
2. Click **New Project** and select your organization.
3. Enter your project details:
   * **Name**: `My Story` (or similar)
   * **Database Password**: *Generate a secure password and save it in a safe place.*
   * **Region**: Select a region physically closest to your primary audience (e.g., `us-east-1` or `ap-south-1`).
   * **Pricing Plan**: Select the **Free Tier**.
4. Click **Create New Project** and wait ~2 minutes for provision setup to finish.

### Step 1.2: Apply Database Migrations (SQL Schema)
1. In your Supabase Dashboard, click on **SQL Editor** in the left navigation sidebar.
2. Click **New Query** → **New blank query**.
3. Open your local migration file: [20260530000000_init.sql](file:///Users/nikhil.agarwal/Projects/my_story_web_app/supabase/migrations/20260530000000_init.sql).
4. Copy the entire contents of the file and paste it into the Supabase SQL editor panel.
5. Click **Run** at the bottom right.
6. Verify that the query runs successfully. This sets up:
   * **Tables**: `organisers`, `campaigns`, `participants`.
   * **Views**: `campaign_daily_stats`, `campaign_device_stats`.
   * **Triggers**: Automatic creation of `organiser` profiles whenever an auth sign-in (e.g. Google) occurs.
   * **Security Policies**: Row Level Security (RLS) rules restricting campaign and media adjustments exclusively to their creators.

### Step 1.3: Verify Bucket Configuration
The migration automatically configures your public file storage bucket. To double-check:
1. In your Supabase Dashboard, go to **Storage** (bucket icon in the left menu).
2. Confirm that a bucket named `campaign-frames` is present and marked as **Public**.
3. Click on the bucket, select **Policies** (or access policies), and confirm that the storage RLS rules are active:
   * Public users can **read/download** frames.
   * Authenticated organizers can only **insert/update/delete** files whose path prefix matches their specific User ID: `frames/USER_ID/...`.

---

## Phase 2: Authentication Configuration (Google OAuth)

To allow Event Organizers to log in securely with their Google accounts, configure a Google Cloud credentials project.

### Step 2.1: Obtain Google Client ID & Secret
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (e.g., `my-story-prod`).
3. Search for **OAuth Consent Screen** in the search bar:
   * Select **External** user type and click **Create**.
   * Fill out the app information: App Name (`My Story`), User support email, and Developer contact information.
   * Under **Scopes**, click Add Scopes and select `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
   * Click **Save and Continue** until you return to the dashboard.
4. Go to **Credentials** in the left sidebar:
   * Click **Create Credentials** → **OAuth client ID**.
   * **Application type**: select **Web application**.
   * **Name**: `My Story Production`.
5. Under **Authorized Redirect URIs**, you need to add your Supabase redirect URI:
   * Open your Supabase Dashboard → Go to **Authentication** (key icon) → **Providers** → **Google**.
   * Locate the **Redirect URI** shown at the top of the Google provider accordion. It looks like: `https://[your-project-ref].supabase.co/auth/v1/callback`.
   * Copy this URL, paste it into the Google Cloud Console **Authorized Redirect URIs** field, and click **Save**.
6. Google will generate a **Client ID** and **Client Secret**. Copy these credentials.

### Step 2.2: Enable Google Provider in Supabase
1. Return to your Supabase Dashboard → **Authentication** → **Providers** → **Google**.
2. Toggle Google login to **Enabled**.
3. Paste the **Client ID** and **Client Secret** copied from the Google Cloud Console.
4. Leave other default scopes enabled and click **Save**.

---

## Phase 3: Web Application Deployment (Vercel)

Vercel is the recommended hosting platform for Next.js apps. It provides zero-configuration deployment, CDN edge caching, and free SSL.

### Step 3.1: Commit Code to Git
Ensure your workspace is fully committed and pushed to a Git provider (GitHub, GitLab, or Bitbucket):
```bash
git init
git add .
git commit -m "feat: core campaign flows and offline sandbox bypass verified"
# Push to your remote repository (e.g., GitHub)
```

### Step 3.2: Import Project into Vercel
1. Sign in to your [Vercel](https://vercel.com) account.
2. Click **Add New** → **Project**.
3. Select your Git provider, locate the repository (e.g., `my_story_web_app`), and click **Import**.

### Step 3.3: Configure Production Environment Variables
In the Vercel project configuration panel, expand the **Environment Variables** section and add the following keys. (You can copy their production values from your **Supabase Dashboard** under **Project Settings** → **API**):

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[your-project-ref].supabase.co` | Your Supabase Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase API Public Anon Key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-custom-domain.com` (or your `vercel.app` domain) | Base URL of your deployed site for OAuth redirects |

### Step 3.4: Deploy
1. Click **Deploy**.
2. Vercel will clone your repository, run `npm run build` (which we verified successfully compiles), and deploy it globally.
3. Once completed, Vercel will provide you with a production URL (e.g., `https://my-story-app.vercel.app`).

---

## Phase 4: Verification & Smoke Testing

Once live, run a quick E2E verification to ensure the production database, auth, and storage sync correctly:

1. **Production Sign-In**:
   * Navigate to your production URL.
   * Click **Sign In with Google** (verify OAuth screen loads and successfully redirects back to the dashboard).
2. **Profile Creation**:
   * In Supabase SQL/Table editor, check the `public.organisers` table. Confirm that your Google user account was automatically synced via the database trigger.
3. **Launch Campaign**:
   * On your live organizer dashboard, click **Launch Campaign**.
   * Fill out the details, and upload a transparent PNG frame overlay.
   * Verify that the file successfully uploads to Supabase Storage inside the `campaign-frames` bucket (under `frames/YOUR_AUTH_USER_ID/...`).
4. **Participant Flow**:
   * Open the generated shareable URL (e.g., `https://yourdomain.com/c/campaign-slug`).
   * Verify that the PNG overlay frame loads instantly.
   * Upload a photo, drag/zoom to fit, and click **Download Branded Photo**.
   * Check your local downloads folder for the high-res 1080x1080px JPEG.
5. **Analytics Sweep**:
   * Return to your organizer dashboard and verify that the views/downloads charts update in real-time, reflecting your participant action.
