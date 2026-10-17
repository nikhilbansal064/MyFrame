# Deployment Guide — My Story

## Pre-Deployment Checklist

- [ ] Supabase cloud project created
- [ ] All SQL migrations run on the cloud database
- [ ] Google OAuth credentials configured in Google Cloud Console
- [ ] Custom domain purchased (optional)
- [ ] All environment variables set in Vercel
- [ ] Production build passes locally: `npm run build`

---

## Step 1 — Supabase Cloud Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. After creation, open **Settings → API** and note:
   - **Project URL** (e.g. `https://your-project-ref.supabase.co`)
   - **Anon / public key**
3. Open the **SQL Editor** and paste the full contents of:
   ```
   supabase/migrations/20260530000000_init.sql
   ```
   Run the query to apply all schema migrations.
4. Enable Google OAuth:
   - **Authentication → Providers → Google**
   - Enter the **Client ID** and **Client Secret** from Google Cloud Console
   - Set the redirect URL to: `https://yourdomain.com/auth/callback`
5. Create the storage bucket:
   - **Storage → New Bucket** → name it `campaign-frames`
   - Enable **public access** for reads (organisers need authenticated write access only)

---

## Step 2 — Vercel Deployment

1. Push the repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repository
3. Framework will be auto-detected as **Next.js** — no manual configuration needed
4. Under **Environment Variables**, add:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-production-anon-key` |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |

5. Click **Deploy** — Vercel handles the build, CDN distribution, and HTTPS automatically.

---

## Domain Configuration

Vercel automatically provides a free `*.vercel.app` subdomain on every deploy.

**To use a custom domain:**

1. Purchase a domain from a registrar (Namecheap, GoDaddy, Google Domains, etc.)
   > Vercel does **not** sell or register domains.
2. In Vercel: **Project Settings → Domains → Add your domain**
3. Update your DNS records at your registrar:
   - **`www` subdomain:** Add a `CNAME` record pointing to `cname.vercel-dns.com`
   - **Apex domain (`@`):** Add an `A` record pointing to Vercel's IP (shown in the Vercel dashboard)
4. Wait for DNS propagation (usually under 30 minutes)

---

## Step 3 — Post-Deployment Verification

Work through these checks after every production deployment:

1. **Landing page** — Visit the production URL; the landing page loads without errors
2. **Google Sign-In** — Complete the OAuth flow; confirm redirect back to `/dashboard` with a valid session
3. **Campaign creation** — Create a campaign; verify it appears in the Supabase `campaigns` table
4. **Participant page** — Visit `/c/[slug]`; confirm the page loads with correct OpenGraph metadata (`<title>`, `<og:image>`, etc.)
5. **Canvas & export** — Upload a photo, adjust position, click download; confirm a 1080×1080px JPEG is saved with the `myStory` watermark in the bottom-right corner
6. **Analytics** — Confirm the analytics dashboard reflects the view event logged during step 4

---

## Platform Limits & Notes

| Platform | Free Tier Limits |
|----------|-----------------|
| **Vercel** | Sufficient for launch; no bandwidth restrictions on hobby tier for typical campaign traffic |
| **Supabase** | 500 MB database storage, 1 GB file storage, 50,000 monthly active users |

**Developer Bypass mode** is effectively disabled in production. It only activates when Supabase is unreachable — which will not happen when the cloud project is live and correctly configured.
