'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ArrowLeft, Check, Layers, RotateCcw, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Types (local, matching plans-view) ---

interface SheetVersion {
  id: string;
  version_number: number;
  file_url: string;
  thumbnail_url: string | null;
  is_current: boolean;
  created_at: string;
}

interface Sheet {
  id: string;
  name: string;
  sheet_number: string | null;
  sheet_versions: SheetVersion[];
}

interface PlanSet {
  id: string;
  name: string;
  sheets: Sheet[];
}

type Step = 'select' | 'align' | 'result';
type ResultMode = 'overlay' | 'side-by-side' | 'diff';

interface CrossCompareDialogProps {
  open: boolean;
  onClose: () => void;
  planSets: PlanSet[];
  initialPlanSetId?: string;
  initialSheetId?: string;
  initialVersionId?: string;
}

interface Alignment {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// --- Component ---

export function CrossCompareDialog({
  open,
  onClose,
  planSets,
  initialPlanSetId,
  initialSheetId,
  initialVersionId,
}: CrossCompareDialogProps) {
  const t = useTranslations('plans.crossCompareDialog');
  const tCommon = useTranslations('common');
  const [step, setStep] = useState<Step>('select');

  // Side A selections
  const [planSetIdA, setPlanSetIdA] = useState(initialPlanSetId ?? '');
  const [sheetIdA, setSheetIdA] = useState(initialSheetId ?? '');
  const [versionIdA, setVersionIdA] = useState(initialVersionId ?? '');

  // Side B selections
  const [planSetIdB, setPlanSetIdB] = useState('');
  const [sheetIdB, setSheetIdB] = useState('');
  const [versionIdB, setVersionIdB] = useState('');

  // Alignment
  const [alignment, setAlignment] = useState<Alignment>({ offsetX: 0, offsetY: 0, scale: 1 });

  // Result
  const [resultMode, setResultMode] = useState<ResultMode>('diff');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select');
      setPlanSetIdA(initialPlanSetId ?? '');
      setSheetIdA(initialSheetId ?? '');
      setVersionIdA(initialVersionId ?? '');
      setPlanSetIdB('');
      setSheetIdB('');
      setVersionIdB('');
      setAlignment({ offsetX: 0, offsetY: 0, scale: 1 });
      setResultMode('diff');
    }
  }, [open, initialPlanSetId, initialSheetId, initialVersionId]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Derived data
  const sheetsA = planSets.find(ps => ps.id === planSetIdA)?.sheets ?? [];
  const versionsA = sheetsA.find(s => s.id === sheetIdA)?.sheet_versions ?? [];
  const sheetsB = planSets.find(ps => ps.id === planSetIdB)?.sheets ?? [];
  const versionsB = sheetsB.find(s => s.id === sheetIdB)?.sheet_versions ?? [];

  const selectedVersionA = versionsA.find(v => v.id === versionIdA);
  const selectedVersionB = versionsB.find(v => v.id === versionIdB);

  const canProceedToAlign = !!selectedVersionA && !!selectedVersionB;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {step !== 'select' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(step === 'result' ? 'align' : 'select')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tCommon('back')}
          </Button>
        )}
        <h2 className="text-lg font-semibold">
          {step === 'select' && t('title')}
          {step === 'align' && t('alignPages')}
          {step === 'result' && t('result')}
        </h2>
        <div className="flex-1" />

        {step === 'align' && (
          <Button
            size="sm"
            onClick={() => setStep('result')}
          >
            <Check className="mr-1 h-4 w-4" />
            {t('confirmAlignment')}
          </Button>
        )}

        <button
          onClick={onClose}
          className="rounded-sm p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {step === 'select' && (
          <SelectStep
            planSets={planSets}
            planSetIdA={planSetIdA}
            setPlanSetIdA={(id) => { setPlanSetIdA(id); setSheetIdA(''); setVersionIdA(''); }}
            sheetIdA={sheetIdA}
            setSheetIdA={(id) => { setSheetIdA(id); setVersionIdA(''); }}
            versionIdA={versionIdA}
            setVersionIdA={setVersionIdA}
            sheetsA={sheetsA}
            versionsA={versionsA}
            planSetIdB={planSetIdB}
            setPlanSetIdB={(id) => { setPlanSetIdB(id); setSheetIdB(''); setVersionIdB(''); }}
            sheetIdB={sheetIdB}
            setSheetIdB={(id) => { setSheetIdB(id); setVersionIdB(''); }}
            versionIdB={versionIdB}
            setVersionIdB={setVersionIdB}
            sheetsB={sheetsB}
            versionsB={versionsB}
            canProceed={canProceedToAlign}
            onProceed={() => setStep('align')}
          />
        )}
        {step === 'align' && selectedVersionA && selectedVersionB && (
          <AlignStep
            fileUrlA={selectedVersionA.file_url}
            fileUrlB={selectedVersionB.file_url}
            alignment={alignment}
            setAlignment={setAlignment}
          />
        )}
        {step === 'result' && selectedVersionA && selectedVersionB && (
          <ResultStep
            fileUrlA={selectedVersionA.file_url}
            fileUrlB={selectedVersionB.file_url}
            alignment={alignment}
            mode={resultMode}
            setMode={setResultMode}
            overlayOpacity={overlayOpacity}
            setOverlayOpacity={setOverlayOpacity}
          />
        )}
      </div>
    </div>
  );
}

