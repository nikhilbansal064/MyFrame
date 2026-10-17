# Original User Request

## Initial Request — 2026-06-09T15:35:50+05:30

We want to resolve several functional and UI/UX issues in the "My Story" web application, including dashboard optimistic updates, campaign editing, canvas watermark overlays, screenshot prevention, and global layout padding alignment.

Working directory: /Users/nikhil.agarwal/Projects/my_story_web_app
Integrity mode: development

## Requirements

### R1. Optimistic Deletion & Real-time State Updates
*   When an organizer deletes a campaign, the UI should immediately remove the campaign card from the dashboard state (optimistic update) rather than reloading the entire list from the database, creating an instantaneous response.

### R2. Campaign Editing Feature
*   Allow organizers to edit campaign details, including Name, Description, Dates (Start/End), and update the campaign Frame overlay in a dedicated modal.

### R3. Canvas Watermark Overlay
*   Render a text watermark displaying `"myStory"` in the bottom-right corner of the canvas with 10% padding when generating the final composited JPEG for download (Option A).

### R4. Screenshot Prevention Countermeasures
*   Implement standard client-side browser countermeasures to protect frame creations:
    *   Disable text and image selection/highlighting on the canvas.
    *   Disable the right-click context menu (`onContextMenu`) on the workspace canvas.
    *   Inject `@media print` CSS rules to hide the compositor and canvas when printing the page.

### R5. Spacing, Padding, and Responsive Layout Alignment
*   Resolve the visual inconsistencies between the full-width header (`DashboardHeader.jsx`) and the centered content grids. Add `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrappers to align all navbar and content panels on desktop.
*   Ensure all new layout modifications compile correctly without caching errors.

### R6. Third-Party Dependency Rule
*   Do NOT add any new pre-built package dependencies (such as external UI libraries, charting engines, or icons) without explicitly explaining the necessity and obtaining approval first.

## Acceptance Criteria

### Dashboard Interactions
- [ ] Deleting a campaign card removes it from the UI in under 100ms (optimistic UI update).
- [ ] The "Edit Campaign" Dialog updates the name, description, and dates, and reflects changes instantly on the dashboard without manual page reloads.

### Canvas Export & Security
- [ ] Exported JPEG images include the watermark `"myStory"` embedded in the bottom-right corner.
- [ ] Right-clicking the canvas or highlighting canvas elements is disabled.
- [ ] Triggering browser print hides the canvas compositor.

### Spacing & Alignments
- [ ] Dashboard headers, landing pages, and stats sections align perfectly under a unified `max-w-7xl` container grid on desktop.
- [ ] Production build (`npm run build`) runs and compiles successfully.
