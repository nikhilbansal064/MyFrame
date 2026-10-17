# Handoff Report: Canvas Security & Watermark Export Requirements (Milestone 2)

## 1. Observation
- **Original Request Requirements (from `ORIGINAL_REQUEST.md`)**:
  - Line 19: `Render a text watermark displaying "myStory" in the bottom-right corner of the canvas with 10% padding when generating the final composited JPEG for download (Option A).`
  - Lines 22-25:
    ```markdown
    *   Implement standard client-side browser countermeasures to protect frame creations:
        *   Disable text and image selection/highlighting on the canvas.
        *   Disable the right-click context menu (`onContextMenu`) on the workspace canvas.
        *   Inject `@media print` CSS rules to hide the compositor and canvas when printing the page.
    ```
- **LiveCanvasEditor Component File (`src/components/LiveCanvasEditor.jsx`)**:
  - Lines 160-184 details the download offscreen canvas compilation workflow:
    ```javascript
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');
    ...
    exportCtx.drawImage(photo, -photo.width / 2, -photo.height / 2);
    ...
    exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
    ...
    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    ```
  - Lines 222-231 contains the main canvas wrapper:
    ```javascript
    <div 
      className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
      onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
      ...
    >
    ```
    There is no `onContextMenu` handler anywhere in this file.
  - Lines 233-238 contains the canvas preview tag:
    ```jsx
    <canvas 
      ref={canvasRef} 
      width={1080} 
      height={1080}
      className="absolute inset-0 w-full h-full z-10 cursor-move"
    />
    ```
    There is no `select-none` class on the `<canvas>` element itself.
- **Global Theme & Stylesheet File (`src/app/globals.css`)**:
  - Theme variables are configured in `:root` (lines 3-32) and the `@theme` block (lines 34-53).
  - There are no `@media print` rules currently defined anywhere in the file.

---

## 2. Logic Chain
1. **Watermark Coordinates**: The export canvas resolution is 1080x1080. A 10% padding requirement means offset from the bottom-right corner is `1080 * 0.10 = 108px`. Therefore, target coordinates for the bottom-right corner watermark text are `X = 1080 - 108 = 972` and `Y = 1080 - 108 = 972`.
2. **Watermark Integration Point**: To ensure the watermark overlays both the base photo and the frame border design, it should be drawn using `exportCtx.fillText` and `exportCtx.strokeText` directly after `exportCtx.drawImage(frameImg, 0, 0, 1080, 1080)` (the frame overlay step) and prior to `exportCanvas.toDataURL(...)` in the `handleDownload` function.
3. **Context Menu Prevention**: Right-click context menus are default browser behaviors that can be stopped by intercepting the `onContextMenu` react event and calling `e.preventDefault()`. To protect both the interactive canvas element (z-index 10) and the floating frame image (z-index 20), this handler should be added to their parent wrapper `div`.
4. **Selection Highlights Prevention**: The wrapper `div` has `select-none`, but to avoid edge-cases on mobile browsers and custom desktop setups, adding `select-none` directly to the `<canvas>` and frame `<img>` tags guarantees user-select protection.
5. **Print Countermeasure**: To hide the live canvas compositor when printing, we should add a `@media print` stylesheet rule. Adding a custom semantic class `.print-hidden` to the root `div` of `LiveCanvasEditor` and mapping it in `globals.css` with `display: none !important;` provides clean decoupling.

---

## 3. Caveats
- Browser-based screenshot commands (e.g. Snipping tool, macOS Cmd+Shift+4) and OS-level screenshot triggers cannot be blocked by client-side JavaScript/CSS. Client-side screenshot prevention countermeasures (disabling select, context menu, print hiding) are deterrents but not bulletproof DRM.
- We assume that the watermark font and color do not need to be dynamic and can remain static (`myStory` in semi-transparent white text).

---

## 4. Conclusion
- A precise, low-risk plan of changes has been designed for canvas security and watermark export.
- It targets `LiveCanvasEditor.jsx` (adding context menu intercept, print classes, selection prevention class, and offscreen canvas text rendering) and `globals.css` (adding media query print overrides).
- It satisfies all Milestone 2 security and watermark export requirements without modifying code directly, respecting the Explorer role boundary.

---

## 5. Verification Method
- **Verification Plan**:
  1. Inspect `LiveCanvasEditor.jsx` around lines 177-182 to confirm code drawing the text watermark onto `exportCtx` before data export.
  2. Inspect the wrapper `div` of the canvas preview in `LiveCanvasEditor.jsx` to verify that `onContextMenu={(e) => e.preventDefault()}` is present.
  3. Inspect the root of `LiveCanvasEditor.jsx` to ensure `print-hidden` class exists.
  4. Inspect `src/app/globals.css` to confirm that `@media print { .print-hidden { display: none !important; } }` exists at the bottom of the file.
  5. Run `npm run build` to verify there are no compilation errors after code is modified.
