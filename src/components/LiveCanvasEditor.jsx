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

// Shared canvas draw helpers
function drawPhoto(ctx, photo, panX, panY, zoom) {
  ctx.save();
  ctx.translate(540 + panX, 540 + panY);
  ctx.scale(zoom, zoom);
  ctx.drawImage(photo, -photo.width / 2, -photo.height / 2);
  ctx.restore();
}

function drawWatermark(ctx) {
  ctx.save();
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('myStory', 972, 972);
  ctx.restore();
}

export default function LiveCanvasEditor({ frameUrl, campaignTitle, onDownloadSuccess }) {
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

  // Re-draw preview canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1080, 1080);
    drawPhoto(ctx, photo, panX, panY, zoom);
    drawWatermark(ctx);
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

  const handleDownload = () => {
    if (!photo || !frameLoaded) return;
    setDownloading(true);

    setTimeout(() => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1080;
        exportCanvas.height = 1080;
        const exportCtx = exportCanvas.getContext('2d');

        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, 1080, 1080);
        drawPhoto(exportCtx, photo, panX, panY, zoom);

        const frameImg = frameImgRef.current;
        if (frameImg) exportCtx.drawImage(frameImg, 0, 0, 1080, 1080);

        drawWatermark(exportCtx);

        const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
        const link = document.createElement('a');
        link.download = `${campaignTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mystory.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (onDownloadSuccess) onDownloadSuccess();
      } catch (err) {
        logger.error('CanvasEditor', 'Export failed', err);
        alert('Download failed. Please try a different browser or frame.');
      } finally {
        setDownloading(false);
      }
    }, 100);
  };

  return (
    <div className="canvas-compositor flex flex-col items-center gap-4 w-full max-w-[500px]">
      
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
        className="relative w-full aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10 bg-neutral-950 shadow-2xl shadow-black/50 select-none"
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
            alt=""
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            draggable="false"
          />
        )}

        {/* Empty state: Photo Input Uploader */}
        {!photo && (
          <div className="absolute inset-0 z-30 bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              id="participant-photo-upload" 
              className="hidden"
            />
            <label htmlFor="participant-photo-upload" className="group flex flex-col items-center gap-4 cursor-pointer w-full h-full justify-center rounded-xl border border-dashed border-white/15 hover:border-purple-400/50 hover:bg-white/[0.02] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 ring-1 ring-inset ring-purple-500/25 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-white">Choose Your Photo</h3>
                <p className="text-sm text-neutral-400 max-w-[260px] leading-relaxed">Select a photo from your library or take a selfie to place in the frame.</p>
              </div>
              <span className="btn-premium inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm">
                <UploadCloud className="w-4 h-4" />
                Upload photo
              </span>
            </label>
          </div>
        )}

        {/* Dynamic Drag Prompt helper overlay */}
        {photo && (
          <div className="absolute top-3 left-3 z-30 pointer-events-none bg-black/60 backdrop-blur px-2.5 h-7 rounded-full ring-1 ring-white/10 flex items-center gap-1.5 text-xxs text-neutral-200 font-medium">
            <Move className="w-3.5 h-3.5 text-purple-300" />
            <span>Drag photo to align</span>
          </div>
        )}
      </div>

      {/* Editor Controls sliders & actions */}
      {photo && (
        <div className="w-full flex flex-col gap-4 glass-panel p-4 sm:p-5 rounded-2xl animate-slide-up">
          {/* Zoom Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-medium text-neutral-300">
              <span className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-purple-300" />
                Zoom
              </span>
              <span className="font-mono text-xs text-neutral-400 tabular-nums">{(zoom * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex gap-3 items-center">
              <input 
                type="range" 
                min="0.2" 
                max="4" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 cursor-pointer"
                aria-label="Zoom"
              />
              
              {/* Reset Transforms */}
              <Button 
                onClick={handleReset}
                title="Reset Zoom & Pan"
                aria-label="Reset zoom and pan"
                variant="secondary"
                size="icon-sm"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Download & Delete Row */}
          <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
            {/* Delete photo */}
            <Button 
              onClick={() => { setPhoto(null); setPhotoName(''); }}
              variant="danger"
              size="icon-lg"
              title="Delete Photo"
              aria-label="Remove photo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            {/* Download Button */}
            <Button 
              onClick={handleDownload}
              disabled={downloading || !frameLoaded}
              size="lg"
              className="flex-1"
            >
              {downloading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
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
