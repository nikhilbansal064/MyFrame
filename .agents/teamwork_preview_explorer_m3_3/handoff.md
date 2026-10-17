# Handoff Report — Layout Explorer 3

## 1. Observation
The following file paths, line numbers, and styling configurations were inspected:

- **DashboardHeader Component** (`src/components/DashboardHeader.jsx:25`):
  ```javascript
  25:       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
  ```
- **CampaignParticipantClient Component** (`src/components/CampaignParticipantClient.jsx:121` & `src/components/CampaignParticipantClient.jsx:136`):
  ```javascript
  121:         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
  ...
  136:       <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
  ```
- **Landing Page** (`src/app/page.js:59`, `src/app/page.js:106`, `src/app/page.js:232`, `src/app/page.js:314`):
  ```javascript
  59:         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
  ...
  106:       <section className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
  ...
  232:         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  ...
  314:         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
  ```
- **Organiser Dashboard Page** (`src/app/dashboard/page.jsx:328`):
  ```javascript
  328:       <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
  ```
- **Campaign Analytics Page** (`src/app/dashboard/campaign/[id]/page.jsx:230`):
  ```javascript
  230:       <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
  ```
- **API log route** (`src/app/api/log-event/route.js:13`):
  Uses `POST` method:
  ```javascript
  13: export async function POST(request) {
  ```
- **Dynamic Campaign Route** (`src/app/c/[slug]/page.jsx`):
  Uses Server-Side dynamic rendering fetching data, but lacks explicit dynamic route indicators like:
  ```javascript
  export const dynamic = 'force-dynamic';
  ```

---

## 2. Logic Chain
1. **Container Consistency:** Every primary desktop header, layout container, main grid, and section inherits the identical responsive padding and max-width declaration: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
2. **Stats Integration:** Since `DashboardStats.jsx` is nested inside `/dashboard/campaign/[id]/page.jsx`'s `<main>` element, it automatically aligns with the `max-w-7xl` layout without requiring duplicate container wrappers.
3. **SSG Build Risks:** Next.js 15 App Router attempts static generation of dynamic routes at build time. Since `[slug]` fetching depends on process environment variables (Supabase URL/Key), missing keys during CI/CD builds will cause Next.js to pre-render the static error layout, caching a broken state.
4. **Cache Prevention:** Adding `export const dynamic = 'force-dynamic'` forces SSR at request-time, ensuring dynamic resolution of campaigns.

---

## 3. Caveats
- Direct Supabase queries in Server Components are not cached because request memoization is specific to the `fetch` API.
- Local Storage acts as a sandbox mode during database connection failures but cannot sync data across multiple client devices.

---

## 4. Conclusion
The desktop layout is perfectly unified under the `max-w-7xl` grid container system across landing pages, dashboards, headers, and stats pages. To avoid Next.js build-time pre-rendering caching errors, adding `export const dynamic = 'force-dynamic'` to the dynamic segment `/c/[slug]/page.jsx` is highly recommended.

---

## 5. Verification Method
1. Inspect the layout elements in the DOM on desktop resolution to ensure all primary container boundaries align at the same vertical start and end markers (matching `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`).
2. Run `npm run build` or `npx next build` in the workspace without database environment variables. Observe whether dynamic routing segments build successfully as request-time dynamics without generating pre-cached error states.
