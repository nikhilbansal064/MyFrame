# Layout Alignment & Spacing Implementation Plan - Milestone 3

## Overview
This plan unifies the desktop alignment and container nesting across the "My Story" web application, and fixes a caching/build issue on dynamic routes.

## Files to Modify

### 1. `src/app/page.js` (Landing Page)
- Move layout constraints (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) from the `<section>` element of the Hero section into a nested inner `<div>` wrapper, following Pattern A (Full-Bleed Outer / Constrained Inner).
- Element to modify: Hero Section (lines around 80-90).

### 2. `src/app/dashboard/page.jsx` (Organizer Dashboard)
- **Header**: Replace the duplicated `<header>` block inside the unauthenticated state (`if (!user)`) check with the imported `<DashboardHeader />` component.
- **Main Wrapper (Unauth)**: Change `<main className="flex-1 flex flex-col items-center justify-center px-6 py-12">` to `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">`.
- **Main Wrapper (Auth)**: Change `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">` to a full-bleed `<main className="flex-1 w-full py-10">` and wrap the inner content children in a `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">` alignment wrapper.
- **Grid Gap**: Update the campaigns card grid `gap-8` to `gap-6` to standardize horizontal grid spacing with the rest of the application.

### 3. `src/app/dashboard/campaign/[id]/page.jsx` (Campaign Analytics Details Page)
- **Main Wrapper (Unauthorized)**: Update `<main className="flex-1 flex flex-col items-center justify-center px-6">` to `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">`.
- **Main Wrapper (Campaign Not Found)**: Update `<main className="flex-1 flex flex-col items-center justify-center px-6">` to `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">`.
- **Main Wrapper (Auth/Success)**: Change `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">` to `<main className="flex-1 w-full py-10">` and wrap content in `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">`.

### 4. `src/components/CampaignParticipantClient.jsx` (Campaign Participant Component)
- Change `<main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">` to:
  ```jsx
  <main className="flex-1 w-full py-10 lg:py-16 flex items-center">
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
  ```

### 5. `src/app/c/[slug]/page.jsx` (Participant Route)
- Add the export `export const dynamic = 'force-dynamic';` at the top of the file to prevent dynamic data compilation issues or static page caching of database configuration errors during build time.

## Verification Requirements
1. Run `npm run build` from the project root.
2. Confirm the build compiles successfully without errors.
