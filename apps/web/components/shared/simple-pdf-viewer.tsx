'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Download, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimplePdfViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

export function SimplePdfViewer({ fileUrl, fileName, onClose }: SimplePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const renderTaskRef = useRef(0);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Nelze načíst PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileUrl]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;

    const taskId = ++renderTaskRef.current;
    try {
      const pdfPage = await pdf.getPage(page);
      if (taskId !== renderTaskRef.current) return;

      const viewport = pdfPage.getViewport({ scale: 1 });
      const container = containerRef.current;
      // Fit width by default, then apply user scale
      const fitScale = (container.clientWidth - 32) / viewport.width;
      const finalScale = fitScale * scale;
      const scaledViewport = pdfPage.getViewport({ scale: finalScale * (window.devicePixelRatio || 1) });

      const canvas = canvasRef.current;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${scaledViewport.height / (window.devicePixelRatio || 1)}px`;

      const ctx = canvas.getContext('2d')!;
      await pdfPage.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    } catch {
      // ignore render errors from cancelled tasks
    }
  }, [pdf, page, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Re-render on resize
  useEffect(() => {
    const handleResize = () => renderPage();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPage]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { setPage(p => Math.max(1, p - 1)); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { setPage(p => Math.min(numPages, p + 1)); return; }
      if ((e.key === '+' || e.key === '=') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setScale(s => Math.min(3, s + 0.25)); }
      if (e.key === '-' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setScale(s => Math.max(0.25, s - 0.25)); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [numPages, onClose]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(s => {
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          return Math.min(3, Math.max(0.25, s + delta));
        });
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(f => !f);
    // Re-render after state change settles
    setTimeout(() => renderPage(), 50);
  }, [renderPage]);

  return (
    <div className={
      isFullscreen
        ? 'fixed inset-0 z-[60] flex flex-col bg-background'
        : 'fixed inset-0 z-50 flex flex-col bg-black/50'
    }>
      {/* Toolbar */}
      <div className={
        isFullscreen
          ? 'flex items-center justify-between border-b bg-background px-4 py-2'
          : 'flex items-center justify-between bg-background px-4 py-2 shadow-md'
      }>
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          {fileName && (
            <span className="truncate text-sm font-medium max-w-[200px] sm:max-w-[400px]">
              {fileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Page navigation */}
          {numPages > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums px-1">
                {page} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(p => Math.min(numPages, p + 1))}
                disabled={page >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          )}

          {/* Zoom */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
            disabled={scale <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* Download */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? 'flex-1 overflow-auto bg-muted/50'
            : 'flex-1 overflow-auto bg-muted/50 mx-auto w-full max-w-5xl'
        }
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Načítání PDF...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">{error}</div>
          </div>
        )}
        {!loading && !error && (
          <div className="flex justify-center p-4">
            <canvas ref={canvasRef} className="shadow-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
