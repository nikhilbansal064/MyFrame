# Product Requirements Document — My Story

## Executive Summary

**My Story** is a premium, ad-free, privacy-first web application that lets organisers create branded photo-frame campaigns and share them with participants. An organiser uploads a PNG overlay frame, sets a campaign URL, and shares a link. Participants visit the URL, upload their own photo, adjust position and scale on a canvas, and download a composited 1080×1080px JPEG — all without creating an account and without their photo ever leaving their device.

My Story is a direct, elevated alternative to Twibbonize, designed for communities, nonprofits, sports clubs, and event organisers who value clean UX and participant privacy over advertising revenue.

---

## Competitor Analysis

### Twibbonize — Weaknesses

| Area | Problem |
|------|---------|
| **Ads** | Heavy ad placement degrades participant experience and brand perception |
| **Privacy** | Participant photos are uploaded to Twibbonize servers |
| **Mobile UX** | Canvas interaction is clunky on touch devices |
| **Analytics** | Basic pageview counts only; no conversion tracking or device breakdown |
| **Friction** | Prompts for account creation before download |

### My Story's Edge

| Differentiator | Detail |
|----------------|--------|
| **Ad-free** | Zero ads; clean, focused experience for every participant |
| **Client-side privacy** | Photo compositing happens entirely in the browser — participant images are never uploaded to any server |
| **Granular analytics** | Views, downloads, conversion rate, and device category breakdown per campaign |
| **No participant sign-up** | Participants download their image in seconds with zero friction |
| **Scheduling** | Campaigns can have defined start/end dates; content is gated before launch or after expiry |

---

## User Personas

### Persona 1 — The Organiser

> **"I need to rally my community around an event, and I want it to look professional without paying for a designer."**

- Creates and manages campaigns via a protected dashboard
- Uploads PNG frames, sets slugs and scheduling dates
- Monitors analytics to understand reach and engagement
- Expects a setup time under 2 minutes per campaign

### Persona 2 — The Participant

> **"I want to support this cause and share my photo — quickly, on my phone, without signing up for yet another app."**

- Arrives via a shared link (social media, WhatsApp, etc.)
- Uploads their photo, adjusts it on the canvas, and downloads the result
- Privacy-conscious; does not expect their photo to be stored anywhere
- May be on a low-end mobile device with a slow connection

---

## MVP Feature List

> All features below are **MVP scope** (v1.0).

### Authentication
- Google OAuth login for organisers (via Supabase Auth)
- Developer Bypass mode for local development (no backend required)

### Campaign Management
- Create campaigns with: title (max 80 chars), description (max 300 chars), unique slug, PNG frame upload, start/end dates
- Toggle `is_active` (enables/disables participant access) and `is_public` (controls gallery visibility)
- Campaign scheduling: participant page shows "coming soon" before `start_date` and "expired" after `end_date`
- Edit and delete existing campaigns

### Canvas Compositor (Participant Flow)
- No sign-up required for participants
- Participant uploads a photo; it is composited with the campaign PNG frame in-browser
- Drag and pinch-to-zoom support on both desktop and mobile
- Frame overlaid at full canvas size (1080×1080px)
- Export as 1080×1080px JPEG at 95% quality with `myStory` watermark (bottom-right)

### Analytics Dashboard
- Per-campaign metrics: total views, total downloads, conversion rate (downloads ÷ views)
- Daily view/download trend chart
- Device category breakdown: Mobile / Tablet / Desktop
- Anonymous telemetry — no PII collected

### Offline / Dev Sandbox
- Full localStorage-based offline mode for local development
- Seeded with 3 sample campaigns; no Supabase or Docker instance required

---

## V2 / Future Roadmap

| Feature | Description |
|---------|-------------|
| **Organiser Frames Library** | Manage, reuse, and tag uploaded frames across multiple campaigns |
| **Trendy / System Frames Gallery** | Publicly browsable gallery of curated and system-provided frames |
| **Multi-frame campaigns** | Allow a participant to choose from multiple frames within one campaign |
| **Interactive stickers & text layers** | Let participants add personalised text or sticker overlays |
| **Direct social sharing** | One-tap share to Instagram, Twitter/X, WhatsApp from the download screen |
| **QR code generator** | Auto-generated campaign QR code for offline/print promotion |
| **Geolocation analytics** | Country/region breakdown of participant visits and downloads |

---

## Target Success Metrics

| Metric | Target |
|--------|--------|
| **Conversion rate** | > 70% (participants who view → download) |
| **Largest Contentful Paint (LCP)** | < 1.2 seconds on participant page |
| **Campaign setup time** | < 2 minutes from login to shareable link |
