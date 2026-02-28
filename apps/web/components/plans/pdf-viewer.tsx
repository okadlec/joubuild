'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Ruler, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { AnnotationToolbar, type AnnotationTool } from './annotation-toolbar';
import { AnnotationOverlay, type AnnotationData } from './annotation-overlay';
import { CalibrationDialog } from './calibration-dialog';
import { TaskPinOverlay } from './task-pin-overlay';
import { AnnotationDetailPanel } from './annotation-detail-panel';
import { usePinchZoom } from '@/lib/hooks/use-pinch-zoom';
import { getOfflinePdfData } from '@/lib/offline/pdf-offline';
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

  // Task pin state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPins, setShowPins] = useState(true);

  // Annotation detail panel state
  const [detailAnnotationId, setDetailAnnotationId] = useState<string | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // CSS transform preview for pinch-zoom (no re-render during gesture)
  const [zoomPreview, setZoomPreview] = useState(1);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Render dedup ref
  const renderPendingRef = useRef(false);

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
    setZoomPreview(1); // reset CSS preview
    setScale(newScale);
  }, []);

  const { setCurrentScale } = usePinchZoom(containerRef, {
    enabled: activeTool === 'select',
    onZoomChange: handlePinchZoom,
    onZoomPreview: (ps) => {
      // During gesture: apply CSS transform ratio relative to current rendered scale
      if (ps === 1) {
        setZoomPreview(1);
      } else {
        setZoomPreview(ps / scale);
      }
    },
  });

  // Keep pinch-zoom in sync with button-driven scale changes
  useEffect(() => {
    setCurrentScale(scale);
  }, [scale, setCurrentScale]);

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
  function renderPage(page: any, s: number, r: number) {
    if (renderPendingRef.current) return; // skip if already pending
    renderPendingRef.current = true;

    requestAnimationFrame(() => {
      renderPendingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: s, rotation: r });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      page.render({ canvasContext: ctx, viewport });

      // Update page size for annotation overlay
      const baseViewport = page.getViewport({ scale: 1, rotation: r });
      setPageSize({ width: baseViewport.width, height: baseViewport.height });
    });
  }

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
    setSaving(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Delete existing annotations for this sheet version
    await supabase
      .from('annotations')
      .delete()
      .eq('sheet_version_id', sheetVersionId);

    // Insert all current annotations
    if (annotations.length > 0) {
      const { error } = await supabase.from('annotations').insert(
        annotations.map((a) => ({
          sheet_version_id: sheetVersionId,
          type: a.type,
          data: a.data,
          created_by: user?.id,
        }))
      );

      if (error) {
        toast.error('Chyba při ukládání anotací');
        setSaving(false);
        return;
      }
    }

    toast.success('Anotace uloženy');
    setSaving(false);
  }, [annotations, sheetVersionId]);

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
        <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.25, s - 0.25))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[60px] text-center text-sm">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(4, s + 0.25))}>
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
        />
      )}

      {/* Canvas + Annotation overlay */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-lg border bg-muted/50"
        onClick={isCalibrating ? handleCalibrationClick : undefined}
        onTouchEnd={isCalibrating ? handleCalibrationClick : undefined}
        style={{ cursor: isCalibrating ? 'crosshair' : undefined }}
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
          className="relative mx-auto inline-block origin-center"
          style={zoomPreview !== 1 ? { transform: `scale(${zoomPreview})`, willChange: 'transform' } : undefined}
        >
          <canvas ref={canvasRef} className="block" />
          {showPins && pageSize.width > 0 && sheetId && (
            <TaskPinOverlay
              width={pageSize.width}
              height={pageSize.height}
              scale={scale}
              tasks={tasks}
              onTaskClick={() => {}}
            />
          )}
          {showAnnotations && pageSize.width > 0 && (
            <AnnotationOverlay
              width={pageSize.width}
              height={pageSize.height}
              scale={scale}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              annotations={annotations}
              onAnnotationsChange={handleAnnotationsChange}
              selectedId={selectedId}
              onSelectId={setSelectedId}
              onAnnotationClick={(id) => setDetailAnnotationId(id)}
              pixelsPerMeter={pixelsPerMeter}
            />
          )}
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
