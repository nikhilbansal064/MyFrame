# Orchestration Plan - My Story Web App Improvements

## Approach & Pattern
We are utilizing the **Project Pattern** with **Dual Tracks** (Implementation Track and E2E Testing Track) running in parallel.
- **Orchestrator Role**: Acts as the team manager, decomposer, dispatcher, and aggregator. Does not write code or run builds directly.
- **E2E Testing Track**: Derives opaque-box tests from requirements, builds test infrastructure, and publishes `TEST_READY.md`.
- **Implementation Track**: Implements features across multiple milestones, runs builds/tests, and passes the E2E tests before adversarial coverage hardening.

## Phase 1: Test Track Scaffold & Initial Milestones Planning
- Launch the **E2E Testing Track Orchestrator** to establish the tests covering:
  - Optimistic deletion (verifying DOM removal in <100ms)
  - Campaign editing details (submitting edit modal reflects instantly)
  - Canvas security (right-click prevented, selection disabled, `@media print` hidden)
  - Watermark presence on downloaded images (verifying canvas watermark text generation logic)
  - Spacing/alignment constraints (`max-w-7xl` containers)
- Launch the **Implementation Sub-orchestrators** for the features.

## Milestones & Work Items
1. **Milestone 1: Dashboard Interactions (Optimistic UI & Edit Modal)**
   - Dashboard optimistic update on campaign deletion.
   - "Edit Campaign" dedicated modal dialog on dashboard, supporting Name, Description, Dates (Start/End), and updating Frame overlay (transparent PNG file).
   - Real-time updates without page reloads.
2. **Milestone 2: Canvas Security & Watermark Export**
   - LiveCanvasEditor: right-click prevention on canvas.
   - LiveCanvasEditor: select-none to disable canvas highlight.
   - Print media CSS injection: hide canvas compositor.
   - JPEG export: composite `"myStory"` text watermark at bottom-right corner with 10% padding (x=972, y=972 on 1080x1080 canvas).
3. **Milestone 3: Spacing & Responsive Layout Alignment**
   - Add unified `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` desktop container grids for Landing Page, Dashboard, and Stats sections.
4. **Milestone 4: E2E Verification & Adversarial Hardening (Tier 5)**
   - Pass 100% of E2E tests.
   - Execute Forensic Audit checks for clean integrity validation.

## Roster & Team Configuration
- **Explorer**: teamwork_preview_explorer (for analysis & strategy)
- **Worker**: teamwork_preview_worker (for changes & build verification)
- **Reviewer**: teamwork_preview_reviewer (for verification of code changes)
- **Challenger**: teamwork_preview_challenger (for adversarial tests & validation)
- **Auditor**: teamwork_preview_auditor (for forensic audits)
