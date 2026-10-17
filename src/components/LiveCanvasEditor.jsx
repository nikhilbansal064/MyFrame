'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { 
  UploadCloud, 
  RotateCcw, 
  Download, 
  Maximize2,
  Trash2,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveCanvasEditor({ frameUrl, campaignTitle, onDownloadStart, onDownloadSuccess }) {
  const [photo, setPhoto] = useState(null); // Loaded HTMLImageElement
  const [photoName, setPhotoName] = useState('');
  
  // Transform Coordinates
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canvasRef = useRef(null);
  const frameImgRef = useRef(null); // Reference to pre-loaded static frame PNG image
  
  // High-performance React Ref Coordinate Pointer to prevent state-based asynchronous panning lag
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [frameLoaded, setFrameLoaded] = useState(false);

  // Preload PNG Frame Overlay
  useEffect(() => {
    if (!frameUrl) return;
    logger.info('CanvasEditor', 'Preloading PNG frame overlay:', frameUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid tainted canvas export bugs
    img.src = frameUrl;
    img.onload = () => {
      setFrameLoaded(true);
      logger.info('CanvasEditor', 'PNG frame preloaded successfully');
    };
    img.onerror = () => {
      logger.error('CanvasEditor', 'Failed loading frame PNG');
    };
  }, [frameUrl]);

  // Read upload and instantiate image object
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoName(file.name);
    logger.debug('CanvasEditor', 'Loading participant photo:', file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate an initial responsive fitting scale
        const targetSize = 1080;
        const minRatio = targetSize / Math.min(img.width, img.height);
        
        setPhoto(img);
        setZoom(minRatio); // Fits photo nicely inside 1080x1080 square
        setPanX(0);
        setPanY(0);
        logger.info('CanvasEditor', 'Participant image loaded', { width: img.width, height: img.height, fitScale: minRatio });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Re-draw Canvas Loop (Preview)
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;

    const ctx = canvas.getContext('2d');
    
    // Clear logical canvas area (1080x1080)
    ctx.clearRect(0, 0, 1080, 1080);
    
    // 1. Draw solid background to support transparent photo borders
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Draw participant photo centered with transforms
    ctx.save();
    // Move origin to center of canvas, translate, apply scale
    ctx.translate(540 + panX, 540 + panY);
    ctx.scale(zoom, zoom);
    // Draw centered relative to translated coordinate
    ctx.drawImage(photo, -photo.width / 2, -photo.height / 2);
    ctx.restore();

    // 3. Render watermark text "myStory" at the bottom right corner with 10% padding (x: 972, y: 972)
    ctx.save();
    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("myStory", 972, 972);
    ctx.restore();
  };

  // Redraw when transform states modify
  useEffect(() => {
    drawCanvas();
  }, [photo, zoom, panX, panY]);

  // Touch and Mouse Interactions using Synchronous Ref coordinates
  const handleDragStart = (clientX, clientY) => {
    if (!photo) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging || !photo) return;

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate dynamic canvas screen-to-logical scale ratio on-demand
    const rect = canvas.getBoundingClientRect();
    const scale = 1080 / rect.width;

    // Scale display screen offset movements by the logical coordinates ratio
    setPanX(prev => prev + dx * scale);
    setPanY(prev => prev + dy * scale);
    
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Reset transforms
  const handleReset = () => {
    if (!photo) return;
    const targetSize = 1080;
    const minRatio = targetSize / Math.min(photo.width, photo.height);
    setZoom(minRatio);
    setPanX(0);
    setPanY(0);
    logger.debug('CanvasEditor', 'Transforms reset');
  };

  // Composite both photo and preloaded static PNG frame to an isolated offscreen canvas to avoid flickering
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !photo || !frameLoaded) return;

    setDownloading(true);
    if (onDownloadStart) onDownloadStart();
    logger.info('CanvasEditor', 'Generating final 1080x1080px composite JPEG in offscreen canvas...');

    // Wait a brief tick to ensure canvas redraws smoothly
    setTimeout(() => {
      try {
        // Create an isolated offscreen canvas to prevent visible screen flashing or race conditions during export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1080;
        exportCanvas.height = 1080;
        const exportCtx = exportCanvas.getContext('2d');

        // 1. Draw solid background
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, 1080, 1080);

        // 2. Draw photo layer matching identical logical viewport transformations
        exportCtx.save();
        exportCtx.translate(540 + panX, 540 + panY);
        exportCtx.scale(zoom, zoom);
        exportCtx.drawImage(photo, -photo.width / 2, -photo.height / 2);
        exportCtx.restore();

        // 3. Composite preloaded frame PNG overlay exactly on top spanning 1080x1080
        const frameImg = frameImgRef.current;
        if (frameImg) {
          exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);
        }

        // Add text watermark "myStory" to final composite export
        exportCtx.save();
        exportCtx.font = "bold 28px system-ui, -apple-system, sans-serif";
        exportCtx.shadowColor = "rgba(0, 0, 0, 0.6)";
        exportCtx.shadowBlur = 6;
        exportCtx.shadowOffsetX = 2;
        exportCtx.shadowOffsetY = 2;
        exportCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
        exportCtx.textAlign = "right";
        exportCtx.textBaseline = "bottom";
        exportCtx.fillText("myStory", 972, 972);
        exportCtx.restore();

        // Export as JPEG (92% quality is standard industry balance of file-size vs crispness)
        const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
        
        // Trigger download programmatically
        const downloadLink = document.createElement('a');
        const fileName = `${campaignTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mystory.jpg`;
        downloadLink.download = fileName;
        downloadLink.href = dataUrl;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        logger.info('CanvasEditor', 'Composite image downloaded successfully', fileName);
        if (onDownloadSuccess) onDownloadSuccess();
      } catch (err) {
        logger.error('CanvasEditor', 'Compositing and download failed', err);
        alert('Browser security blocked image compilation due to cross-origin configurations. Please try a different browser or frame.');
      } finally {
        setDownloading(false);
      }
    }, 100);
  };

  return (
    <div className="canvas-compositor flex flex-col items-center gap-6 w-full max-w-[500px]">
      
      {/* Pre-load PNG Image frame invisible in DOM to prevent tainted canvases during compilation */}
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

      {/* Editor Main Canvas Frame wrapper */}
      <div 
        className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
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
          className="absolute inset-0 w-full h-full z-10 cursor-move select-none outline-none"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* DOM-floating PNG Frame overlay (Fast, smooth, doesn't reload canvas on drag events!) */}
        {frameUrl && (
          <img 
            src={frameUrl} 
            crossOrigin="anonymous" 
            className="absolute inset-0 w-full h-full z-20 pointer-events-none" 
            alt="Frame Border Overlay"
            draggable="false"
          />
        )}

        {/* Empty state: Photo Input Uploader */}
        {!photo && (
          <div className="absolute inset-0 z-30 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-4 border border-purple-500/10 rounded-3xl">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              id="participant-photo-upload" 
              className="hidden"
            />
            <label htmlFor="participant-photo-upload" className="flex flex-col items-center gap-3 cursor-pointer w-full h-full justify-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 animate-bounce">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-white">Choose Your Photo</h3>
                <p className="text-xs text-neutral-500 max-w-[240px] leading-relaxed">Select a photo from your library or take a selfie to place in the frame.</p>
              </div>
            </label>
          </div>
        )}

        {/* Dynamic Drag Prompt helper overlay */}
        {photo && (
          <div className="absolute top-4 left-4 z-30 pointer-events-none bg-black/40 backdrop-blur px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1.5 text-[9px] text-neutral-300 font-bold uppercase tracking-wider">
            <Move className="w-3 h-3 text-purple-400" />
            <span>Drag photo to align</span>
          </div>
        )}
      </div>

      {/* Editor Controls sliders & actions */}
      {photo && (
        <div className="w-full flex flex-col gap-5 glass-panel p-5 rounded-2xl border border-white/5">
          {/* Zoom Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
              <span className="flex items-center gap-1 font-semibold">
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                Zoom Scale:
              </span>
              <span className="font-mono text-purple-300">{(zoom * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex gap-4 items-center">
              <input 
                type="range" 
                min="0.2" 
                max="4" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
              />
              
              {/* Reset Transforms */}
              <Button 
                onClick={handleReset}
                title="Reset Zoom & Pan"
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-neutral-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Download & Delete Row */}
          <div className="flex gap-3 mt-1">
            {/* Delete photo */}
            <Button 
              onClick={() => { setPhoto(null); setPhotoName(''); }}
              variant="ghost"
              className="px-4 py-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-rose-400 hover:text-rose-300 flex items-center justify-center"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            {/* Download Button */}
            <Button 
              onClick={handleDownload}
              disabled={downloading || !frameLoaded}
              className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
            >
              {downloading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-purple-200/30 border-t-white animate-spin"></span>
                  <span>Generating JPEG...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Branded Image</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
