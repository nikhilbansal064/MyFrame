# DevOps & Production Deployment Guide: My Story

Follow these steps to deploy **"My Story"** into a live, production-grade cloud environment.

---

## Deployment Steps Roadmap

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ 1. Supabase Setup│ ──> │2. Google Auth API│ ──> │3. Vercel Frontend│
│ (Tables & Storage│     │ (OAuth Client ID)│     │(Env Vars & Build)│
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 1. Database & Cloud Backend (Supabase)

### 1.1 Create the Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com).
2. Click **New Project** and select your organization.
3. Configure project details:
   * **Database Name**: `My Story Production` (or similar).
   * **Password**: Generate a secure password and save it in a safe vault.
   * **Region**: Choose the region closest to your target audience (e.g. `us-east-1` or `ap-south-1`).
   * **Pricing**: Select the **Free Tier**.
4. Click **Create New Project**. It will take ~2 minutes for provision setup to finish.

### 1.2 Run Schema Migrations
1. In your Supabase project, navigate to **SQL Editor** in the left-hand sidebar menu.
2. Click **New Query** → **New blank query**.
3. Open [supabase/migrations/20260530000000_init.sql](file:///Users/nikhil.agarwal/Projects/my_story_web_app/supabase/migrations/20260530000000_init.sql) in your local editor.
4. Copy the entire file contents, paste them into the Supabase SQL editor, and click **Run**.
5. Verify that the SQL executes successfully. This creates:
   * Tables: `organisers`, `campaigns`, `participants`.
   * Views: `campaign_daily_stats`, `campaign_device_stats`.
   * Triggers: Sync function `public.handle_new_user()` mapped to auth sign-ups.
   * Policies: Row-Level Security (RLS) configurations.

### 1.3 Verify Bucket Configuration
1. Go to **Storage** (bucket icon in the left menu).
2. Verify that the bucket named `campaign-frames` exists and is marked as **Public**.
3. Confirm that the storage security policies are active:
   * Public read access to all files.
   * Write/edit access restricted to authenticated owners under the `/frames/USER_ID/` path prefix.

---

## 2. Authentication Configuration (Google OAuth)

### 2.1 Google Developer Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (e.g., `my-story-prod`).
3. Set up the **OAuth Consent Screen**:
   * Choose **External** user type and click Create.
   * Fill out the app name (`My Story`), user support email, and developer email.
   * Under Scopes, select `email` and `profile`.
4. Create **Credentials**:
   * Click **Create Credentials** → **OAuth client ID**.
   * **Application type**: select **Web application**.
   * **Name**: `My Story Production`.

### 2.2 Link Authorized Redirect URIs
1. In your Supabase dashboard, navigate to **Authentication** (key icon) → **Providers** → **Google**.
2. Locate the **Redirect URI** shown at the top of the Google provider card. It will look like:
   `https://[project-ref].supabase.co/auth/v1/callback`
3. Copy this URL.
4. In the Google Cloud Console, under **Authorized redirect URIs**, paste the URL and click **Create**.
5. Copy the generated **Client ID** and **Client Secret**.

### 2.3 Configure Supabase Auth Provider
1. Return to Supabase → **Authentication** → **Providers** → **Google**.
2. Toggle Google login to **Enabled**.
3. Paste the **Client ID** and **Client Secret** copied from the Google Console.
4. Click **Save**.

---

## 3. Frontend Web Hosting (Vercel)

### 3.1 Push Code to GitHub
Ensure all code (including our new documents) is committed and pushed:
```bash
git init
git add .
git commit -m "docs: added PM, architecture, and devops documentation"
# Push to your remote repository (e.g. GitHub)
```

### 3.2 Import Project to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** → **Project**.
3. Select your repository and click **Import**.

### 3.3 Set Environment Variables
In Vercel's project configuration, expand the **Environment Variables** section and add the following keys. You can retrieve these from your Supabase Dashboard under **Project Settings** → **API**:

| Env Key | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://x.supabase.co` | Your Supabase Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI...` | Your Supabase API Public Anon Key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` | Production URL (needed for Google OAuth redirects) |

### 3.4 Deploy
1. Click **Deploy**.
2. Vercel will clone, build (which we verified successfully builds), and deploy your site.
3. Once completed, copy the production URL (e.g. `https://my-story.vercel.app`).

---

## 4. Production Smoke Test Checklist

Once the deployment finishes, complete this smoke test:

| Test Step | Action | Expected Result |
| :--- | :--- | :--- |
| **1. Auth Redirect** | Click "Sign In with Google" | OAuth popup displays; logs in and redirects back to dashboard. |
| **2. Table Sync** | Check Supabase SQL Editor | Run `select * from public.organisers`. Confirm profile was automatically created. |
| **3. Asset Upload** | Create a campaign & upload PNG | Upload success. Check Supabase Storage bucket `campaign-frames` for the file. |
| **4. Participant Canvas** | Open campaign URL, upload photo, crop, and download | Canvas renders photo underneath transparent frame; downloads high-res JPEG. |
| **5. Metrics Tracking** | Refresh Organizer Dashboard | Stats counters increment; Chart.js trend lines plot views and downloads correctly. |
