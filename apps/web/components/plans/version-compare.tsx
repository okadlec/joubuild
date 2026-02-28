'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Layers, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VersionCompareProps {
  oldFileUrl: string;
  newFileUrl: string;
  oldLabel: string;
  newLabel: string;
}

export function VersionCompare({ oldFileUrl, newFileUrl, oldLabel, newLabel }: VersionCompareProps) {
  const oldCanvasRef = useRef<HTMLCanvasElement>(null);
  const newCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'side-by-side' | 'overlay' | 'diff'>('overlay');
  const [loading, setLoading] = useState(true);
  const [showOld, setShowOld] = useState(true);
  const [showNew, setShowNew] = useState(true);
  const [opacity, setOpacity] = useState(0.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPagesOld, setTotalPagesOld] = useState(1);
  const [totalPagesNew, setTotalPagesNew] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldPdfRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newPdfRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBoth() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const [oldPdf, newPdf] = await Promise.all([
          pdfjsLib.getDocument(oldFileUrl).promise,
          pdfjsLib.getDocument(newFileUrl).promise,
        ]);
        if (cancelled) return;

        oldPdfRef.current = oldPdf;
        newPdfRef.current = newPdf;
        setTotalPagesOld(oldPdf.numPages);
        setTotalPagesNew(newPdf.numPages);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [oldPage, newPage]: [any, any] = await Promise.all([
          oldPdf.getPage(1),
          newPdf.getPage(1),
        ]);
        if (cancelled) return;

        const scale = 1.5;
        const oldViewport = oldPage.getViewport({ scale });
        const newViewport = newPage.getViewport({ scale });

        // Render old
        if (oldCanvasRef.current) {
          oldCanvasRef.current.width = oldViewport.width;
          oldCanvasRef.current.height = oldViewport.height;
          const ctx = oldCanvasRef.current.getContext('2d');
          if (ctx) await oldPage.render({ canvasContext: ctx, viewport: oldViewport }).promise;
        }

        // Render new
        if (newCanvasRef.current) {
          newCanvasRef.current.width = newViewport.width;
          newCanvasRef.current.height = newViewport.height;
          const ctx = newCanvasRef.current.getContext('2d');
          if (ctx) await newPage.render({ canvasContext: ctx, viewport: newViewport }).promise;
        }

        // Create diff overlay
        if (overlayCanvasRef.current && oldCanvasRef.current && newCanvasRef.current) {
          const w = Math.max(oldViewport.width, newViewport.width);
          const h = Math.max(oldViewport.height, newViewport.height);
          overlayCanvasRef.current.width = w;
          overlayCanvasRef.current.height = h;

          const ctx = overlayCanvasRef.current.getContext('2d');
          if (ctx) {
            const oldCtx = oldCanvasRef.current.getContext('2d');
            const newCtx = newCanvasRef.current.getContext('2d');

            if (oldCtx && newCtx) {
              const oldData = oldCtx.getImageData(0, 0, oldCanvasRef.current.width, oldCanvasRef.current.height);
              const newData = newCtx.getImageData(0, 0, newCanvasRef.current.width, newCanvasRef.current.height);
              const diffData = ctx.createImageData(w, h);

              const minW = Math.min(oldCanvasRef.current.width, newCanvasRef.current.width);
              const minH = Math.min(oldCanvasRef.current.height, newCanvasRef.current.height);

              for (let y = 0; y < minH; y++) {
                for (let x = 0; x < minW; x++) {
                  const oi = (y * oldCanvasRef.current.width + x) * 4;
                  const ni = (y * newCanvasRef.current.width + x) * 4;
                  const di = (y * w + x) * 4;

                  const dr = Math.abs(oldData.data[oi] - newData.data[ni]);
                  const dg = Math.abs(oldData.data[oi + 1] - newData.data[ni + 1]);
                  const db = Math.abs(oldData.data[oi + 2] - newData.data[ni + 2]);

                  const diff = (dr + dg + db) / 3;

                  if (diff > 30) {
                    // Highlight differences
                    // Removed in new (old has content, new doesn't) = RED
                    const oldBright = (oldData.data[oi] + oldData.data[oi + 1] + oldData.data[oi + 2]) / 3;
                    const newBright = (newData.data[ni] + newData.data[ni + 1] + newData.data[ni + 2]) / 3;

                    if (oldBright < newBright) {
                      // Content removed (was darker in old) - show red
                      diffData.data[di] = 239;     // R
                      diffData.data[di + 1] = 68;  // G
                      diffData.data[di + 2] = 68;  // B
                      diffData.data[di + 3] = 180;
                    } else {
                      // Content added (is darker in new) - show blue
                      diffData.data[di] = 59;      // R
                      diffData.data[di + 1] = 130;  // G
                      diffData.data[di + 2] = 246;  // B
                      diffData.data[di + 3] = 180;
                    }
                  } else {
                    // Same content - show as gray
                    const avg = (newData.data[ni] + newData.data[ni + 1] + newData.data[ni + 2]) / 3;
                    diffData.data[di] = avg;
                    diffData.data[di + 1] = avg;
                    diffData.data[di + 2] = avg;
                    diffData.data[di + 3] = 255;
                  }
                }
              }

              ctx.putImageData(diffData, 0, 0);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDFs for comparison:', err);
        setLoading(false);
      }
    }

    loadBoth();
    return () => { cancelled = true; };
  }, [oldFileUrl, newFileUrl]);

  const totalPages = Math.max(totalPagesOld, totalPagesNew);

  const goToPage = useCallback(async (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);

    const scale = 1.5;
    if (oldPdfRef.current && pageNum <= totalPagesOld && oldCanvasRef.current) {
      const page = await oldPdfRef.current.getPage(pageNum);
      const vp = page.getViewport({ scale });
      oldCanvasRef.current.width = vp.width;
      oldCanvasRef.current.height = vp.height;
      const ctx = oldCanvasRef.current.getContext('2d');
      if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
    if (newPdfRef.current && pageNum <= totalPagesNew && newCanvasRef.current) {
      const page = await newPdfRef.current.getPage(pageNum);
      const vp = page.getViewport({ scale });
      newCanvasRef.current.width = vp.width;
      newCanvasRef.current.height = vp.height;
      const ctx = newCanvasRef.current.getContext('2d');
      if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
  }, [totalPages, totalPagesOld, totalPagesNew]);

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
        <Button
          variant={mode === 'overlay' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('overlay')}
        >
          <Layers className="mr-1 h-3.5 w-3.5" />
          Překryv
        </Button>
        <Button
          variant={mode === 'side-by-side' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('side-by-side')}
        >
          Vedle sebe
        </Button>
        <Button
          variant={mode === 'diff' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('diff')}
        >
          Rozdíly
        </Button>

        {mode === 'overlay' && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <Button
              variant={showOld ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOld(!showOld)}
            >
              {showOld ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}
              {oldLabel}
            </Button>
            <Button
              variant={showNew ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}
              {newLabel}
            </Button>
            <div className="mx-2 h-6 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Průhlednost:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-24"
            />
          </>
        )}

        {mode === 'diff' && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> Odstraněno
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> Přidáno
            </div>
          </>
        )}

        {totalPages > 1 && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[80px] text-center text-sm">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto rounded-lg border bg-muted/50">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Načítání porovnání...</p>
          </div>
        )}

        {!loading && mode === 'side-by-side' && (
          <div className="flex gap-4 p-4">
            <div className="flex-1">
              <p className="mb-2 text-center text-sm font-medium text-red-500">{oldLabel}</p>
              <canvas
                ref={oldCanvasRef}
                className="mx-auto block rounded border border-red-200"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-center text-sm font-medium text-blue-500">{newLabel}</p>
              <canvas
                ref={newCanvasRef}
                className="mx-auto block rounded border border-blue-200"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}

        {!loading && mode === 'overlay' && (
          <div className="relative mx-auto inline-block p-4">
            {showOld && (
              <canvas
                ref={oldCanvasRef}
                className="block"
                style={{ opacity: showNew ? 1 - opacity : 1 }}
              />
            )}
            {showNew && (
              <canvas
                ref={newCanvasRef}
                className="block"
                style={{
                  position: showOld ? 'absolute' : 'relative',
                  top: showOld ? 16 : undefined,
                  left: showOld ? 16 : undefined,
                  opacity: showOld ? opacity : 1,
                  mixBlendMode: showOld ? 'multiply' : undefined,
                }}
              />
            )}
          </div>
        )}

        {!loading && mode === 'diff' && (
          <div className="p-4">
            <canvas ref={overlayCanvasRef} className="mx-auto block" style={{ maxWidth: '100%', height: 'auto' }} />
          </div>
        )}
      </div>

      {/* Hidden canvases for data when in diff or overlay modes */}
      <div className="hidden">
        {mode === 'diff' && (
          <>
            <canvas ref={oldCanvasRef} />
            <canvas ref={newCanvasRef} />
          </>
        )}
      </div>
    </div>
  );
}
