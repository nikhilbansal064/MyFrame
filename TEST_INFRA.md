# Test Infrastructure Document

This document outlines the testing strategy, environment configuration, test harness structure, and execution rules for the 'My Story' web application.

---

## 1. Testing Framework Overview

The test suite is built on **Playwright**, a modern end-to-end (E2E) testing framework designed for reliable web testing across multiple browsers and viewports.

### Core Configurations (`playwright.config.js`)
*   **Test Directory**: `./tests`
*   **Base URL**: `http://localhost:3000`
*   **Execution mode**: Fully parallelized across multiple workers to ensure high-speed feedback.
*   **Target Browsers**: Chromium, Firefox, WebKit (Desktop + Mobile configurations).
*   **Web Server integration**: Automatically triggers `npm run dev` and awaits endpoint healthiness before test launch.

---

## 2. 4-Tier Test Strategy

The test cases are organized into a 4-tier hierarchy to ensure both modular validation and robust real-world coverage.

### Tier 1: Feature Coverage (Functional Tests)
Ensures core user flows work when interacting with the dashboard, canvas, downloading images, and loading landing components.
*   *Feature 1 (Dashboard)*: Optimistic updates on campaign deletion; launching campaign creation / editing modals.
*   *Feature 2 (Canvas Security)*: Prevent default on right-clicks; ensure selection highlights are disabled; verify print media stylesheets hide critical editor containers.
*   *Feature 3 (Watermark Display)*: Verify download triggers; verify that the exported JPEG includes `"myStory"` watermark text.
*   *Feature 4 (Layout Spacing)*: Container check (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) on the landing page, dashboard, and stats page.

### Tier 2: Boundary & Corner Cases (Stress & Constraint Tests)
Validates system limits, validation rules, input constraints, and layout edge cases.
*   *Title Length & Expiry Checks*: Validates date constraint logic (start date > end date) and title fields.
*   *Canvas Security Edge Cases*: Prevent selection leaks, maintain right-click prevention under Shift/Ctrl modifiers, and ensure print stylesheets remain applied during content loads.
*   *Watermark Opacity/Formatting*: Validates that watermark styles use exactly `24px sans-serif` and `rgba(0, 0, 0, 0.3)`.
*   *Viewport Paddings*: Confirm responsive styling holds correctly at 320px (no horizontal overflow), 768px, and 1280px+.

### Tier 3: Cross-Feature Combinations (Pairwise Verification)
Verifies that features do not conflict with one another when triggered simultaneously or sequentially.
*   *Edit + Layout*: Ensure that editing does not impact standard max-width spacing or push dashboard cards out of alignment.
*   *Security + Watermark*: Verify that disabling right-clicks and selection does not affect the canvas rendering context or block the JPEG download.
*   *Deletion + Layout*: Dashboard grid reflows immediately when card is removed.

### Tier 4: Real-World Application Scenarios (Integration Flows)
Simulates complete user journeys from start to finish.
*   *Scenario 1 (Organizer Journey)*: Complete cycle of logging in, creating, editing, and deleting campaigns.
*   *Scenario 2 (Participant Journey)*: Complete cycle of visiting participant page, uploading a selfie, adjusting canvas zoom, verifying security block, and downloading watermarked composite.
*   *Scenario 5 (Empty State to Active)*: Verifying transitions and max-width placeholder rendering when zero campaigns exist.

---

## 3. Test Cases Directory & Coverage Mapping

The complete set of 49 test cases is implemented in `tests/e2e-detailed.spec.js`. Each test case is mapped back to the system PRD and acceptance criteria.

| Test Case IDs | Feature Area | Focus |
|---|---|---|
| `1` - `10` | Dashboard Interactions | Optimistic update, validation warnings, edit form integration, modal state. |
| `11` - `101` | Canvas Security | Context menu block, selection prevention, print media hiding. |
| `111` - `201` | Watermark Display | JPEG export, positioning, padding, font rendering, double-download. |
| `211` - `301` | Layout Alignment | Responsive wrapper alignment, container margins, mobile navigation, no-overflow. |
| `311` - `341` | Cross-Feature | Pairwise interaction checks. |
| `351` - `391` | Real-World Scenarios | End-to-end organizer and participant journeys. |

---

## 4. How to Run the Tests

### Prerequisite Setup
Make sure node dependencies and browser binaries are installed:
```bash
npm install
npx playwright install
```

### Execution Commands

*   **Run all E2E tests**:
    ```bash
    npx playwright test tests/e2e-detailed.spec.js
    ```
*   **Run a specific test case**:
    ```bash
    npx playwright test -g "351"
    ```
*   **View test reports**:
    ```bash
    npx playwright show-report
    ```
