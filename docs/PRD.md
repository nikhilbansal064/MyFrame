# Product Requirements Document (PRD): My Story

## 1. Executive Summary
During festivals, election campaigns, marketing launches, and university events, organizers want supporters to share branded photos with overlays (twibbons) at scale. Today, this requires Photoshop skills, manual graphic design work, or the use of expensive, ad-heavy platforms.

**My Story** is a premium, ad-free, privacy-first web application that allows any organizer to upload a PNG photo frame, set up a campaign, and distribute a shareable URL in under 5 minutes. Supporters click the link, upload their photo, adjust it in the frame live on an HTML5 canvas, and instantly download the result—without signing up or seeing intrusive advertisements.

---

## 2. Competitor Research (Brief)

### Competitor: Twibbonize (twibbonize.com)
*   **Strengths**: Large community-driven catalog, high social sharing volume.
*   **Weaknesses**:
    *   **Heavy Ad Bloat**: Saturated with third-party popups, cookie banners, and redirects, eroding professional brand trust.
    *   **Privacy Friction**: Forces trackers and cookies on participants.
    *   **Basic Analytics**: Lacks granular campaign logs (e.g., device categories, locale, views vs. downloads trends).
    *   **Friction**: Unresponsive mobile sliders, slow rendering times, and complex login flows.

### "My Story" Edge (The Premium Alternative)
*   **Ad-Free Experience**: Minimalist, space-themed visual styling that puts the brand first.
*   **Client-Side Compositing**: Pixels are rendered on HTML5 Canvas in the user's browser. Participant photos never touch any server, providing 100% data privacy.
*   **Granular Metrics**: Professional dashboards offering detailed daily trend charts, conversion rates, and device categories.

---

## 3. User Personas

1.  **The Event Organizer (Sarah - Marketing Manager / NGO Coordinator)**:
    *   *Need*: Wants a clean, branded portal where supporters can frame their selfies.
    *   *Behavior*: Signs up via Google, uploads a PNG overlay, and tracks views vs. downloads on a visual dashboard.
2.  **The Supporter/Participant (Alex - Supporter / Attendee)**:
    *   *Need*: Wants to update their profile picture to show support.
    *   *Behavior*: Opens the link on their mobile device, takes a selfie or uploads a photo, adjusts it instantly, and downloads it in high-res without creating an account.

---

## 4. Feature List & Functional Specifications

### 4.1 Campaign Management & Builder (Organizer Flow)
*   **Campaign Creation**: Form inputs for title, description, custom slug, start date, and expiry date.
*   **PNG Overlay Slot**: File drag-and-drop supporting transparent PNGs.
*   **Scheduling Engine**: Automatic campaign activation and expiration. Campaign pages auto-close when the expiry date passes.
*   **Active/Public Toggles**: Allows organizers to toggle campaign visibility and searchability.

### 4.2 Analytics Dashboard (Organizer Flow)
*   **Metrics Summary Cards**: Displays total views, downloads, conversion rate (downloads/views), and active campaigns.
*   **Trend Charting**: Interactive line charts showing daily views vs. downloads.
*   **Device Category Telemetry**: Pie charts or progress bars grouping user agents into Mobile, Tablet, and Desktop.

### 4.3 Canvas Compositor Workspace (Participant Flow)
*   **No Sign-Up Required**: Participants access campaigns anonymously.
*   **Dynamic Image Manipulation**: Full touch/mouse drag to translate, and slider-based zoom controls.
*   **HTML5 Canvas Renderer**: Composites the user's photo underneath the transparent PNG overlay.
*   **High-Res Export**: Generates a flattened, high-quality 1080x1080px JPEG.

---

## 5. MVP Features vs. Future Roadmap (V2 Plan)

```
┌──────────────────────────────────────┐
│            MVP FEATURES              │
├──────────────────────────────────────┤
│ * Google Login & Dev Bypass Mode     │
│ * Transparent PNG overlay upload     │
│ * Single campaigns (Slug: /c/slug)   │
│ * Client-side 1080x1080px JPEG export│
│ * Basic metrics (Views vs Downloads) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            MVP FEATURES              │
├──────────────────────────────────────┤
│ * Google Login & Dev Bypass Mode     │
│ * Decoupled Frames Library (`frames`)│
│ * Single campaigns referencing frame │
│ * Client-side 1080x1080px JPEG export│
│ * Basic metrics (Views vs Downloads) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│           FUTURE (V2) ROADMAP        │
├──────────────────────────────────────┤
│ * Multi-frame campaign support       │
│ * Trendy & System Frames Gallery     │
│ * Organiser Frames Library Dashboard │
│ * Interactive stickers/text layers   │
│ * Direct social media API sharing    │
│ * Automated campaign QR Code generator│
│ * Advanced Geolocation analytics     │
└──────────────────────────────────────┘
```

### 5.1 MVP Scope (Phase 1)
*   Google Sign-In.
*   Decoupled frames layout: campaigns reference a static frame in a shared `public.frames` catalog.
*   Single transparent PNG frame per campaign.
*   Fixed output dimension (1080x1080px JPEG).
*   Local storage "Developer Bypass" sandbox mode for offline testing.
*   Daily metrics (Views, Downloads, Device Category).

### 5.2 V2 Plan (Phase 2)
*   **Organiser Frames Library (Feature 1)**: An organizer-specific dashboard where they can manage, upload, and reuse frames across multiple campaigns without duplicate uploads. Includes querying capabilities for `creator_id = auth.uid()`.
*   **Trendy & System Frames (Feature 2)**: A public, trending catalog where visitors can select public/system-uploaded frames (ranked by global `usage_count`) and use them directly on the Canvas compositor, bypassing the campaign flow entirely.
*   **Multi-Frame Campaigns**: Let organizers assign multiple frame styles to a single campaign, allowing participants to swipe through and select their favorite design.
*   **Interactive Stickers & Custom Text**: Enable participants to type text (e.g., their name or quote) or add event stickers onto the canvas.
*   **Automated QR Code Generator**: Generate download-ready QR codes for offline banners, directly linking to the `/c/[slug]` page.
*   **Direct Social API Integration**: Add single-tap share buttons that open WhatsApp, Instagram, or Twitter with pre-populated hashtags.
*   **Advanced Geolocation Analytics**: Parse IP metadata (on event logging APIs) to map campaign views and downloads geographically.

---

## 6. Target Metrics & Performance Indicators

*   **Conversion Rate**: Keep campaign download conversion (Downloads / Views) above **70%** via an intuitive, single-click crop interface.
*   **Page Load Performance**: Largest Contentful Paint (LCP) under **1.2s** to prevent bounce rates on slow mobile connections.
*   **Setup Speed**: Reduce the time it takes an organizer to sign in and publish a campaign to **under 2 minutes**.
