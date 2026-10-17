# Handoff Report: Dashboard Interactions (Milestone 1)

This handoff contains findings, design specifications, and code recommendations to enable campaign editing and optimistic campaign deletion within the dashboard.

---

## 1. Observation
- **Dashboard File Path**: `src/app/dashboard/page.jsx`
  - In `handleDeleteCampaign` (lines 185-213), the deletion relies on waiting for the network call (`supabase.from('campaigns').delete().eq('id', campaignId)`) and then doing a full page refresh via `fetchCampaigns()`.
- **Campaign Creation File Path**: `src/components/CampaignCreator.jsx`
  - Campaigns are saved using the `frame_url` column directly: `.insert({ frame_url: publicUrl, ... })` (lines 190-202).
  - Fallback local storage key `'mystory_campaigns'` saves the fields `id`, `slug`, `creator_id`, `title`, `description`, `frame_url` (base64 PNG string), `start_date`, `end_date`, `is_public`, `is_active`, `stats` (mocked `{ views: 0, downloads: 0 }`), `settings`, and `metadata` (lines 214-228).
- **Database Schema Path**: `supabase/migrations/20260530000000_init.sql`
  - Defines the campaigns table with a `frame_id` reference column: `frame_id uuid references public.frames(id) on delete restrict not null` (line 41).
  - This decoupled schema does not have a `frame_url` column directly on `campaigns`.
  - *Discrepancy*: The active code (`CampaignCreator.jsx` and `c/[slug]/page.jsx`) still queries and inserts into a `frame_url` column on `campaigns` directly, indicating that the codebase currently runs against the legacy **Embedded Schema** and has not yet been migrated to the **Decoupled Schema**.

---

## 2. Logic Chain
1. **Pessimistic UI Deletion**: Because `handleDeleteCampaign` awaits the asynchronous Supabase deletion before updating the state via `fetchCampaigns()`, UI responsiveness is bound to network latency. Instantly updating the React states (`campaigns` and `stats`) and running the mutation in the background solves this.
2. **Database Inconsistency**: Since the active frontend queries/mutations utilize the `frame_url` column, the newly proposed `CampaignEditor.jsx` must target `frame_url` on `campaigns` (and use the Base64 Data URL preview as a local storage fallback) to preserve backward compatibility.
3. **Optimistic State Updates during Edits**: By introducing an `editingCampaign` state in `page.jsx` and passing an `onUpdate` callback to `CampaignEditor`, we can update the matching object in the `campaigns` state array instantly, preventing full page refetches and keeping user interactions under 100ms.

---

## 3. Caveats
- **Decoupled Schema Migration**: If the project decides to run the migration `20260530000000_init.sql` and drop the `frame_url` column, the proposed `CampaignEditor` and current `CampaignCreator` will fail. The frontend would need to be updated to:
  1. Insert/update the PNG to storage.
  2. Insert a record to the `frames` table and obtain the `frame_id`.
  3. Insert/update the `campaigns` table using `frame_id`.
- **Offline Storage Limitations**: Fallback Base64 PNG URLs saved in local storage can be large and may approach the 5MB local storage quota if several campaigns with high-res PNG frames are edited offline.

---

## 4. Conclusion
- **Optimistic Delete**: Can be implemented by swapping the blocking deletion loop with an immediate filter operation and background request execution with rollback capability.
- **CampaignEditor Component**: Designed to allow edit capabilities on title, description, go-live/expiry dates, is_public, and uploading a transparent PNG to Supabase Storage at `frames/USER_ID/slug_timestamp.png` with local storage base64 fallback.
- **State Synchronization**: Integrated instantly inside the dashboard's campaigns array, skipping database refetches.

---

## 5. Verification Method
1. **Inspection**:
   - Verify `analysis.md` for exact code additions for `src/app/dashboard/page.jsx` and the structure of `src/components/CampaignEditor.jsx`.
2. **Local Tests**:
   - Run the E2E test suite using Playwright:
     ```bash
     npx playwright test
     ```
   - Check that lint passes:
     ```bash
     npm run lint
     ```
