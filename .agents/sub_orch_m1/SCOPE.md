# Scope: Dashboard Interactions (Milestone 1)

## Architecture
- React client-side page layout for `/dashboard` (`src/app/dashboard/page.jsx`).
- Dedicated dialog modal component for editing.
- Supabase JS Client interaction for table updates and storage bucket `frames` upload.
- Optimistic state updates in React to achieve deletion speed under 100ms.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Planning | View code, analyze structure, plan changes | None | PLANNED |
| 2 | Code Implementation | Implement Optimistic Delete, Edit Modal, Supabase/base64 uploads, Instant Refresh | M1 | PLANNED |
| 3 | Verification & Review | Code review, challenger run, build validation | M2 | PLANNED |

## Interface Contracts
### Edit API & Storage
- Supabase Storage path: `frames/USER_ID/slug_timestamp.png`
- Table updates: update `campaigns` table for campaign metadata and `frame_url`.
- Database/API local storage fallback support.
