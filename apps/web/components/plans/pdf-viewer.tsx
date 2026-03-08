'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Ruler, Layers, ChevronLeft, ChevronRight, X, Trash2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AnnotationToolbar, type AnnotationTool } from './annotation-toolbar';
import { AnnotationOverlay, type AnnotationData } from './annotation-overlay';
import { CalibrationDialog } from './calibration-dialog';
import { TaskPinOverlay } from './task-pin-overlay';
import { AnnotationDetailDialog } from './annotation-detail-dialog';
import { usePinchZoom } from '@/lib/hooks/use-pinch-zoom';
import { getOfflinePdfData } from '@/lib/offline/pdf-offline';
import { useProjectRole } from '@/lib/hooks/use-project-role';
import { AnnotationListPanel } from './annotation-list-panel';
import { getAnnotationCounts } from '@joubuild/supabase/queries/plans';
import type { Task, AnnotationType } from '@joubuild/shared';

// --- Tile-based rendering types and helpers ---

interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Compute visible tile rect (CSS px, page-relative) from scroll position + overscan */
function computeTileRect(
  container: HTMLElement,
  spacer: HTMLElement,
  cssPageW: number,
  cssPageH: number,
  overscan: number
): TileRect {
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;

  // spacer.offsetLeft is relative to container (container has position:relative)
  const visLeft = scrollLeft - spacer.offsetLeft;
  const visTop = scrollTop - spacer.offsetTop;
  const visRight = visLeft + clientWidth;
  const visBottom = visTop + clientHeight;

  const padX = clientWidth * overscan;
  const padY = clientHeight * overscan;

  const x = Math.max(0, Math.floor(visLeft - padX));
  const y = Math.max(0, Math.floor(visTop - padY));
  const right = Math.min(cssPageW, Math.ceil(visRight + padX));
  const bottom = Math.min(cssPageH, Math.ceil(visBottom + padY));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

/** Check if scroll has consumed >50% of overscan buffer on any edge */
function shouldRetrigger(
  container: HTMLElement,
  spacer: HTMLElement,
  tile: TileRect | null,
  cssPageW: number,
  cssPageH: number
): boolean {
  if (!tile) return true;

  const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;
  const visLeft = scrollLeft - spacer.offsetLeft;
  const visTop = scrollTop - spacer.offsetTop;
  const visRight = visLeft + clientWidth;
  const visBottom = visTop + clientHeight;

  const bufLeft = Math.max(0, visLeft) - tile.x;
  const bufTop = Math.max(0, visTop) - tile.y;
  const bufRight = (tile.x + tile.width) - Math.min(cssPageW, visRight);
  const bufBottom = (tile.y + tile.height) - Math.min(cssPageH, visBottom);

  const minBufX = clientWidth * 0.25;
  const minBufY = clientHeight * 0.25;

  return bufLeft < minBufX || bufTop < minBufY || bufRight < minBufX || bufBottom < minBufY;
}

interface PdfViewerProps {
  fileUrl: string;
  sheetVersionId: string;
  sheetId?: string;
  projectId?: string;
  isCurrent?: boolean;
  initialAnnotationId?: string;
}

export function PdfViewer({ fileUrl, sheetVersionId, sheetId, projectId, isCurrent = true, initialAnnotationId }: PdfViewerProps) {
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const frontBufferRef = useRef<'A' | 'B'>('A');

  function getBackCanvas() {
    return frontBufferRef.current === 'A' ? canvasBRef.current : canvasARef.current;
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageRef = useRef<any>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  // Multi-page state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Annotation state
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationData[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationData[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-save state
  const annotationsLoadedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Task pin state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPins, setShowPins] = useState(true);

  // Annotation counts (photos/tasks per annotation)
  const [annotationCounts, setAnnotationCounts] = useState<Record<string, { photos: number; tasks: number }>>({});

  // Annotation detail panel state
  const [detailAnnotationId, setDetailAnnotationId] = useState<string | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'chat' | 'photos' | 'attributes'>('chat');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Annotation list view state
  const [showListView, setShowListView] = useState(false);

  // Admin role check
  const { canManage } = useProjectRole(projectId || '');

  // CSS transform preview for pinch-zoom (no re-render during gesture)
  const [zoomPreview, setZoomPreview] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [cssPageSize, setCssPageSize] = useState({ width: 0, height: 0 });
  const cssPageSizeRef = useRef({ width: 0, height: 0 });
  const renderedTileRef = useRef<TileRect | null>(null);
  const scrollRenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wheel-to-zoom: cursor-anchored zoom target
  const zoomTargetRef = useRef<{
    pageX: number; pageY: number;  // unscaled page coordinate under cursor
    viewX: number; viewY: number;  // cursor position in container viewport
  } | null>(null);

  // Click-and-drag pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    x: number; y: number;
    scrollLeft: number; scrollTop: number;
    active: boolean;  // true after exceeding 3px threshold
    pointerId: number;
  } | null>(null);

  // Device detection and canvas limits
  const isMobileDevice = typeof navigator !== 'undefined'
    && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const MAX_KONVA_DIM = isMobileDevice ? 4096 : 16384;
  const OVERSCAN = isMobileDevice ? 0.5 : 1.0;
  const MAX_ZOOM = 5;

  // Render task tracking refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queuedRenderRef = useRef<{ page: any; s: number; r: number } | null>(null);
  const renderingRef = useRef(false);

  // Calibration state
  const [showCalibration, setShowCalibration] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);

  // Pinch-to-zoom with CSS transform preview (no re-render during gesture)
  const handlePinchZoom = useCallback((newScale: number) => {
    setScale(newScale); // triggers render, CSS preview stays until canvas completes
  }, []);

  const { setCurrentScale, resetPreview } = usePinchZoom(containerRef, {
    enabled: activeTool === 'select',
    onZoomChange: handlePinchZoom,
    onZoomPreview: ({ scale: previewRatio, originX, originY }) => {
      // During gesture: apply CSS transform with dynamic origin at finger midpoint
      setZoomPreview(previewRatio);
      setZoomOrigin({ x: originX, y: originY });
    },
    maxScale: MAX_ZOOM,
  });

  // Keep pinch-zoom in sync with button-driven scale changes
  useEffect(() => {
    setCurrentScale(scale);
  }, [scale, setCurrentScale]);

  // Zoom button handlers — reset CSS preview before changing scale
  const handleZoomIn = useCallback(() => {
    resetPreview();
    setZoomPreview(1);
    setZoomOrigin(null);
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.transform = '';
      canvasWrapperRef.current.style.transformOrigin = '';
      canvasWrapperRef.current.style.willChange = '';
    }
    setScale(s => Math.min(MAX_ZOOM, s + 0.25));
  }, [resetPreview]);

  const handleZoomOut = useCallback(() => {
    resetPreview();
    setZoomPreview(1);
    setZoomOrigin(null);
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.transform = '';
      canvasWrapperRef.current.style.transformOrigin = '';
      canvasWrapperRef.current.style.willChange = '';
    }
    setScale(s => Math.max(0.25, s - 0.25));
  }, [resetPreview]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadProgress(0);

    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        // Check IndexedDB offline cache first
        let pdfSource: string | ArrayBuffer = fileUrl;
        try {
          const offlineData = await getOfflinePdfData(fileUrl);
          if (offlineData) {
            pdfSource = offlineData;
          }
        } catch {
          // Offline cache not available, use network
        }

        const loadingTask = pdfjsLib.getDocument(pdfSource instanceof ArrayBuffer ? { data: pdfSource } : pdfSource);
        loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) {
            setLoadProgress(Math.round((loaded / total) * 100));
          }
        };
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        const page = await pdf.getPage(1);
        if (cancelled) return;

        pageRef.current = page;
        setCurrentPage(1);
        const viewport = page.getViewport({ scale: 1, rotation: 0 });
        setPageSize({ width: viewport.width, height: viewport.height });
        renderVisibleTile(page, scale, rotation);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(t('pdfLoadError'));
          setLoading(false);
          console.error(err);
        }
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      // Destroy previous PDF document to release parsed data (fonts, images, internal canvases)
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      pageRef.current = null;
    };
  }, [fileUrl]);

  // Fetch photo/task counts for all annotations
  const refreshAnnotationCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = getSupabaseClient();
    const counts = await getAnnotationCounts(supabase, ids);
    setAnnotationCounts(counts);
  }, []);

  // Load existing annotations
  useEffect(() => {
    async function loadAnnotations() {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('annotations')
        .select('*')
        .eq('sheet_version_id', sheetVersionId)
        .order('created_at');

      if (data) {
        setAnnotations(
          data.map((a: { id: string; type: string; data: AnnotationData['data'] }) => ({
            id: a.id,
            type: a.type as AnnotationType,
            data: a.data,
          }))
        );
        // Fetch counts for loaded annotations
        refreshAnnotationCounts(data.map((a: { id: string }) => a.id));
      }
      annotationsLoadedRef.current = true;

      // Auto-select annotation from deep-link
      if (initialAnnotationId && data) {
        const match = data.find((a: { id: string }) => a.id === initialAnnotationId);
        if (match) {
          setSelectedId(match.id);
          setDetailAnnotationId(match.id);
        }
      }

      // Load calibration
      const { data: cal } = await supabase
        .from('calibrations')
        .select('*')
        .eq('sheet_version_id', sheetVersionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cal) {
        const dx = cal.point2_x - cal.point1_x;
        const dy = cal.point2_y - cal.point1_y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        setPixelsPerMeter(pixelDist / cal.real_distance);
      }
    }

    loadAnnotations();
  }, [sheetVersionId]);

  // Auto-save annotations (debounced upsert, no deletions)
  useEffect(() => {
    if (!annotationsLoadedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (annotations.length === 0) return;

      setAutoSaveStatus('saving');
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('annotations').upsert(
        annotations.map((a) => ({
          id: a.id,
          sheet_version_id: sheetVersionId,
          type: a.type,
          data: a.data,
          created_by: user?.id,
        })),
        { onConflict: 'id' }
      );

      if (error) {
        console.warn('Auto-save failed:', error.message);
        setAutoSaveStatus('idle');
        return;
      }

      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 1500);
  }, [annotations, sheetVersionId]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Load tasks pinned to this sheet
  useEffect(() => {
    if (!sheetId || !projectId) return;
    async function loadTasks() {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('sheet_id', sheetId)
        .not('pin_x', 'is', null);
      if (data) setTasks(data as Task[]);
    }
    loadTasks();
  }, [sheetId, projectId]);

  // Navigate to a specific page
  const goToPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || pageNum < 1 || pageNum > totalPages) return;
    // Zero both canvas dimensions to release old bitmap GPU memory before loading new page
    const a = canvasARef.current;
    const b = canvasBRef.current;
    if (a) { a.width = 0; a.height = 0; }
    if (b) { b.width = 0; b.height = 0; }
    frontBufferRef.current = 'A';
    if (a) a.style.zIndex = '1';
    if (b) b.style.zIndex = '0';
    const page = await pdfDocRef.current.getPage(pageNum);
    pageRef.current = page;
    setCurrentPage(pageNum);
    renderedTileRef.current = null;
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
    renderVisibleTile(page, scale, rotation);
  }, [totalPages, scale, rotation]);

  // Re-render PDF on scale/rotation change
  useEffect(() => {
    if (pageRef.current) {
      renderedTileRef.current = null;
      renderVisibleTile();
    }
  }, [scale, rotation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function doRender(page: any, s: number, r: number, tile: TileRect) {
    const backCanvas = getBackCanvas();
    if (!backCanvas) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // already cancelled or finished
      }
      renderTaskRef.current = null;
    }

    const dpr = window.devicePixelRatio || 1;

    // Canvas covers only the tile area at native DPR — always safe on mobile
    const canvasW = Math.ceil(tile.width * dpr);
    const canvasH = Math.ceil(tile.height * dpr);

    // Set dimensions on BACK canvas only — front canvas keeps displaying old content
    backCanvas.width = canvasW;
    backCanvas.height = canvasH;
    backCanvas.style.width = `${tile.width}px`;
    backCanvas.style.height = `${tile.height}px`;
    backCanvas.style.position = 'absolute';
    backCanvas.style.left = `${tile.x}px`;
    backCanvas.style.top = `${tile.y}px`;

    const ctx = backCanvas.getContext('2d');
    if (!ctx) return;

    // Viewport at full scale×DPR with offset so tile origin maps to canvas (0,0).
    // Content outside canvas bounds is clipped automatically by the browser.
    const renderViewport = page.getViewport({
      scale: s * dpr,
      rotation: r,
      offsetX: -tile.x * dpr,
      offsetY: -tile.y * dpr,
    });

    const task = page.render({ canvasContext: ctx, viewport: renderViewport });
    renderTaskRef.current = task;

    try {
      await task.promise;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') {
        return;
      }
      console.warn('PDF render error:', err);
      return;
    } finally {
      renderTaskRef.current = null;
    }

    // SWAP: bring back canvas to front, push old front to back
    const frontCanvas = frontBufferRef.current === 'A' ? canvasARef.current : canvasBRef.current;
    if (backCanvas && frontCanvas) {
      backCanvas.style.zIndex = '1';
      frontCanvas.style.zIndex = '0';
      frontBufferRef.current = frontBufferRef.current === 'A' ? 'B' : 'A';
    }

    // Store rendered tile for scroll hysteresis
    renderedTileRef.current = tile;

    // Clear CSS transform preview directly on DOM (zero-frame-gap), then sync React state
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.transform = '';
      canvasWrapperRef.current.style.transformOrigin = '';
      canvasWrapperRef.current.style.willChange = '';
    }
    setZoomPreview(1);
    setZoomOrigin(null);

    // Update page size for annotation overlay
    const baseViewport = page.getViewport({ scale: 1, rotation: r });
    setPageSize({ width: baseViewport.width, height: baseViewport.height });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderVisibleTile(page?: any, s?: number, r?: number) {
    const p = page || pageRef.current;
    const sc = s ?? scale;
    const rot = r ?? rotation;
    if (!p) return;

    const container = containerRef.current;
    const spacer = spacerRef.current;

    // Compute CSS page dimensions
    const cssViewport = p.getViewport({ scale: sc, rotation: rot });
    const cssW = Math.floor(cssViewport.width);
    const cssH = Math.floor(cssViewport.height);

    // Save scroll center fraction (page-relative) before resizing
    let centerFracX = 0.5, centerFracY = 0.5;
    if (container && spacer && spacer.clientWidth > 0 && spacer.clientHeight > 0) {
      const cx = container.scrollLeft + container.clientWidth / 2 - spacer.offsetLeft;
      const cy = container.scrollTop + container.clientHeight / 2 - spacer.offsetTop;
      centerFracX = Math.max(0, Math.min(1, cx / spacer.clientWidth));
      centerFracY = Math.max(0, Math.min(1, cy / spacer.clientHeight));
    }

    // Update spacer size (sets scrollable area)
    if (spacer) {
      spacer.style.width = `${cssW}px`;
      spacer.style.height = `${cssH}px`;
    }
    setCssPageSize({ width: cssW, height: cssH });
    cssPageSizeRef.current = { width: cssW, height: cssH };

    // Restore scroll after resize
    if (container && spacer && renderedTileRef.current) {
      const zt = zoomTargetRef.current;
      if (zt) {
        // Cursor-anchored: keep the page point under the cursor fixed in viewport
        container.scrollLeft = zt.pageX * sc + spacer.offsetLeft - zt.viewX;
        container.scrollTop = zt.pageY * sc + spacer.offsetTop - zt.viewY;
        zoomTargetRef.current = null;
      } else {
        // Center-fraction fallback (zoom buttons, pinch zoom)
        const newCx = centerFracX * cssW + spacer.offsetLeft;
        const newCy = centerFracY * cssH + spacer.offsetTop;
        container.scrollLeft = newCx - container.clientWidth / 2;
        container.scrollTop = newCy - container.clientHeight / 2;
      }
    }

    // Compute tile from current scroll position
    let tile: TileRect;
    if (container && spacer) {
      tile = computeTileRect(container, spacer, cssW, cssH, OVERSCAN);
    } else {
      // Fallback: render full page (during initial mount before refs attach)
      tile = { x: 0, y: 0, width: cssW, height: cssH };
    }

    // Delegate to render queue
    if (renderingRef.current) {
      queuedRenderRef.current = { page: p, s: sc, r: rot };
      return;
    }

    renderingRef.current = true;
    requestAnimationFrame(() => {
      doRender(p, sc, rot, tile).finally(() => {
        renderingRef.current = false;
        const queued = queuedRenderRef.current;
        if (queued) {
          queuedRenderRef.current = null;
          renderVisibleTile(queued.page, queued.s, queued.r);
        }
      });
    });
  }

  // Comprehensive cleanup on unmount — release GPU memory and parsed PDF data
  useEffect(() => {
    return () => {
      // Cancel any in-progress render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
      // Destroy PDF document to release parsed data (fonts, images, internal canvases)
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      pageRef.current = null;
      // Zero both canvas dimensions to release GPU bitmap memory
      const a = canvasARef.current;
      const b = canvasBRef.current;
      if (a) { a.width = 0; a.height = 0; }
      if (b) { b.width = 0; b.height = 0; }
      // Clear scroll render timer
      if (scrollRenderTimerRef.current) clearTimeout(scrollRenderTimerRef.current);
    };
  }, []);

  // Scroll-driven tile re-rendering
  useEffect(() => {
    const container = containerRef.current;
    const spacer = spacerRef.current;
    if (!container || !spacer) return;

    function handleScroll() {
      if (scrollRenderTimerRef.current) clearTimeout(scrollRenderTimerRef.current);
      scrollRenderTimerRef.current = setTimeout(() => {
        const c = containerRef.current;
        const sp = spacerRef.current;
        if (!c || !sp) return;
        const { width: cssW, height: cssH } = cssPageSizeRef.current;
        if (cssW === 0 || cssH === 0) return;
        if (shouldRetrigger(c, sp, renderedTileRef.current, cssW, cssH)) {
          renderVisibleTile();
        }
      }, 50);
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollRenderTimerRef.current) {
        clearTimeout(scrollRenderTimerRef.current);
        scrollRenderTimerRef.current = null;
      }
    };
  }, [scale, rotation]);

  // Wheel-to-zoom: two-finger trackpad scroll → zoom toward cursor
  // Uses a scaleRef to avoid re-registering the handler on every scale change
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();

      const curScale = scaleRef.current;
      // Smooth proportional zoom factor
      const delta = e.deltaY || e.deltaX;
      const factor = Math.pow(0.998, delta);
      const newScale = Math.min(MAX_ZOOM, Math.max(0.1, curScale * factor));
      if (newScale === curScale) return;

      const spacer = spacerRef.current;
      if (!spacer || !container) return;

      // Unscaled page coordinate under cursor
      const rect = spacer.getBoundingClientRect();
      const pageX = (e.clientX - rect.left) / curScale;
      const pageY = (e.clientY - rect.top) / curScale;

      // Cursor position relative to container viewport
      const containerRect = container.getBoundingClientRect();
      const viewX = e.clientX - containerRect.left;
      const viewY = e.clientY - containerRect.top;

      zoomTargetRef.current = { pageX, pageY, viewX, viewY };

      // Reset CSS zoom preview (same as zoom buttons)
      resetPreview();
      setZoomPreview(1);
      setZoomOrigin(null);
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.style.transform = '';
        canvasWrapperRef.current.style.transformOrigin = '';
        canvasWrapperRef.current.style.willChange = '';
      }

      setScale(newScale);
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [resetPreview]);

  // Click-and-drag pan (select tool only, mouse/pen only — touch keeps native scroll)
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isCalibratingRef = useRef(isCalibrating);
  isCalibratingRef.current = isCalibrating;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handlePointerDown(e: PointerEvent) {
      // Only left button, non-touch, select tool, not calibrating
      if (e.button !== 0) return;
      if (e.pointerType === 'touch') return;
      if (activeToolRef.current !== 'select') return;
      if (isCalibratingRef.current) return;
      if (!container) return;

      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        active: false,
        pointerId: e.pointerId,
      };
    }

    function handlePointerMove(e: PointerEvent) {
      const ds = dragStartRef.current;
      if (!ds || !container) return;

      const dx = e.clientX - ds.x;
      const dy = e.clientY - ds.y;

      // 3px dead zone to avoid interfering with annotation clicks
      if (!ds.active) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        ds.active = true;
        isDraggingRef.current = true;
        container.style.cursor = 'grabbing';
        try { container.setPointerCapture(ds.pointerId); } catch { /* lost */ }
      }

      container.scrollLeft = ds.scrollLeft - dx;
      container.scrollTop = ds.scrollTop - dy;
    }

    function handlePointerUp(e: PointerEvent) {
      if (!dragStartRef.current || !container) return;
      if (dragStartRef.current.active) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          // pointer capture may have been lost
        }
      }

      const wasDragging = isDraggingRef.current;
      dragStartRef.current = null;
      isDraggingRef.current = false;
      container.style.cursor = '';

      // If we were actively dragging, prevent the click from reaching annotations
      if (wasDragging) {
        function blockClick(ev: MouseEvent) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        container.addEventListener('click', blockClick, { capture: true, once: true });
      }
    }

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  // ResizeObserver for fullscreen toggle and orientation changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderedTileRef.current = null;
        renderVisibleTile();
      }, 100);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [scale, rotation]);

  // Annotation handlers
  const handleAnnotationsChange = useCallback((newAnnotations: AnnotationData[]) => {
    setUndoStack(prev => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations(newAnnotations);
  }, [annotations]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, annotations]);
    setAnnotations(prev);
    setUndoStack(u => u.slice(0, -1));
  }, [undoStack, annotations]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, annotations]);
    setAnnotations(next);
    setRedoStack(r => r.slice(0, -1));
  }, [redoStack, annotations]);

  // When selecting an annotation, sync toolbar color/stroke from it
  const handleSelectId = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      const ann = annotations.find(a => a.id === id);
      if (ann) {
        setActiveColor(ann.data.color);
        setStrokeWidth(ann.data.strokeWidth);
      }
    }
  }, [annotations]);

  // Color change: update tool setting + apply to selected annotation
  const handleColorChange = useCallback((color: string) => {
    setActiveColor(color);
    if (selectedId) {
      const updated = annotations.map(a =>
        a.id === selectedId ? { ...a, data: { ...a.data, color } } : a
      );
      handleAnnotationsChange(updated);
    }
  }, [selectedId, annotations, handleAnnotationsChange]);

  // Stroke width change: update tool setting + apply to selected annotation
  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
    if (selectedId) {
      const updated = annotations.map(a =>
        a.id === selectedId ? { ...a, data: { ...a.data, strokeWidth: width } } : a
      );
      handleAnnotationsChange(updated);
    }
  }, [selectedId, annotations, handleAnnotationsChange]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setUndoStack(prev => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, annotations]);

  const handleSave = useCallback(async () => {
    // Cancel pending auto-save to prevent race
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaving(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch existing annotation IDs for this sheet version
    const { data: existingRows } = await supabase
      .from('annotations')
      .select('id')
      .eq('sheet_version_id', sheetVersionId);

    const existingIds = (existingRows || []).map((r: { id: string }) => r.id);
    const currentIds = annotations.map(a => a.id);

    // Delete only removed annotations (preserves comments/photos via FK cascade)
    const removedIds = existingIds.filter(id => !currentIds.includes(id));
    if (removedIds.length > 0) {
      await supabase.from('annotations').delete().in('id', removedIds);
    }

    // Upsert current annotations (insert new, update existing - preserves FKs)
    if (annotations.length > 0) {
      const { error } = await supabase.from('annotations').upsert(
        annotations.map((a) => ({
          id: a.id,
          sheet_version_id: sheetVersionId,
          type: a.type,
          data: a.data,
          created_by: user?.id,
        })),
        { onConflict: 'id' }
      );

      if (error) {
        toast.error(t('saveAnnotationsError'));
        setSaving(false);
        return;
      }
    }

    // Reload annotations from DB to ensure client-server sync
    const { data: reloaded } = await supabase
      .from('annotations')
      .select('*')
      .eq('sheet_version_id', sheetVersionId)
      .order('created_at');

    if (reloaded) {
      setAnnotations(
        reloaded.map((a: { id: string; type: string; data: AnnotationData['data'] }) => ({
          id: a.id,
          type: a.type as AnnotationType,
          data: a.data,
        }))
      );
    }

    toast.success(t('annotationsSaved'));
    setSaving(false);
  }, [annotations, sheetVersionId]);

  // Delete all annotations (admin only)
  const handleDeleteAllAnnotations = useCallback(async () => {
    if (!confirm(t('deleteAllConfirm'))) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('sheet_version_id', sheetVersionId);

    if (error) {
      toast.error(t('deleteAllError'));
      return;
    }

    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setDetailAnnotationId(null);
    toast.success(t('allAnnotationsDeleted'));
  }, [sheetVersionId]);

  // Calibration handlers
  const handleStartCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationStep(1);
    setCalibrationPoints(null);
    setShowCalibration(false);
  }, []);

  const handleCalibrationClick = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isCalibrating) return;

    const rect = spacerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;

    if (calibrationStep === 1) {
      setCalibrationPoints({ x1: x, y1: y, x2: 0, y2: 0 });
      setCalibrationStep(2);
    } else if (calibrationStep === 2 && calibrationPoints) {
      setCalibrationPoints({ ...calibrationPoints, x2: x, y2: y });
      setIsCalibrating(false);
      setCalibrationStep(0);
      setShowCalibration(true);
    }
  }, [isCalibrating, calibrationStep, calibrationPoints, scale]);

  const handleCalibrate = useCallback(async (realDistanceMeters: number) => {
    if (!calibrationPoints) return;

    const dx = calibrationPoints.x2 - calibrationPoints.x1;
    const dy = calibrationPoints.y2 - calibrationPoints.y1;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const ppm = pixelDist / realDistanceMeters;
    setPixelsPerMeter(ppm);

    // Save to database
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('calibrations').insert({
      sheet_version_id: sheetVersionId,
      point1_x: calibrationPoints.x1,
      point1_y: calibrationPoints.y1,
      point2_x: calibrationPoints.x2,
      point2_y: calibrationPoints.y2,
      real_distance: realDistanceMeters,
      created_by: user?.id,
    });

    toast.success(t('scaleCalibrated'));
  }, [calibrationPoints, sheetVersionId]);

  // Auto-save a single annotation to DB before opening its detail panel.
  // This ensures the annotation row exists so comments/photos don't fail on FK/RLS.
  const handleAnnotationClick = useCallback(async (id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (annotation) {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Use upsert with ON CONFLICT DO NOTHING so we don't overwrite
      // an already-saved annotation, and don't fail if it already exists.
      const { error } = await supabase.from('annotations').upsert(
        {
          id: annotation.id,
          sheet_version_id: sheetVersionId,
          type: annotation.type,
          data: annotation.data,
          created_by: user?.id,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      if (error) {
        console.warn('Auto-save annotation failed:', error.message);
      }
    }
    setDetailAnnotationId(id);
  }, [annotations, sheetVersionId]);

  // Handle pin tool creation — save to DB immediately and open detail dialog
  const handlePinCreated = useCallback(async (annotationId: string, initialTab: 'photos' | 'attributes') => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('annotations').upsert(
      { id: annotation.id, sheet_version_id: sheetVersionId, type: annotation.type, data: annotation.data, created_by: user?.id },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    setDetailInitialTab(initialTab);
    setDetailAnnotationId(annotationId);
    setActiveTool('select');
  }, [annotations, sheetVersionId]);

  // Handle task pin click — open the annotation dialog for the task's linked annotation
  const handleTaskPinClick = useCallback((task: Task) => {
    if (task.annotation_id) {
      setDetailAnnotationId(task.annotation_id);
    }
  }, []);

  // Task CRUD callbacks to keep local tasks state in sync with dialog changes
  const handleDialogTaskCreated = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  const handleDialogTaskUpdated = useCallback((task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  }, []);

  const handleDialogTaskDeleted = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  return (
    <>
    <div className={
      isFullscreen
        ? 'fixed inset-0 z-[60] flex gap-0 bg-background'
        : 'flex h-full gap-0'
    }>
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      {/* Top toolbar - zoom, rotate, calibration */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2">
        {isFullscreen && (
          <Button variant="outline" size="icon" onClick={() => setIsFullscreen(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[60px] text-center text-sm">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <Button variant="outline" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <Button
          variant={showAnnotations ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAnnotations(!showAnnotations)}
        >
          <Layers className="mr-1 h-3.5 w-3.5" />
          <span className="hidden lg:inline">{t('annotations')}</span>
        </Button>
        {showAnnotations && (
          <Button
            variant={showListView ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowListView(!showListView)}
            title={t('annotationList')}
          >
            <List className="h-4 w-4" />
          </Button>
        )}
        {canManage && showAnnotations && annotations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAllAnnotations}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            <span className="hidden lg:inline">{tCommon('delete')}</span>
          </Button>
        )}
        {!isFullscreen && (
          <Button variant="outline" size="sm" onClick={() => setShowCalibration(true)}>
            <Ruler className="mr-1 h-3.5 w-3.5" />
            <span className="hidden lg:inline">{t('calibrate')}</span>
            {pixelsPerMeter && <span className="ml-1 text-xs text-green-500">&#10003;</span>}
          </Button>
        )}
        {totalPages > 1 && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <Button variant="outline" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[80px] text-center text-sm">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="flex-1" />
        {!isFullscreen && <span className="hidden sm:inline text-xs text-muted-foreground">ID: {sheetVersionId.slice(0, 8)}</span>}
      </div>

      {/* Annotation toolbar */}
      {showAnnotations && (
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={handleColorChange}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={handleStrokeWidthChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onDeleteSelected={handleDeleteSelected}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          hasSelection={selectedId !== null}
          saving={saving}
          autoSaveStatus={autoSaveStatus}
        />
      )}

      {/* Annotation list view */}
      {showListView && showAnnotations && (
        <div className="flex-1 overflow-auto rounded-lg border">
          <AnnotationListPanel
            annotations={annotations}
            sheetVersionId={sheetVersionId}
            onAnnotationClick={handleAnnotationClick}
            selectedId={selectedId}
          />
        </div>
      )}

      {/* Canvas + Annotation overlay */}
      <div
        ref={containerRef}
        className={cn('relative flex-1 overflow-auto rounded-lg border bg-muted/50', showListView && showAnnotations && 'hidden')}
        onClick={isCalibrating ? handleCalibrationClick : undefined}
        onTouchEnd={isCalibrating ? handleCalibrationClick : undefined}
        style={{
          cursor: isCalibrating ? 'crosshair' : (activeTool === 'select' ? 'grab' : undefined),
          touchAction: activeTool !== 'select' ? 'none' : undefined,
        }}
      >
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-muted-foreground">{tCommon('loading')} {loadProgress > 0 ? `${loadProgress}%` : ''}</p>
            {loadProgress > 0 && (
              <Progress value={loadProgress} className="w-48" />
            )}
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        {isCalibrating && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border bg-background px-4 py-2 shadow-lg">
            <p className="text-sm font-medium">
              {calibrationStep === 1
                ? t('measureFirstPoint')
                : t('measureSecondPoint')}
            </p>
          </div>
        )}
        {/* Spacer: sized to full CSS page, provides scrollable area */}
        <div ref={spacerRef} className="relative mx-auto">
          {/* Canvas wrapper: handles CSS zoom preview during pinch gesture */}
          <div
            ref={canvasWrapperRef}
            className="absolute inset-0 overflow-hidden"
            style={{
              zIndex: 0,
              ...(zoomPreview !== 1 ? {
                transform: `scale(${zoomPreview})`,
                transformOrigin: zoomOrigin ? `${zoomOrigin.x}px ${zoomOrigin.y}px` : 'center',
                willChange: 'transform',
              } : undefined),
            }}
          >
            <canvas ref={canvasARef} className="block" style={{ position: 'absolute', zIndex: 1 }} />
            <canvas ref={canvasBRef} className="block" style={{ position: 'absolute', zIndex: 0 }} />
          </div>
          {showPins && pageSize.width > 0 && sheetId && (() => {
            const effectiveScale = Math.min(scale, MAX_KONVA_DIM / Math.max(pageSize.width, pageSize.height));
            const ds = scale / effectiveScale;
            return (
              <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
              <TaskPinOverlay
                width={pageSize.width}
                height={pageSize.height}
                scale={effectiveScale}
                tasks={tasks}
                onTaskClick={handleTaskPinClick}
                displayScale={ds}
              />
              </div>
            );
          })()}
          {showAnnotations && pageSize.width > 0 && (() => {
            const effectiveScale = Math.min(scale, MAX_KONVA_DIM / Math.max(pageSize.width, pageSize.height));
            const ds = scale / effectiveScale;
            return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
            <AnnotationOverlay
              width={pageSize.width}
              height={pageSize.height}
              scale={effectiveScale}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              annotations={annotations}
              onAnnotationsChange={handleAnnotationsChange}
              selectedId={selectedId}
              onSelectId={handleSelectId}
              onAnnotationClick={handleAnnotationClick}
              onPinCreated={handlePinCreated}
              pixelsPerMeter={pixelsPerMeter}
              displayScale={ds}
              annotationCounts={annotationCounts}
            />
            </div>
            );
          })()}
        </div>
      </div>

      {/* Calibration dialog */}
      <CalibrationDialog
        open={showCalibration}
        onClose={() => setShowCalibration(false)}
        calibrationPoints={calibrationPoints}
        onCalibrate={handleCalibrate}
        isSettingPoints={isCalibrating}
        onStartCalibration={handleStartCalibration}
      />
    </div>

    </div>

    {/* Annotation detail dialog (rendered as overlay, not flex sibling) */}
    {detailAnnotationId && projectId && (
      <AnnotationDetailDialog
        annotationId={detailAnnotationId}
        projectId={projectId}
        sheetVersionId={sheetVersionId}
        initialTab={detailInitialTab}
        onClose={() => {
          setDetailAnnotationId(null);
          setDetailInitialTab('chat');
          refreshAnnotationCounts(annotations.map(a => a.id));
        }}
        onTaskCreated={handleDialogTaskCreated}
        onTaskUpdated={handleDialogTaskUpdated}
        onTaskDeleted={handleDialogTaskDeleted}
        onAnnotationDeleted={(id) => {
          setAnnotations(prev => prev.filter(a => a.id !== id));
          setSelectedId(null);
          setDetailAnnotationId(null);
        }}
      />
    )}
    </>
  );
}
