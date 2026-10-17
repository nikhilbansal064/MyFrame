# Scope: Canvas Security & Watermark Export (Milestone 2)

## Architecture
- `src/components/LiveCanvasEditor.jsx`: Handles rendering of the interactive preview canvas and the offscreen high-resolution composite canvas for JPEG export.
- `src/app/globals.css`: Handles global styles and theme variables.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Watermark Rendering | Render "myStory" at (972, 972) using 24px sans-serif, rgba(0, 0, 0, 0.3) in the offscreen canvas during export. | none | PLANNED |
| 2 | Selection Prevention | Disable text/image selection/highlighting on the canvas. | none | PLANNED |
| 3 | Context Menu Prevention | Prevent right-click context menu on the canvas/workspace. | none | PLANNED |
| 4 | Print Hiding | Inject `@media print` rules in `globals.css` to hide the canvas and compositor when printing. | none | PLANNED |

## Interface Contracts
### LiveCanvasEditor ↔ globals.css
- Class `.canvas-compositor` added to the top-level element of `LiveCanvasEditor` is styled via `@media print` in `globals.css` to hide from print layouts.
- Class `.select-none` and specific CSS declarations in `globals.css` to disable selection/highlighting.
