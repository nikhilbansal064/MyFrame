# Analysis & Proposed Changes: Canvas Security & Watermark Export (Milestone 2)

## Executive Summary
This report analyzes the requirements for canvas watermark overlays, selection/highlight prevention, right-click context menu blocking, and print stylesheet rules to secure the frame compositor. Detailed recommendations and precise plan of changes (without writing code to the codebase) are provided.

---

## 1. Canvas Watermark Overlay

### Current Implementation
In `src/components/LiveCanvasEditor.jsx`, the final canvas export occurs in the `handleDownload` function (lines 149–205). The composite image is generated using an offscreen canvas (`exportCanvas` with a logical resolution of 1080x1080):
1. **Background fill**: Fills background with `#ffffff` (lines 167–168).
2. **Photo layer**: Translates, scales, and draws the user-uploaded photo (lines 171–175).
3. **Frame overlay**: Draws the PNG frame overlay exactly on top (lines 178–181).
4. **Download trigger**: Exports the data URL as a JPEG (`image/jpeg` with `0.92` quality) and triggers download programmatically via a temporary `<a>` element (lines 184–194).

### Proposed Changes
To render a text watermark displaying `"myStory"` in the bottom-right corner of the canvas with 10% padding:
- **Canvas Resolution**: 1080px × 1080px.
- **Padding Requirement**: 10% of 1080px = 108px padding from the bottom and right edges.
- **Watermark Coordinates**:
  - `X = 1080 - 108 = 972`
  - `Y = 1080 - 108 = 972`
- **Canvas Text Context Properties**:
  - `textAlign = 'right'` (to ensure text grows leftward, keeping the padding correct).
  - `textBaseline = 'bottom'` (to align text bottom correctly).
  - `font = 'bold 36px system-ui, -apple-system, sans-serif'` (clear, standard font fallback).
  - `fillStyle = 'rgba(255, 255, 255, 0.65)'` (semi-transparent white for premium styling).
  - `strokeStyle = 'rgba(0, 0, 0, 0.4)'` and `lineWidth = 4` (outline text to guarantee readability on bright/white backgrounds).

---

## 2. Canvas Security: Context Menu and Selection Prevention

### Selection/Highlight Prevention
- **Current State**: The canvas editor wrapper `div` has the Tailwind class `select-none` (line 223), which sets CSS `user-select: none`.
- **Proposed Enhancement**: Ensure the interactive canvas element itself and any overlay images cannot be selected or dragged as individual DOM image elements (which bypasses selection restrictions in some browsers).
- **Plan**: Apply `select-none` class explicitly to both the `<canvas>` (line 233) and the DOM overlay `<img>` (line 241).

### Context Menu Interception
- **Current State**: The context menu is not handled. Users can right-click the canvas wrapper, download/save/copy individual layers, or view source.
- **Proposed Enhancement**: Prevent the browser's right-click context menu from appearing when interacting with the compositor canvas and wrapper.
- **Plan**: Add `onContextMenu={(e) => e.preventDefault()}` on the editor main wrapper `div` (lines 222–231) to prevent the context menu event.

---

## 3. Print Styles (globals.css)

### Theme Styles Location
- Theme styles are defined in `src/app/globals.css` in the `:root` pseudo-class (lines 3–32) for core variables and mapped using the Tailwind `@theme` block (lines 34–53).

### Compositor Hiding on Print
- **Proposed CSS Rule**: We should inject a `@media print` CSS rule at the end of `src/app/globals.css`.
- **Decoupled Architecture**: Apply a utility class `print-hidden` to the root container of `LiveCanvasEditor` in `LiveCanvasEditor.jsx` (line 208), then hide it via print CSS. This is cleaner and more maintainable than targeting generic elements.
- **Plan**:
  - Update `globals.css` with:
    ```css
    @media print {
      .print-hidden {
        display: none !important;
      }
    }
    ```
  - Add `print-hidden` to the root element of `LiveCanvasEditor` (line 208):
    `<div className="flex flex-col items-center gap-6 w-full max-w-[500px] print-hidden">`

---

## 4. Precise Plan of Code Changes

### Target 1: `src/components/LiveCanvasEditor.jsx`

#### A. Root Container (`print-hidden` class addition)
- **Line 208**:
  ```jsx
  // Before
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[500px]">
  
  // After
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[500px] print-hidden">
  ```

#### B. Context Menu Prevention (`onContextMenu` handler)
- **Lines 222-231**:
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
  
  // After
      <div 
        className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
  ```

#### C. Canvas and Overlay Image selection prevention (`select-none` class addition)
- **Lines 233-238**:
  ```jsx
  // Before
        <canvas 
          ref={canvasRef} 
          width={1080} 
          height={1080}
          className="absolute inset-0 w-full h-full z-10 cursor-move"
        />
  
  // After
        <canvas 
          ref={canvasRef} 
          width={1080} 
          height={1080}
          className="absolute inset-0 w-full h-full z-10 cursor-move select-none"
        />
  ```

- **Lines 241-248**:
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
          />
        )}
  ```

#### D. Image Watermarking Overlay (inside `handleDownload`)
- **Lines 177-182**:
  ```jsx
  // Before
        // 3. Composite preloaded frame PNG overlay exactly on top spanning 1080x1080
        const frameImg = frameImgRef.current;
        if (frameImg) {
          exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
        }

        // Export as JPEG (92% quality is standard industry balance of file-size vs crispness)
  
  // After
        // 3. Composite preloaded frame PNG overlay exactly on top spanning 1080x1080
        const frameImg = frameImgRef.current;
        if (frameImg) {
          exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
        }

        // 4. Render a text watermark displaying "myStory" in bottom-right corner with 10% padding (108px offset)
        exportCtx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        exportCtx.textAlign = 'right';
        exportCtx.textBaseline = 'bottom';
        // Stroke/outline text for universal legibility (e.g. against bright overlays)
        exportCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        exportCtx.lineWidth = 4;
        exportCtx.strokeText('myStory', 972, 972); // 1080 - 108 = 972
        // Main filled text
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        exportCtx.fillText('myStory', 972, 972);

        // Export as JPEG (92% quality is standard industry balance of file-size vs crispness)
  ```

---

### Target 2: `src/app/globals.css`

#### Injecting `@media print` rules
- Add to the end of the file (after line 169):
  ```css
  /* Hides the live compositor canvas, controls, and empty uploads when printing */
  @media print {
    .print-hidden {
      display: none !important;
    }
  }
  ```
