# Scope: Milestone 3 - Spacing, Padding, and Responsive Layout Alignment

## Architecture
- Next.js (v16.2) App Router project using Tailwind CSS (v4) and React (v19).
- Main layout views:
  - `src/app/page.js` - Landing Page
  - `src/app/dashboard/page.jsx` - Organizer Dashboard
  - `src/app/dashboard/campaign/[id]/page.jsx` - Campaign Analytics Details Page
- Key visual components:
  - `src/components/DashboardHeader.jsx` - Main header component for dashboard and campaign analytics page.
  - `src/components/DashboardStats.jsx` - Stats sections inside campaign analytics detail page.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Layout Alignment | Audit and fix header/content grid alignment under `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrappers. | None | PLANNED |

## Interface Contracts
- Alignment specifications: Use standard Tailwind container wrappers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
