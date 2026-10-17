# Canvas Security and Watermark Export Requirements Investigation (Milestone 2)

## 1. Executive Summary
This report details the read-only investigation of the canvas security and watermark export requirements for Milestone 2. We identified the precise locations where changes must be made to integrate a `"myStory"` watermark overlay on image exports, disable canvas contextual actions and highlighting, and hide the interactive compositor workspace when printing. A clean, non-intrusive implementation plan is proposed below.

---

## 2. Technical Findings

### 2.1. File `src/components/LiveCanvasEditor.jsx`
1. **Image Composite Generation for Download**:
   - Location: `handleDownload` function, lines 149–205.
   - Mechanism: Creates a temporary offscreen canvas (`exportCanvas`) of logical dimensions `1080x1080` px. It translates, scales, and draws the user's photo (matching the preview transform states `zoom`, `panX`, and `panY`), draws the preloaded frame overlay image (`frameImgRef`), and exports the canvas content as a `image/jpeg` data URL (at `0.92` quality).
   - Watermark Insertion Point: Directly after line 181 (where the frame overlay is composited on `exportCtx`) and before line 184 (where `exportCanvas.toDataURL` is evaluated).

2. **Context Menu Prevention**:
   - Current State: No right-click protection is in place on either the container `div` or the inner canvas/images. Right-clicking allows the browser's default context menu to open, facilitating image extraction.
   - Recommended Solution: Bind `onContextMenu={(e) => e.preventDefault()}` to both the workspace wrapping `div` (line 222) and the `<canvas>` element (line 233) to prevent context menu display.

3. **Selection Highlight Prevention**:
   - Current State: The main container `div` (line 222) has `select-none` class which sets `user-select: none`. However, this is missing from the `<canvas>` element and the floating/preloaded overlay images. Highlighting, outline visual overlays, or selection markers can still occur on browser focus or drag actions.
   - Recommended Solution:
     - Add the `select-none` class to the `<canvas>` element.
     - Add `draggable="false"` to both `<img>` elements (lines 212 and 242) to prevent the frame template from being dragged out of the DOM.
     - Add `select-none` to the floating frame template image (line 242) as a double safeguard.

---

### 2.2. File `src/app/globals.css`
1. **Theme Styles Definition**:
   - Location: CSS variables are defined in the `:root` pseudo-class (lines 3–32).
   - Theme configuration mapping occurs in the `@theme` directive (lines 34–53), which is Tailwind v4’s modern design system configuration format.

2. **Print Hide Plan**:
   - Requirement: Hiding the canvas compositor and interactive elements when printing.
   - Recommended CSS Solution: Append a `@media print` query that targets a utility print class (or specifically `.canvas-compositor`) and sets its display to `none !important`.
   - Implementation:
     - Add the class name `.canvas-compositor` to the top-level outer `div` of `LiveCanvasEditor.jsx` (line 208).
     - Define the CSS rule in `globals.css` targeting `.canvas-compositor` within `@media print`.

---

## 3. Implementation Plan

### 3.1. Proposed Changes for `src/components/LiveCanvasEditor.jsx`

#### A. Add Watermark to Composite Export
Add the text watermark compilation code inside `handleDownload` (after drawing the frame overlay and before exporting to JPEG).

**Target Location**: Near line 182
```javascript
        // 3. Composite preloaded frame PNG overlay exactly on top spanning 1080x1080
        const frameImg = frameImgRef.current;
        if (frameImg) {
          exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
        }

        // --- ADDED WATERMARK ---
        // Render a text watermark displaying "myStory" in bottom-right corner with 10% padding (1080 * 0.10 = 108px)
        exportCtx.save();
        exportCtx.font = 'bold 36px sans-serif';
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        exportCtx.textAlign = 'right';
        exportCtx.textBaseline = 'bottom';
        // Add stroke backing for contrast/readability on light backgrounds
        exportCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        exportCtx.lineWidth = 4;
        exportCtx.strokeText('myStory', 972, 972); // 1080 - 108 = 972
        exportCtx.fillText('myStory', 972, 972);
        exportCtx.restore();
        // -----------------------

        // Export as JPEG (92% quality is standard industry balance of file-size vs crispness)
        const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
```

