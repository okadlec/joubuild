'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
import { AnnotationDetailPanel } from './annotation-detail-panel';
import { usePinchZoom } from '@/lib/hooks/use-pinch-zoom';
import { getOfflinePdfData } from '@/lib/offline/pdf-offline';
import { useProjectRole } from '@/lib/hooks/use-project-role';
import { AnnotationListPanel } from './annotation-list-panel';
import type { Task } from '@joubuild/shared';

interface PdfViewerProps {
  fileUrl: string;
  sheetVersionId: string;
  sheetId?: string;
  projectId?: string;
  isCurrent?: boolean;
}

export function PdfViewer({ fileUrl, sheetVersionId, sheetId, projectId, isCurrent = true }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Annotation detail panel state
  const [detailAnnotationId, setDetailAnnotationId] = useState<string | null>(null);

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

  // Max canvas buffer size — mobile devices have lower GPU limits
  const isMobileDevice = typeof navigator !== 'undefined'
    && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const MAX_BUFFER = isMobileDevice ? 4096 : 8192;

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
    setScale(s => Math.min(3, s + 0.25));
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
        renderPage(page, scale, rotation);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError('Nepodařilo se načíst PDF');
          setLoading(false);
          console.error(err);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [fileUrl]);

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
            type: a.type as AnnotationTool,
            data: a.data,
          }))
        );
      }
      annotationsLoadedRef.current = true;

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
    const page = await pdfDocRef.current.getPage(pageNum);
    pageRef.current = page;
    setCurrentPage(pageNum);
    renderPage(page, scale, rotation);
  }, [totalPages, scale, rotation]);

  // Re-render PDF on scale/rotation change
  useEffect(() => {
    if (pageRef.current) {
      renderPage(pageRef.current, scale, rotation);
    }
  }, [scale, rotation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function doRender(page: any, s: number, r: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    const viewport = page.getViewport({ scale: s, rotation: r });
    const vw = viewport.width;
    const vh = viewport.height;

    // Pixel buffer = viewport * DPR, clamped to GPU limit
    let bufferW = Math.floor(vw * dpr);
    let bufferH = Math.floor(vh * dpr);
    const MAX_CANVAS = MAX_BUFFER;
    if (bufferW > MAX_CANVAS || bufferH > MAX_CANVAS) {
      const ratio = Math.min(MAX_CANVAS / bufferW, MAX_CANVAS / bufferH);
      bufferW = Math.floor(bufferW * ratio);
      bufferH = Math.floor(bufferH * ratio);
    }
    canvas.width = bufferW;
    canvas.height = bufferH;
    canvas.style.width = `${Math.floor(vw)}px`;
    canvas.style.height = `${Math.floor(vh)}px`;
    canvas.style.imageRendering = 'auto';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Unified context scale (DPR + any clamping)
    const sx = bufferW / vw;
    const sy = bufferH / vh;
    ctx.scale(sx, sy);

    const task = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;

    try {
      await task.promise;
    } catch (err: unknown) {
      // RenderingCancelledException is expected when we cancel — ignore it
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') {
        return;
      }
      console.warn('PDF render error:', err);
      return;
    } finally {
      renderTaskRef.current = null;
    }

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
  function renderPage(page: any, s: number, r: number) {
    if (renderingRef.current) {
      // Queue the latest render request instead of dropping it
      queuedRenderRef.current = { page, s, r };
      return;
    }

    renderingRef.current = true;
    requestAnimationFrame(() => {
      doRender(page, s, r).finally(() => {
        renderingRef.current = false;
        // Process queued render if any
        const queued = queuedRenderRef.current;
        if (queued) {
          queuedRenderRef.current = null;
          renderPage(queued.page, queued.s, queued.r);
        }
      });
    });
  }

  // Cleanup render task on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

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
        toast.error('Chyba při ukládání anotací');
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
          type: a.type as AnnotationTool,
          data: a.data,
        }))
      );
    }

    toast.success('Anotace uloženy');
    setSaving(false);
  }, [annotations, sheetVersionId]);

  // Delete all annotations (admin only)
  const handleDeleteAllAnnotations = useCallback(async () => {
    if (!confirm('Opravdu chcete smazat všechny anotace?')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('sheet_version_id', sheetVersionId);

    if (error) {
      toast.error('Chyba při mazání anotací');
      return;
    }

    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setDetailAnnotationId(null);
    toast.success('Všechny anotace smazány');
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

    const rect = e.currentTarget.getBoundingClientRect();
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

    toast.success('Měřítko kalibrováno');
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
    <div className={
      isFullscreen
        ? 'fixed inset-0 z-[60] flex gap-0 bg-background'
        : 'flex h-[calc(100dvh-180px)] lg:h-[calc(100vh-200px)] gap-0'
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
          title={isFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'}
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
          <span className="hidden lg:inline">Anotace</span>
        </Button>
        {showAnnotations && (
          <Button
            variant={showListView ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowListView(!showListView)}
            title="Seznam anotací"
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
            <span className="hidden lg:inline">Smazat vše</span>
          </Button>
        )}
        {!isFullscreen && (
          <Button variant="outline" size="sm" onClick={() => setShowCalibration(true)}>
            <Ruler className="mr-1 h-3.5 w-3.5" />
            <span className="hidden lg:inline">Kalibrace</span>
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
        {!isFullscreen && <span className="text-xs text-muted-foreground">ID: {sheetVersionId.slice(0, 8)}</span>}
      </div>

      {/* Annotation toolbar */}
      {showAnnotations && (
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
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
        className={cn('flex-1 overflow-auto rounded-lg border bg-muted/50', showListView && showAnnotations && 'hidden')}
        onClick={isCalibrating ? handleCalibrationClick : undefined}
        onTouchEnd={isCalibrating ? handleCalibrationClick : undefined}
        style={{
          cursor: isCalibrating ? 'crosshair' : undefined,
          touchAction: activeTool !== 'select' ? 'none' : undefined,
        }}
      >
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-muted-foreground">Načítání PDF... {loadProgress > 0 ? `${loadProgress}%` : ''}</p>
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
                ? 'Klikněte na první bod kóty'
                : 'Klikněte na druhý bod kóty'}
            </p>
          </div>
        )}
        <div
          ref={canvasWrapperRef}
          className="relative mx-auto inline-block"
          style={zoomPreview !== 1 ? {
            transform: `scale(${zoomPreview})`,
            transformOrigin: zoomOrigin ? `${zoomOrigin.x}px ${zoomOrigin.y}px` : 'center',
            willChange: 'transform',
          } : undefined}
        >
          <canvas ref={canvasRef} className="block" />
          {showPins && pageSize.width > 0 && sheetId && (() => {
            const MAX_KONVA = MAX_BUFFER;
            const effectiveScale = Math.min(scale, MAX_KONVA / Math.max(pageSize.width, pageSize.height));
            const ds = scale / effectiveScale;
            return (
              <TaskPinOverlay
                width={pageSize.width}
                height={pageSize.height}
                scale={effectiveScale}
                tasks={tasks}
                onTaskClick={() => {}}
                displayScale={ds}
              />
            );
          })()}
          {showAnnotations && pageSize.width > 0 && (() => {
            const MAX_KONVA = MAX_BUFFER;
            const effectiveScale = Math.min(scale, MAX_KONVA / Math.max(pageSize.width, pageSize.height));
            const ds = scale / effectiveScale;
            return (
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
              onSelectId={setSelectedId}
              onAnnotationClick={handleAnnotationClick}
              pixelsPerMeter={pixelsPerMeter}
              displayScale={ds}
            />
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

    {/* Annotation detail panel */}
    {detailAnnotationId && projectId && (
      <AnnotationDetailPanel
        annotationId={detailAnnotationId}
        projectId={projectId}
        sheetVersionId={sheetVersionId}
        onClose={() => setDetailAnnotationId(null)}
      />
    )}
    </div>
  );
}
