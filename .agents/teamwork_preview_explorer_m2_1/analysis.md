# Milestone 2: Canvas Security, Watermarking, and Printing Investigation

## 1. Analysis of `src/components/LiveCanvasEditor.jsx`

### Image Composite Generation and Download Flow
- **Location**: The composite download logic is implemented inside the `handleDownload` asynchronous function (lines 149–205).
- **Process**:
  1. Activates state `setDownloading(true)` and invokes `onDownloadStart()`.
  2. Uses `setTimeout` with a 100ms delay to schedule compilation.
  3. Creates an in-memory DOM element `const exportCanvas = document.createElement('canvas')` with dimensions `1080x1080`.
  4. Obtains a 2D context, fills a white background (`#ffffff`), and applies translations/scaling using the current `panX`, `panY`, and `zoom` states to center and draw the uploaded photo (`exportCtx.drawImage(photo, -photo.width / 2, -photo.height / 2)`).
  5. Renders the preloaded overlay frame image (`frameImgRef.current`) on top, covering the full `1080x1080` dimensions.
  6. Compiles the canvas to a JPEG data URL via `exportCanvas.toDataURL('image/jpeg', 0.92)`.
  7. Triggers a programmatic download using a dynamically created and clicked `<a>` element, then removes it.
- **Proposed Watermarking Plan**:
  - To incorporate watermarks on export, we should draw watermark text or a branding graphic directly onto the `exportCtx` after drawing the frame overlay (step 5) but before calling `toDataURL` (step 6).
  - Example:
    ```javascript
    // Draw watermark text at the bottom-right corner
    exportCtx.save();
    exportCtx.font = 'bold 24px sans-serif';
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    exportCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    exportCtx.shadowBlur = 4;
    exportCtx.textAlign = 'right';
    exportCtx.fillText('My Story Campaign', 1040, 1040);
    exportCtx.restore();
    ```

### Context Menu Handling
- **Observation**: Currently, the context menu is not handled anywhere in `LiveCanvasEditor.jsx`. Right-clicking on the canvas container wrapper or the overlays triggers standard browser context menus, which allows users to inspect or extract raw image layers (e.g., saving the PNG frame overlay).
- **Proposed Security Plan**:
  - Prevent context menu events on the editor wrapper, preview canvas, and frame overlay images by attaching an `onContextMenu={(e) => e.preventDefault()}` event listener.
  - Apply this handler on:
    - The outer `div` wrapper (line 223)
    - The preview `<canvas>` (line 233)
    - The preview frame `<img>` (line 242)

### Selection and Highlight Prevention
- **Observation**: The outer wrapper possesses the CSS class `select-none` (line 223), which prevents text selection. However, tap-highlighting on mobile devices, focus outlines, and drag selection highlights can still affect usability.
- **Proposed Prevention Plan**:
  - Apply Tailwind's `select-none` and `outline-none` classes to the `<canvas>` element (line 233).
  - Add the custom utility to disable default browser mobile tap feedback highlight (`-webkit-tap-highlight-color: transparent`) to the canvas wrapper styles.

---

## 2. Analysis of `src/app/globals.css` and Print Styles

### Theme Styles Location
- CSS Custom Properties are defined inside the `:root` block (lines 3–32) for properties like colors (`--background`, `--foreground`, `--card`, `--primary`, `--accent`), glassmorphic borders (`--border-glass`, `--border-glass-hover`), and glowing colors (`--primary-glow`).
- Tailwind v4 integration maps these properties to colors inside the `@theme` block (lines 34–53).

### Print Media Hiding Plan
- To hide the interactive canvas, upload controls, and action panels when a user tries to print the page, we should apply styling overrides specifically for print media.
- **Proposed CSS Changes**:
  - Add a `@media print` query to `src/app/globals.css`:
    ```css
    @media print {
      /* Hide all elements that have the 'no-print' class, plus any canvas editor controls */
      .no-print,
      canvas,
      input,
      button,
      .glass-panel,
      [role="dialog"] {
        display: none !important;
      }

      /* Adjust body background for ink saving */
      body {
        background: #ffffff !important;
        color: #000000 !important;
        background-image: none !important;
      }
    }
    ```
  - Alternatively/additionally, utilize Tailwind v4's built-in `print:` modifier. We can apply `print:hidden` directly to the outer wrapper `div` of the `LiveCanvasEditor` component in `src/components/LiveCanvasEditor.jsx` (line 208) to hide the entire editor workspace seamlessly during printing.

---

## 3. Precise Proposed Change Plan (Non-Destructive)

### Phase 1: `src/components/LiveCanvasEditor.jsx`
1. **Prevent Context Menus & Selection Highlights**:
   - Add `onContextMenu={(e) => e.preventDefault()}` to the outer wrapper container `div` (line 223).
   - Add `onContextMenu={(e) => e.preventDefault()}` to the preview `<canvas>` (line 233) and the DOM-floating frame `<img>` (line 241).
   - Add `select-none outline-none` classes to the `<canvas>` element (line 237).
2. **Add Watermark Drawing Step to Export**:
   - Modify the `handleDownload` callback (lines 177–181) to draw an optional watermark overlay onto the offscreen `exportCtx` before exporting the JPEG:
     ```javascript
     // 3. Composite preloaded frame PNG overlay exactly on top spanning 1080x1080
     const frameImg = frameImgRef.current;
     if (frameImg) {
       exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
     }

     // 4. Draw export watermark overlay
     exportCtx.save();
     exportCtx.font = 'bold 20px sans-serif';
     exportCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
     exportCtx.textAlign = 'right';
     exportCtx.textBaseline = 'bottom';
     exportCtx.fillText('Created with My Story', 1050, 1050);
     exportCtx.restore();
     ```
3. **Integrate print-hiding utility class**:
   - Add `no-print` or `print:hidden` to the root container of `LiveCanvasEditor` (line 208).

### Phase 2: `src/app/globals.css`
1. **Define Print Media Queries**:
   - Append standard `@media print` rules at the end of `globals.css` to hide editor controls, buttons, forms, and background gradients to preserve formatting and ink.
   - Create a generic `.no-print` class mapping to `display: none !important;` under `@media print`.