#### B. Enhance Interaction Security and Print Class Binding
Add class name `canvas-compositor`, right-click handlers, and selection preventions in the JSX tree.

**Target Locations**:
1. Top-level element (line 208):
   ```jsx
   // Before
   return (
     <div className="flex flex-col items-center gap-6 w-full max-w-[500px]">

   // After
   return (
     <div className="canvas-compositor flex flex-col items-center gap-6 w-full max-w-[500px]">
   ```

2. Preloaded overlay image (line 212):
   ```jsx
   // Before
   {frameUrl && (
     <img 
       ref={frameImgRef} 
       src={frameUrl} 
       crossOrigin="anonymous" 
       className="hidden" 
       alt="Preloaded Overlay Resource"
     />
   )}

   // After
   {frameUrl && (
     <img 
       ref={frameImgRef} 
       src={frameUrl} 
       crossOrigin="anonymous" 
       className="hidden" 
       alt="Preloaded Overlay Resource"
       draggable="false"
     />
   )}
   ```

3. Editor Main Canvas Frame Wrapper & Canvas element (line 222 & line 233):
   ```jsx
   // Before
   <div 
     className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
     onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
     onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
     onMouseUp={handleDragEnd}
     onMouseLeave={handleDragEnd}
     onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
     onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
     onTouchEnd={handleDragEnd}
   >
     {/* Underneath Interactive Canvas (1080x1080 logical size, styled responsive aspect-square) */}
     <canvas 
       ref={canvasRef} 
       width={1080} 
       height={1080}
       className="absolute inset-0 w-full h-full z-10 cursor-move"
     />

   // After (Disabling right-click context menu and adding canvas select-none)
   <div 
     className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
     onContextMenu={(e) => e.preventDefault()}
     onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
     onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
     onMouseUp={handleDragEnd}
     onMouseLeave={handleDragEnd}
     onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
     onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
     onTouchEnd={handleDragEnd}
   >
     {/* Underneath Interactive Canvas (1080x1080 logical size, styled responsive aspect-square) */}
     <canvas 
       ref={canvasRef} 
       width={1080} 
       height={1080}
       onContextMenu={(e) => e.preventDefault()}
       className="absolute inset-0 w-full h-full z-10 cursor-move select-none"
     />
   ```

4. Floating frame overlay (line 242):
   ```jsx
   // Before
   {frameUrl && (
     <img 
       src={frameUrl} 
       crossOrigin="anonymous" 
       className="absolute inset-0 w-full h-full z-20 pointer-events-none" 
       alt="Frame Border Overlay"
     />
   )}

   // After
   {frameUrl && (
     <img 
       src={frameUrl} 
       crossOrigin="anonymous" 
       className="absolute inset-0 w-full h-full z-20 pointer-events-none select-none" 
       alt="Frame Border Overlay"
       draggable="false"
     />
   )}
   ```

---

### 3.2. Proposed Changes for `src/app/globals.css`

Append a print styles block at the end of the file.

**Target Location**: Bottom of `src/app/globals.css`
```css
/* ==========================================================================
   Print Optimization Rules (Milestone 2 Security)
   ========================================================================== */
@media print {
  .canvas-compositor,
  .canvas-compositor * {
    display: none !important;
  }
}
```

---

## 4. Verification Method
To verify these recommendations once implemented:
1. **Interactive UI Verification**:
   - Right-click inside the frame campaign workspace to confirm the context menu is successfully blocked.
   - Attempt to highlight/select elements on the canvas workspace, verify selection outline or visual highlights are disabled.
2. **Download Export Quality**:
   - Load a profile picture, adjust transforms, and click **"Download Branded Image"**.
   - Open the downloaded JPEG and check that `"myStory"` is written in the bottom-right corner, positioned 108 pixels from both edges, cleanly rendered in semi-transparent white with dark stroke backing.
3. **Print Output Simulation**:
   - Open browser print preview (e.g. Cmd+P or right-click print on non-protected area).
   - Ensure the canvas compositor editor is completely absent from the print preview list.
4. **Code Quality**:
   - Run production compilation command `npm run build` to verify the Tailwind v4 compilation parses custom `@theme` edits and newly injected stylesheets cleanly.