// ============================
// Step 1: Select
// ============================

function SelectStep({
  planSets,
  planSetIdA, setPlanSetIdA,
  sheetIdA, setSheetIdA,
  versionIdA, setVersionIdA,
  sheetsA, versionsA,
  planSetIdB, setPlanSetIdB,
  sheetIdB, setSheetIdB,
  versionIdB, setVersionIdB,
  sheetsB, versionsB,
  canProceed, onProceed,
}: {
  planSets: PlanSet[];
  planSetIdA: string; setPlanSetIdA: (id: string) => void;
  sheetIdA: string; setSheetIdA: (id: string) => void;
  versionIdA: string; setVersionIdA: (id: string) => void;
  sheetsA: Sheet[]; versionsA: SheetVersion[];
  planSetIdB: string; setPlanSetIdB: (id: string) => void;
  sheetIdB: string; setSheetIdB: (id: string) => void;
  versionIdB: string; setVersionIdB: (id: string) => void;
  sheetsB: Sheet[]; versionsB: SheetVersion[];
  canProceed: boolean; onProceed: () => void;
}) {
  // Auto-select current version when sheet changes (side A)
  useEffect(() => {
    if (sheetIdA && versionsA.length > 0 && !versionIdA) {
      const current = versionsA.find(v => v.is_current) ?? versionsA[0];
      setVersionIdA(current.id);
    }
  }, [sheetIdA, versionsA, versionIdA, setVersionIdA]);

  // Auto-select current version when sheet changes (side B)
  useEffect(() => {
    if (sheetIdB && versionsB.length > 0 && !versionIdB) {
      const current = versionsB.find(v => v.is_current) ?? versionsB[0];
      setVersionIdB(current.id);
    }
  }, [sheetIdB, versionsB, versionIdB, setVersionIdB]);

  const t = useTranslations('plans.crossCompareDialog');

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="grid grid-cols-2 gap-8">
        {/* Side A */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-red-600">{t('sideABase')}</h3>
          <CascadeSelects
            planSets={planSets}
            planSetId={planSetIdA}
            setPlanSetId={setPlanSetIdA}
            sheets={sheetsA}
            sheetId={sheetIdA}
            setSheetId={setSheetIdA}
            versions={versionsA}
            versionId={versionIdA}
            setVersionId={setVersionIdA}
          />
        </div>
        {/* Side B */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-blue-600">{t('sideB')}</h3>
          <CascadeSelects
            planSets={planSets}
            planSetId={planSetIdB}
            setPlanSetId={setPlanSetIdB}
            sheets={sheetsB}
            sheetId={sheetIdB}
            setSheetId={setSheetIdB}
            versions={versionsB}
            versionId={versionIdB}
            setVersionId={setVersionIdB}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button size="lg" disabled={!canProceed} onClick={onProceed}>
          {t('proceedToAlign')} →
        </Button>
      </div>
    </div>
  );
}

function CascadeSelects({
  planSets,
  planSetId, setPlanSetId,
  sheets, sheetId, setSheetId,
  versions, versionId, setVersionId,
}: {
  planSets: PlanSet[];
  planSetId: string; setPlanSetId: (id: string) => void;
  sheets: Sheet[]; sheetId: string; setSheetId: (id: string) => void;
  versions: SheetVersion[]; versionId: string; setVersionId: (id: string) => void;
}) {
  const t = useTranslations('plans.crossCompareDialog');

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{t('planSetLabel')}</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={planSetId}
          onChange={(e) => setPlanSetId(e.target.value)}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {planSets.map(ps => (
            <option key={ps.id} value={ps.id}>{ps.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t('sheetLabel')}</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
          disabled={sheets.length === 0}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {sheets.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}{s.sheet_number ? ` (#${s.sheet_number})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t('versionLabel')}</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          disabled={versions.length === 0}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {[...versions].sort((a, b) => b.version_number - a.version_number).map(v => (
            <option key={v.id} value={v.id}>
              v{v.version_number}{v.is_current ? ` ${t('currentLabel')}` : ''}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// ============================
// Step 2: Align
// ============================

function AlignStep({
  fileUrlA,
  fileUrlB,
  alignment,
  setAlignment,
}: {
  fileUrlA: string;
  fileUrlB: string;
  alignment: Alignment;
  setAlignment: (a: Alignment) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSizeA, setCanvasSizeA] = useState({ w: 0, h: 0 });
  const [cssDisplaySize, setCssDisplaySize] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  // Local alignment state for smooth dragging
  const [localOffset, setLocalOffset] = useState({ x: alignment.offsetX, y: alignment.offsetY });
  const [localScale, setLocalScale] = useState(alignment.scale);

  // Render both PDFs
  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const [pdfA, pdfB] = await Promise.all([
          pdfjsLib.getDocument(fileUrlA).promise,
          pdfjsLib.getDocument(fileUrlB).promise,
        ]);
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [pageA, pageB]: [any, any] = await Promise.all([
          pdfA.getPage(1),
          pdfB.getPage(1),
        ]);
        if (cancelled) return;

        const scale = 1.5;
        const vpA = pageA.getViewport({ scale });
        const vpB = pageB.getViewport({ scale });

        if (canvasARef.current) {
          canvasARef.current.width = vpA.width;
          canvasARef.current.height = vpA.height;
          const ctx = canvasARef.current.getContext('2d');
          if (ctx) await pageA.render({ canvasContext: ctx, viewport: vpA }).promise;
          setCanvasSizeA({ w: vpA.width, h: vpA.height });
        }

        if (canvasBRef.current) {
          canvasBRef.current.width = vpB.width;
          canvasBRef.current.height = vpB.height;
          const ctx = canvasBRef.current.getContext('2d');
          if (ctx) await pageB.render({ canvasContext: ctx, viewport: vpB }).promise;
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'PDF load error');
          setLoading(false);
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [fileUrlA, fileUrlB]);

  // Track CSS display size of canvas A for coordinate conversion
  useEffect(() => {
    if (!canvasARef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCssDisplaySize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(canvasARef.current);
    return () => observer.disconnect();
  }, [loading]);

  // Pointer handlers for dragging plan B
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = { x: localOffset.x, y: localOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [localOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setLocalOffset({
      x: offsetAtDragStart.current.x + dx,
      y: offsetAtDragStart.current.y + dy,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    // Sync to parent alignment (convert CSS px to canvas px)
    if (cssDisplaySize.w > 0) {
      const ratio = canvasSizeA.w / cssDisplaySize.w;
      setAlignment({
        offsetX: localOffset.x * ratio,
        offsetY: localOffset.y * ratio,
        scale: localScale,
      });
    }
  }, [localOffset, localScale, canvasSizeA, cssDisplaySize, setAlignment]);

  const handleScaleChange = useCallback((newScale: number) => {
    setLocalScale(newScale);
    if (cssDisplaySize.w > 0) {
      const ratio = canvasSizeA.w / cssDisplaySize.w;
      setAlignment({
        offsetX: localOffset.x * ratio,
        offsetY: localOffset.y * ratio,
        scale: newScale,
      });
    }
  }, [localOffset, canvasSizeA, cssDisplaySize, setAlignment]);

  const handleReset = useCallback(() => {
    setLocalOffset({ x: 0, y: 0 });
    setLocalScale(1);
    setAlignment({ offsetX: 0, offsetY: 0, scale: 1 });
  }, [setAlignment]);

  const t = useTranslations('plans.crossCompareDialog');

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {t('tipDragAlign')}
        </span>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{t('sizeLabel')}:</Label>
          <span className="w-10 text-right text-xs">{Math.round(localScale * 100)}%</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            value={localScale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          {t('resetAlignment')}
        </Button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4"
      >
        {loading && !error && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t('loadingPlans')}</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-destructive font-medium">{t('loadErrorTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}
        <div
          className="relative mx-auto inline-block"
          style={{ display: loading || error ? 'none' : undefined }}
        >
          {/* Plan A – fixed, full opacity */}
          <canvas
            ref={canvasARef}
            className="block"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          {/* Plan B – draggable overlay */}
          <div
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <canvas
              ref={canvasBRef}
              className="block origin-top-left cursor-move"
              style={{
                maxWidth: '100%',
                height: 'auto',
                opacity: 0.5,
                transform: `translate(${localOffset.x}px, ${localOffset.y}px) scale(${localScale})`,
                transformOrigin: '0 0',
                pointerEvents: 'auto',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================
// Step 3: Result
// ============================

function ResultStep({
  fileUrlA,
  fileUrlB,
  alignment,
  mode,
  setMode,
  overlayOpacity,
  setOverlayOpacity,
}: {
  fileUrlA: string;
  fileUrlB: string;
  alignment: Alignment;
  mode: ResultMode;
  setMode: (m: ResultMode) => void;
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;
}) {
  const [renderedA, setRenderedA] = useState<string | null>(null);
  const [renderedB, setRenderedB] = useState<string | null>(null);
  const [renderedDiff, setRenderedDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = useTranslations('plans.crossCompareDialog');
  const tCommon = useTranslations('common');

  // Zoom/pan state
  const [viewScale, setViewScale] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewScale((prev) => {
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      return Math.min(5, Math.max(0.25, prev + delta));
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setViewScale((prev) => Math.min(5, prev + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewScale((prev) => Math.max(0.25, prev - 0.25));
  }, []);

  const handleResetView = useCallback(() => {
    setViewScale(1);
    setViewOffset({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleViewPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = { x: viewOffset.x, y: viewOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewOffset]);

  const handleViewPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewOffset({
      x: offsetAtDragStart.current.x + dx,
      y: offsetAtDragStart.current.y + dy,
    });
  }, []);

  const handleViewPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Render PDFs to offscreen canvases and store as data URLs
  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const [pdfA, pdfB] = await Promise.all([
          pdfjsLib.getDocument(fileUrlA).promise,
          pdfjsLib.getDocument(fileUrlB).promise,
        ]);
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [pageA, pageB]: [any, any] = await Promise.all([
          pdfA.getPage(1),
          pdfB.getPage(1),
        ]);
        if (cancelled) return;

        const scale = 1.5;
        const vpA = pageA.getViewport({ scale });
        const vpB = pageB.getViewport({ scale });

        // Render A to offscreen canvas
        const canvasA = document.createElement('canvas');
        canvasA.width = vpA.width;
        canvasA.height = vpA.height;
        const ctxA = canvasA.getContext('2d')!;
        await pageA.render({ canvasContext: ctxA, viewport: vpA }).promise;

        // Render B to offscreen canvas
        const canvasB = document.createElement('canvas');
        canvasB.width = vpB.width;
        canvasB.height = vpB.height;
        const ctxB = canvasB.getContext('2d')!;
        await pageB.render({ canvasContext: ctxB, viewport: vpB }).promise;

        if (cancelled) return;

        // Compute diff with alignment
        const w = vpA.width;
        const h = vpA.height;
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = w;
        diffCanvas.height = h;
        const ctx = diffCanvas.getContext('2d')!;

        const dataA = ctxA.getImageData(0, 0, canvasA.width, canvasA.height);
        const dataB = ctxB.getImageData(0, 0, canvasB.width, canvasB.height);
        const diffData = ctx.createImageData(w, h);

        const { offsetX, offsetY, scale: alignScale } = alignment;
        const bW = canvasB.width;
        const bH = canvasB.height;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const di = (y * w + x) * 4;

            // Pixel from A
            const aI = (y * canvasA.width + x) * 4;
            const rA = x < canvasA.width && y < canvasA.height ? dataA.data[aI] : 255;
            const gA = x < canvasA.width && y < canvasA.height ? dataA.data[aI + 1] : 255;
            const bA = x < canvasA.width && y < canvasA.height ? dataA.data[aI + 2] : 255;

            // Pixel from B (with alignment transform)
            const bx = Math.round((x - offsetX) / alignScale);
            const by = Math.round((y - offsetY) / alignScale);
            let rB = 255, gB = 255, bB2 = 255;
            if (bx >= 0 && bx < bW && by >= 0 && by < bH) {
              const bI = (by * bW + bx) * 4;
              rB = dataB.data[bI];
              gB = dataB.data[bI + 1];
              bB2 = dataB.data[bI + 2];
            }

            const diff = (Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB2)) / 3;

            if (diff > 30) {
              const brightA = (rA + gA + bA) / 3;
              const brightB = (rB + gB + bB2) / 3;

              if (brightA < brightB) {
                diffData.data[di] = 239;
                diffData.data[di + 1] = 68;
                diffData.data[di + 2] = 68;
                diffData.data[di + 3] = 180;
              } else {
                diffData.data[di] = 59;
                diffData.data[di + 1] = 130;
                diffData.data[di + 2] = 246;
                diffData.data[di + 3] = 180;
              }
            } else {
              const avg = (rA + gA + bA) / 3;
              diffData.data[di] = avg;
              diffData.data[di + 1] = avg;
              diffData.data[di + 2] = avg;
              diffData.data[di + 3] = 255;
            }
          }
        }

        ctx.putImageData(diffData, 0, 0);

        if (!cancelled) {
          setRenderedA(canvasA.toDataURL());
          setRenderedB(canvasB.toDataURL());
          setRenderedDiff(diffCanvas.toDataURL());
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'PDF load error');
          setLoading(false);
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [fileUrlA, fileUrlB, alignment]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as ResultMode)} defaultValue="diff">
          <TabsList>
            <TabsTrigger value="overlay">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {t('overlay')}
            </TabsTrigger>
            <TabsTrigger value="side-by-side">
              {t('sideBySide')}
            </TabsTrigger>
            <TabsTrigger value="diff">
              {t('differences')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'overlay' && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <span className="text-xs text-muted-foreground">{tCommon('transparency')}:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-24"
            />
          </>
        )}

        {mode === 'diff' && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> {t('sideALabel')}
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> {t('sideBLabel')}
            </div>
          </>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(viewScale * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleResetView}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas area with zoom/pan */}
      <div
        className="min-h-0 flex-1 overflow-hidden bg-muted/50"
        style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onPointerDown={handleViewPointerDown}
        onPointerMove={handleViewPointerMove}
        onPointerUp={handleViewPointerUp}
      >
        {loading && !error && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t('generating')}</p>
          </div>
        )}

        {error && (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-destructive font-medium">{t('loadErrorTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div style={{
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${viewScale})`,
            transformOrigin: '0 0',
            padding: '1rem',
          }}>
            {mode === 'diff' && renderedDiff && (
              <img
                src={renderedDiff}
                alt="Diff"
                className="mx-auto block"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            )}

            {mode === 'overlay' && renderedA && renderedB && (
              <div className="relative mx-auto inline-block">
                <img
                  src={renderedA}
                  alt="Plan A"
                  className="block"
                  style={{ maxWidth: '100%', height: 'auto', opacity: 1 - overlayOpacity }}
                />
                <img
                  src={renderedB}
                  alt="Plan B"
                  className="absolute left-0 top-0 block"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    opacity: overlayOpacity,
                    mixBlendMode: 'multiply',
                    transform: `translate(${alignment.offsetX}px, ${alignment.offsetY}px) scale(${alignment.scale})`,
                    transformOrigin: '0 0',
                  }}
                />
              </div>
            )}

            {mode === 'side-by-side' && renderedA && renderedB && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="mb-2 text-center text-sm font-medium text-red-500">{t('sideALabel')}</p>
                  <img
                    src={renderedA}
                    alt="Plan A"
                    className="mx-auto block rounded border border-red-200"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
                <div className="flex-1">
                  <p className="mb-2 text-center text-sm font-medium text-blue-500">{t('sideBLabel')}</p>
                  <img
                    src={renderedB}
                    alt="Plan B"
                    className="mx-auto block rounded border border-blue-200"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
