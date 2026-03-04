'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ArrowLeft, Check, Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
            Zpět
          </Button>
        )}
        <h2 className="text-lg font-semibold">
          {step === 'select' && 'Porovnat verze'}
          {step === 'align' && 'Zarovnat stránky'}
          {step === 'result' && 'Výsledek porovnání'}
        </h2>
        <div className="flex-1" />

        {step === 'align' && (
          <Button
            size="sm"
            onClick={() => setStep('result')}
          >
            <Check className="mr-1 h-4 w-4" />
            Potvrdit zarovnání
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
      <div className="flex-1 overflow-auto">
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

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="grid grid-cols-2 gap-8">
        {/* Side A */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-red-600">Strana A (základ)</h3>
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
          <h3 className="font-semibold text-blue-600">Strana B</h3>
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
          Pokračovat k zarovnání →
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
  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Sada výkresů</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={planSetId}
          onChange={(e) => setPlanSetId(e.target.value)}
        >
          <option value="">— vyberte —</option>
          {planSets.map(ps => (
            <option key={ps.id} value={ps.id}>{ps.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">List</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
          disabled={sheets.length === 0}
        >
          <option value="">— vyberte —</option>
          {sheets.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}{s.sheet_number ? ` (#${s.sheet_number})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Verze</Label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          disabled={versions.length === 0}
        >
          <option value="">— vyberte —</option>
          {[...versions].sort((a, b) => b.version_number - a.version_number).map(v => (
            <option key={v.id} value={v.id}>
              v{v.version_number}{v.is_current ? ' (aktuální)' : ''}
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
      setLoading(true);
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

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <span className="text-sm text-muted-foreground">
          Tip: Přetáhněte druhý plán a nastavte velikost
        </span>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Velikost:</Label>
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
          Resetovat
        </Button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 p-4"
      >
        {loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Načítání plánů...</p>
          </div>
        )}
        {!loading && (
          <div className="relative mx-auto inline-block">
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
        )}
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
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  // Render PDFs and compute diff
  useEffect(() => {
    let cancelled = false;
    async function render() {
      setLoading(true);
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

      // Render A
      if (canvasARef.current) {
        canvasARef.current.width = vpA.width;
        canvasARef.current.height = vpA.height;
        const ctx = canvasARef.current.getContext('2d');
        if (ctx) await pageA.render({ canvasContext: ctx, viewport: vpA }).promise;
      }

      // Render B
      if (canvasBRef.current) {
        canvasBRef.current.width = vpB.width;
        canvasBRef.current.height = vpB.height;
        const ctx = canvasBRef.current.getContext('2d');
        if (ctx) await pageB.render({ canvasContext: ctx, viewport: vpB }).promise;
      }

      // Compute diff with alignment
      if (diffCanvasRef.current && canvasARef.current && canvasBRef.current) {
        const w = vpA.width;
        const h = vpA.height;
        diffCanvasRef.current.width = w;
        diffCanvasRef.current.height = h;

        const ctx = diffCanvasRef.current.getContext('2d');
        const ctxA = canvasARef.current.getContext('2d');
        const ctxB = canvasBRef.current.getContext('2d');

        if (ctx && ctxA && ctxB) {
          const dataA = ctxA.getImageData(0, 0, canvasARef.current.width, canvasARef.current.height);
          const dataB = ctxB.getImageData(0, 0, canvasBRef.current.width, canvasBRef.current.height);
          const diffData = ctx.createImageData(w, h);

          const { offsetX, offsetY, scale: alignScale } = alignment;
          const bW = canvasBRef.current.width;
          const bH = canvasBRef.current.height;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const di = (y * w + x) * 4;

              // Pixel from A
              const aI = (y * canvasARef.current.width + x) * 4;
              const rA = x < canvasARef.current.width && y < canvasARef.current.height ? dataA.data[aI] : 255;
              const gA = x < canvasARef.current.width && y < canvasARef.current.height ? dataA.data[aI + 1] : 255;
              const bA = x < canvasARef.current.width && y < canvasARef.current.height ? dataA.data[aI + 2] : 255;

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
                  // A is darker → content in A (red)
                  diffData.data[di] = 239;
                  diffData.data[di + 1] = 68;
                  diffData.data[di + 2] = 68;
                  diffData.data[di + 3] = 180;
                } else {
                  // B is darker → content in B (blue)
                  diffData.data[di] = 59;
                  diffData.data[di + 1] = 130;
                  diffData.data[di + 2] = 246;
                  diffData.data[di + 3] = 180;
                }
              } else {
                // Same content – gray
                const avg = (rA + gA + bA) / 3;
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

      if (!cancelled) setLoading(false);
    }
    render();
    return () => { cancelled = true; };
  }, [fileUrlA, fileUrlB, alignment]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
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
            <span className="text-xs text-muted-foreground">Průhlednost:</span>
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
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" /> Strana A
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> Strana B
            </div>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-muted/50 p-4">
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Generování porovnání...</p>
          </div>
        )}

        {!loading && mode === 'diff' && (
          <canvas
            ref={diffCanvasRef}
            className="mx-auto block"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}

        {!loading && mode === 'overlay' && (
          <div className="relative mx-auto inline-block">
            <canvas
              ref={canvasARef}
              className="block"
              style={{ maxWidth: '100%', height: 'auto', opacity: 1 - overlayOpacity }}
            />
            <canvas
              ref={canvasBRef}
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

        {!loading && mode === 'side-by-side' && (
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="mb-2 text-center text-sm font-medium text-red-500">Strana A</p>
              <canvas
                ref={canvasARef}
                className="mx-auto block rounded border border-red-200"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-center text-sm font-medium text-blue-500">Strana B</p>
              <canvas
                ref={canvasBRef}
                className="mx-auto block rounded border border-blue-200"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvases for diff computation */}
      {mode === 'diff' && (
        <div className="hidden">
          <canvas ref={canvasARef} />
          <canvas ref={canvasBRef} />
        </div>
      )}
    </div>
  );
}
