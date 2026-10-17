## 2026-06-09T10:10:52Z

You are the Layout Alignment Worker. Your working directory is /Users/nikhil.agarwal/Projects/my_story_web_app/.agents/worker_m3_1.
Your task is to implement the Spacing, Padding, and Responsive Layout Alignment changes as described in the implementation plan: /Users/nikhil.agarwal/Projects/my_story_web_app/.agents/sub_orch_m3/plan.md.

Specifically, you need to:
1. Load and read the modern-web-guidance skill (/Users/nikhil.agarwal/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md) before starting any frontend editing.
2. Edit `src/app/page.js` to wrap the hero section under the standard max-w-7xl layout container using Pattern A (Full-Bleed Outer / Constrained Inner).
3. Edit `src/app/dashboard/page.jsx`:
   - Replace the duplicated header block inside the unauthenticated block with the `<DashboardHeader />` component.
   - Update the unauthenticated main tag wrapper to use standard padding/margins.
   - Update the authenticated main layout to use a full-bleed outer element and wrap children content in a max-w-7xl inner wrapper.
   - Adjust the card grid layout to use gap-6 instead of gap-8.
4. Edit `src/app/dashboard/campaign/[id]/page.jsx`:
   - Update the unauthorized and campaign-not-found main tag wrappers to use standard padding/margins.
   - Update the main authenticated layout to use full-bleed outer and max-w-7xl inner wrapper.
5. Edit `src/components/CampaignParticipantClient.jsx` to separate the layout wrappers and grid constraints cleanly.
6. Edit `src/app/c/[slug]/page.jsx` to add:
   ```javascript
   export const dynamic = 'force-dynamic';
   ```
   at the top of the file to prevent caching/compilation issues during builds.
7. Run the Next.js production build using `npm run build` in the project root to verify that your changes compile successfully without any syntax, import, or caching errors.
8. Document the changes and the build output inside your handoff.md report.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
