# Handoff Report — Explorer 1

## 1. Observation
I investigated the following files to identify the design pattern and layout for canvas actions and styles:
- **`src/components/LiveCanvasEditor.jsx`**:
  - Direct composite generation is located inside `handleDownload` (lines 149-205):
    ```javascript
    149:   const handleDownload = async () => {
    150:     const canvas = canvasRef.current;
    151:     if (!canvas || !photo || !frameLoaded) return;
    ...
    161:         const exportCanvas = document.createElement('canvas');
    162:         exportCanvas.width = 1080;
    163:         exportCanvas.height = 1080;
    164:         const exportCtx = exportCanvas.getContext('2d');
    ```
  - The canvas container wrapper (line 223) includes the `select-none` Tailwind utility:
    ```javascript
    222:       {/* Editor Main Canvas Frame wrapper */}
    223:       <div 
    224:         className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
    ```
  - Interactive handlers on the container (lines 224-230) capture drag/mouse/touch inputs:
    ```javascript
    224:         onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
    225:         onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
    226:         onMouseUp={handleDragEnd}
    227:         onMouseLeave={handleDragEnd}
    228:         onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
    ...
    ```
  - Context menu handling (`onContextMenu`) is completely absent on the canvas wrapper, preview `<canvas>`, and overlay image `<img>` elements.
  - The `<canvas>` element (line 233) does not have any `select-none` class explicitly:
    ```javascript
    233:         <canvas 
    234:           ref={canvasRef} 
    235:           width={1080} 
    236:           height={1080}
    237:           className="absolute inset-0 w-full h-full z-10 cursor-move"
    238:         />
    ```
- **`src/app/globals.css`**:
  - Theme styles are defined under the `:root` pseudo-class (lines 3-32) and map to Tailwind v4 theme configurations (lines 34-53):
    ```css
    3: :root {
    4:   /* Cosmic Obsidian Dark (60% background/base) */
    5:   --background: 240 10% 2%;
    6:   --foreground: 0 0% 98%;
    ```
  - There is currently no `@media print` query in the CSS file.

## 2. Logic Chain
- Since `handleDownload` constructs the exported image layer-by-layer on an offscreen canvas (`exportCanvas`), adding a watermark drawing step (e.g. `exportCtx.fillText(...)`) right after drawing the frame overlay and before generating `dataUrl` will ensure the watermark is permanently encoded into the downloaded file without modifying the user's active viewport preview.
- To prevent users from pulling context menus (and accessing standard browser choices to download underlying source files or layers) we must intercept the context menu event on the layout container. Since right-click bubbles up, adding `onContextMenu={(e) => e.preventDefault()}` on the wrapper element, raw `<canvas>`, and overlay `<img />` will prevent this vulnerability.
- To eliminate any unwanted text-selection highlights or focus overlays on mobile touch events, we should explicitly apply Tailwind's `select-none` and `outline-none` classes directly to the `<canvas>` tag and configure a `-webkit-tap-highlight-color: transparent` styling class on the wrapper container.
- For print media layout control, because `@media print` is standard CSS for controlling visibility during print commands, adding a query block that targeting interactive components (buttons, file inputs, canvases, and panel wrappers) ensures that when printing is triggered (e.g. `window.print()`), these components are hidden.

## 3. Caveats
- Drawing text watermarks requires adjusting font family, sizes, colors, and alignments to ensure contrast on various backgrounds.
- The offscreen canvas generation depends on `crossOrigin="anonymous"` configurations to avoid "tainted canvas" security errors. If the user loads an image source from an external URL that does not allow CORS, compilation will fail.
- Printing layouts may vary by browser; testing is required to verify that the canvas hidden area collapses correctly rather than leaving blank white voids.

## 4. Conclusion
- A precise roadmap has been designed to implement context menu overrides, secure watermarks upon download, and prevent double-tap highlights, alongside a printing media query layout rule. The implementation plan details how to execute these changes without breaking existing functionality.

## 5. Verification Method
- **Files to Inspect**:
  - `src/components/LiveCanvasEditor.jsx` (Check `handleDownload`, canvas element attributes, and context menu handlers).
  - `src/app/globals.css` (Check the presence of `@media print` overrides).
- **Manual Verification**:
  1. Trigger right-click/long-press on the canvas to ensure context menus do not open.
  2. Perform drag operations to verify that tap highlight colors and selections do not display.
  3. Export a branded image to verify that the watermark is cleanly drawn in the bottom-right corner.
  4. Run print preview (e.g., CMD+P on macOS Chrome) to confirm the canvas editor and controls do not appear in the printed view.
