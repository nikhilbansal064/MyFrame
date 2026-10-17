## 2026-06-09T15:39:03Z
You are the QA Engineer. Your task is to implement the E2E test suite for the 'My Story' web application.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Key Objectives:
1. Create the detailed `TEST_INFRA.md` at the project root. Use the template provided in instructions.
2. Create the Playwright test file `/Users/nikhil.agarwal/Projects/my_story_web_app/tests/e2e-detailed.spec.js` implementing the 49 test cases covering all 4 tiers mapped to the 4 key features (Dashboard Interactions, Canvas Security, Watermark Display, and Spacing & Layout Alignment).
3. Execute the Playwright tests via command line (`npx playwright test`) and capture/report the results. Note: some tests might fail initially since the implementation track is not yet complete. This is expected, but we need the tests to run and compile correctly.
4. Create `TEST_READY.md` at the project root with the test runner command, coverage summary, and feature checklist.

### Technical Guidance for Test Implementation:
- **Dashboard Interactions**:
  - Seed campaigns in `localStorage` with `mystory_campaigns` key before loading pages.
  - Bypass authentication by triggering Dev Mode (clicking bypass or simulating auth context bypass).
  - Test **Optimistic Deletion**: mock or delay the deletion API call (using Playwright `page.route` to intercept `DELETE` or delay database fetches), trigger delete, and assert that the card is removed from the UI in under 100ms before the response resolves.
  - Test **Campaign Editing**: open edit campaign modal, enter new values (title, description, start/end dates, upload a frame file), submit, and assert changes are reflected instantly on the dashboard card without page reloads.
- **Canvas Security**:
  - Right-click canvas: trigger contextmenu event on `#workspace-canvas` or `canvas` and assert `preventDefault` was called (i.e. context menu did not open).
  - Selection: check that canvas or its wrapper has `user-select: none` CSS.
  - Print stylesheet: check for `@media print` CSS rules in stylesheets that set `display: none` (or equivalent) for the workspace canvas or compositor.
- **Watermark Display**:
  - Load a participant page (seed a mock active campaign in `localStorage` first).
  - Upload a mock photo asset (create a small mock image file if needed, e.g., in `tests/assets/mock-avatar.jpg` or write one dynamically).
  - Intercept canvas rendering: inject JS into the page (using `page.addInitScript`) to spy/wrap `CanvasRenderingContext2D.prototype.fillText` and properties like `font` and `fillStyle`.
  - Trigger "Download Branded Image" and verify that `fillText` is called with `"myStory"`, coordinates `(972, 972)` on a 1080x1080 canvas, font contains `24px sans-serif`, and fill color is `rgba(0, 0, 0, 0.3)`.
- **Layout Alignments**:
  - Verify container elements on Landing Page, Dashboard Page, and Stats Page have classes `max-w-7xl`, `mx-auto`, `px-4`, `sm:px-6`, `lg:px-8`.
  - Test layout at different viewports (mobile: 375px, tablet: 768px, desktop: 1280px).

Please write these files exactly at:
- `/Users/nikhil.agarwal/Projects/my_story_web_app/TEST_INFRA.md`
- `/Users/nikhil.agarwal/Projects/my_story_web_app/tests/e2e-detailed.spec.js`
- `/Users/nikhil.agarwal/Projects/my_story_web_app/TEST_READY.md`

Run the tests using the appropriate command and include the command output in your handoff report.
