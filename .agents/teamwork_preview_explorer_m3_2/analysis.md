# Layout Structure Analysis Report

**Date**: 2026-06-09T15:43:00+05:30  
**Target Files**:  
- `/src/app/dashboard/page.jsx`  
- `/src/app/dashboard/campaign/[id]/page.jsx`  
- `/src/components/DashboardHeader.jsx`  

---

## 1. Executive Summary
This report analyzes layout alignment and structure between the unified header (`DashboardHeader.jsx`) and the centered content grids in the main organiser dashboard page and the campaign analytics detail page. We identified three primary inconsistencies:
1. **Duplicated Header Block with Design Drift**: The unauthenticated (locked access) state of the dashboard page (`/dashboard`) hardcodes its own `<header>` element instead of rendering the reusable `<DashboardHeader />` component. This results in visual design differences (logo size, logo gradient, background shadow, title gradient, missing "Organiser" badge).
2. **Standard Alignment Wrapper Mismatch in Lockscreens / Error Screens**: The `<main>` container for unauthenticated views, unauthorized access views, and "campaign not found" views uses static padding (`px-6`) instead of standard responsive layout wrappers. This breaks alignment consistency on mobile viewports (where standard headers are padded at `px-4`) and large desktop viewports.
3. **Grid Spacing (Gap) Inconsistency**: Spacing sizes between different sections on the dashboard utilize different values (`gap-6` vs `gap-8`), leading to column misalignment on desktop views.

---

## 2. Direct Observations & Code Inconsistencies

### Finding 1: Duplicated Header Block & Design Drift
In `src/app/dashboard/page.jsx` (lines 255–265), the unauthenticated/lockscreen view renders its own header:
```jsx
255:       <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-purple-500/30 selection:text-white">
256:         <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
257:           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
258:             <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
259:               <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center">
260:                 <Sparkles className="w-4.5 h-4.5 text-white" />
261:               </div>
262:               <span className="text-lg font-bold text-white">My Story</span>
263:             </div>
264:           </div>
265:         </header>
```

However, the standard header component `/src/components/DashboardHeader.jsx` (lines 24–40) renders:
```jsx
24:     <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
25:       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
26:         {/* Brand Logo */}
27:         <div 
28:           className="flex items-center gap-2 cursor-pointer select-none" 
29:           onClick={() => router.push('/')}
30:         >
31:           <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
32:             <Sparkles className="w-4.5 h-4.5 text-white" />
33:           </div>
34:           <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-pink-400">
35:             My Story
36:           </span>
37:           <span className="text-xxs px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 font-bold uppercase tracking-wider">
38:             Organiser
39:           </span>
40:         </div>
```
* **Issues**:
  * Duplicated JSX blocks violate the DRY (Don't Repeat Yourself) principle.
  * Different brand colors (`from-purple-500 to-indigo-600` vs `from-purple-500 to-pink-600`).
  * Inconsistent sizes (`w-8 h-8` vs `w-9 h-9`).
  * Plain text (`text-white`) vs dynamic gradient and shadow clipping.
  * The "Organiser" role-specific badge is missing in the hardcoded version.

---

### Finding 2: Missing Layout Container Spacers in Lockscreen/Error Main Elements
The standard layout container for desktop pages uses the wrapper:
`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10`

However, the unauthenticated/unauthorized views bypass this configuration:
* **`src/app/dashboard/page.jsx` (line 267)**:
  ```jsx
  <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
  ```
* **`src/app/dashboard/campaign/[id]/page.jsx` (line 178)**:
  ```jsx
  <main className="flex-1 flex flex-col items-center justify-center px-6">
  ```
* **`src/app/dashboard/campaign/[id]/page.jsx` (line 205)**:
  ```jsx
  <main className="flex-1 flex flex-col items-center justify-center px-6">
  ```

* **Issues**:
  * Using static padding of `px-6` causes the page content to align differently on mobile viewports (where the header aligns to `px-4`).
  * On larger screen sizes, the lack of `max-w-7xl mx-auto` layout boundaries causes horizontal misalignment relative to the centered header components, even though the content is just a centered card.

---

### Finding 3: Inner Grid Gap Inconsistencies
* In `src/app/dashboard/page.jsx`, the overview cards use `gap-6` (line 347), while the campaigns listing card grid uses `gap-8` (line 414).
* In `src/components/DashboardStats.jsx`, the grids use `gap-6` (lines 216 & 249).
* **Issues**:
  * Using mismatched horizontal gaps (`gap-8` vs `gap-6`) results in nested columns ending at different offsets, breaking vertical desktop grid lines.

---

## 3. Implementation Plan & Proposed Code Fixes

### Proposal A: Integrate `<DashboardHeader />` in `/src/app/dashboard/page.jsx` (Unauth)
Modify the unauthenticated return block in `src/app/dashboard/page.jsx` to import and use `<DashboardHeader />`.

**Before (`src/app/dashboard/page.jsx`, line 253):**
```jsx
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-purple-500/30 selection:text-white">
        <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">My Story</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
```

**After:**
```jsx
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-purple-500/30 selection:text-white">
        <DashboardHeader />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
```

---

### Proposal B: Standardize Main Wrappers in `/src/app/dashboard/campaign/[id]/page.jsx` (Access Blocks)
Modify the error/lockscreen layouts in the campaign detail file to align boundaries with standard desktop viewports.

**Before (`src/app/dashboard/campaign/[id]/page.jsx`, line 174):**
```jsx
  if (!user || unauthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
```

**After:**
```jsx
  if (!user || unauthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">
```

**Before (`src/app/dashboard/campaign/[id]/page.jsx`, line 201):**
```jsx
  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
```

**After:**
```jsx
  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">
```

---

### Proposal C: Standardize Desktop Grid Gaps
Standardize the main listing grid in `src/app/dashboard/page.jsx` to use a `gap-6` spacing, aligning it with both the overview cards and the telemetry widgets inside `DashboardStats`.

**Before (`src/app/dashboard/page.jsx`, line 414):**
```jsx
            /* Card Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
```

**After:**
```jsx
            /* Card Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```
