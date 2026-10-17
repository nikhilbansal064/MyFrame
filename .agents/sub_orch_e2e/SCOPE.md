# Scope: E2E Testing Track

## Architecture
- Playwright E2E testing framework.
- Base URL: `http://localhost:3000`.
- Target Features:
  1. Dashboard Interactions (Optimistic deletion, Edit Campaign Dialog & immediate update).
  2. Canvas Security (Right-click prevention, selection disabled, `@media print` hidden compositor).
  3. Watermark Display ("myStory" bottom-right with 10% padding on JPEG export).
  4. Spacing & Responsive Layout Alignment (Dashboard header, landing page, stats max-w-7xl container alignment).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create TEST_INFRA.md | Global documentation of test infrastructure and design. | None | PLANNED |
| 2 | Implement Tier 1-4 Playwright Tests | Expand/create tests in `tests/` covering 49 test cases. | None | PLANNED |
| 3 | E2E Execution & Verification | Run tests via worker, check outputs. | M2 | PLANNED |
| 4 | Publish TEST_READY.md | Signal testing readiness to parent orchestrator. | M3 | PLANNED |

## Interface Contracts
- Tests must use existing Playwright config (`playwright.config.js`).
- Test files must reside under `tests/` directory.
- Test runner command: `npx playwright test`.

## Decomposed Test Cases (4 Tiers)

### Feature 1: Dashboard Interactions
- **Tier 1: Feature Coverage**
  1. Deletion immediately removes campaign card from DOM (under 100ms).
  2. Deletion does not trigger full page reload.
  3. Edit Campaign modal opens on clicking edit button.
  4. Campaign Edit form updates name/description/dates, changes reflected instantly on dashboard.
  5. Modal closes upon successful submit.
- **Tier 2: Boundary & Corner Cases**
  6. Attempting to save an edit with an empty campaign title shows validation message.
  7. Campaign description exceeding 300 characters is rejected or truncated.
  8. Start date later than end date shows date validation error.
  9. Campaign card handles long title/description gracefully without layout breaking.
  10. Closing edit modal without saving (e.g. clicking backdrop, clicking Close/Cancel) discards changes.

### Feature 2: Canvas Security
- **Tier 1: Feature Coverage**
  11. Right-click on the canvas prevents default context menu.
  21. Selection/highlighting is disabled on the canvas via CSS properties (`user-select: none`).
  31. Standard text highlighting drag does not highlight or select canvas elements.
  41. `@media print` CSS rules hide the canvas compositor and workspace canvas when printing.
  51. Drag/drop of external images onto canvas without upload input is ignored or prevented.
- **Tier 2: Boundary & Corner Cases**
  61. Selecting text adjacent to canvas doesn't leak highlight into canvas area.
  71. Right-clicking components near the canvas (e.g. zoom controls) still opens the standard context menu (isolation check).
  81. Printing while image is loading still hides the compositor/canvas elements.
  91. Right-click context menu is disabled even when holding modifier keys (Shift/Ctrl + Click).
  101. Selection is disabled even when double-clicking or triple-clicking within the workspace.

### Feature 3: Watermark Display
- **Tier 1: Feature Coverage**
  111. Clicking "Download Branded Image" initiates export process.
  121. Exported image has correct MIME type (image/jpeg).
  131. Exported image includes `"myStory"` watermark text.
  141. Watermark is positioned in the bottom-right corner.
  151. Watermark has 10% padding from the edges (aligned precisely at x=972, y=972 on 1080x1080 canvas).
- **Tier 2: Boundary & Corner Cases**
  161. Watermark is drawn with 24px sans-serif font and fill color rgba(0, 0, 0, 0.3).
  171. Export succeeds even if the user uploaded image is extremely small (e.g. 10x10) or large (e.g. 4000x4000).
  181. Watermark remains clearly visible (low opacity black text) regardless of background frame color/brightness.
  191. Watermark dimensions do not scale up or down based on client zoom levels during download.
  201. Exporting twice consecutively applies watermark correctly both times without duplicating or offsetting.

### Feature 4: Spacing & Responsive Layout Alignment
- **Tier 1: Feature Coverage**
  211. DashboardHeader has container with class `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
  221. Landing page layout has container with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` alignment.
  231. Dashboard content grid is centered and aligned under the same `max-w-7xl` container.
  241. Stats panels are wrapped in `max-w-7xl` container.
  251. Alignments align perfectly on desktop viewports (1280px+).
- **Tier 2: Boundary & Corner Cases**
  261. Padding behaves correctly (px-4 on mobile, sm:px-6 on tablet, lg:px-8 on desktop).
  271. Layout does not horizontal-scroll (overflow-x) on small devices (320px width).
  281. Dashboard stats graphs scale dynamically within the `max-w-7xl` grid limits.
  291. Header navigation links wrap or hide behind responsive menu on mobile without pushing out layout bounds.
  301. Landing page CTA buttons align perfectly within the max-w-7xl bounds.

### Tier 3: Cross-Feature Combinations
- **Pairwise Coverage**
  311. **Edit + Layout**: Open Edit Dialog on dashboard, check if the dialog container/modal aligns within standard viewport/max-w-7xl grid, and closing it maintains dashboard layout grid alignment.
  321. **Security + Watermark**: While canvas has right-click and selection disabled, participant downloads the image and checks if watermark is present in the JPEG export (ensures security measures do not interfere with canvas rendering or exporting).
  331. **Deletion + Layout**: Optimistically delete a campaign card; dashboard layout grid adjusts/reflows immediately without breaking page margins or alignment.
  341. **Watermark + Layout**: Select high-resolution frame/image, download branded image; check if layout alignment of the page remains intact during composition and download process.

### Tier 4: Real-World Application Scenarios
- **Application Scenarios**
  351. **Scenario 1: Full Campaign Creation and Management Flow**: Organizer signs in, creates a campaign, sees card on dashboard. Opens Edit Dialog, changes title and date, clicks Save, confirms changes reflect immediately. Finally, deletes the campaign, confirming it disappears in <100ms without reload.
  361. **Scenario 2: Participant Image Customization & Secure Export**: Participant navigates to campaign page, uploads a photo, adjusts zoom slider. Attempts to select canvas text or right-click canvas (both are prevented). Prints the page to PDF (verify print stylesheets hide canvas). Finally, downloads the branded JPEG and verifies the "myStory" watermark exists at bottom-right with 10% padding.
  371. **Scenario 3: Multi-Campaign Dashboard Coordination**: Organizer manages multiple campaigns. Edits one campaign and deletes another. Verifies the dashboard layout reflows, and all elements remain centered within the `max-w-7xl` bounds on desktop.
  381. **Scenario 4: Mobile to Desktop Layout Transitions**: Verify layout alignment, paddings, and menu responsiveness transition seamlessly from mobile (375px) to desktop (1280px) viewports across the Landing Page, Dashboard, and Stats sections.
  391. **Scenario 5: Empty State to Active Dashboard Transition**: Organizer starts with an empty dashboard, layout remains perfectly aligned with max-w-7xl placeholder. Add first campaign, dashboard immediately renders card in grid, edit details, verify instant updates without reload.
