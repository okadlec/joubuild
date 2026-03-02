'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ZoomPreviewInfo {
  scale: number;
  originX: number;
  originY: number;
}

interface UsePinchZoomOptions {
  enabled: boolean;
  /** Called once at the end of the pinch gesture with the final scale */
  onZoomChange: (newScale: number) => void;
  /** Called during the gesture with CSS preview ratio and finger midpoint */
  onZoomPreview?: (info: ZoomPreviewInfo) => void;
  minScale?: number;
  maxScale?: number;
}

export function usePinchZoom(
  containerRef: React.RefObject<HTMLElement | null>,
  { enabled, onZoomChange, onZoomPreview, minScale = 0.25, maxScale = 3 }: UsePinchZoomOptions
) {
  // committedScale = last scale that was fully rendered (canvas)
  // currentScale = live scale during gesture (CSS preview only)
  const committedScaleRef = useRef(1);
  const currentScaleRef = useRef(1);
  const lastDistRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  const midpointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onZoomPreviewRef = useRef(onZoomPreview);
  onZoomPreviewRef.current = onZoomPreview;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const el = containerRef.current;

    function getDistance(t1: Touch, t2: Touch) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getMidpoint(t1: Touch, t2: Touch, container: HTMLElement) {
      const rect = container.getBoundingClientRect();
      return {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastDistRef.current = getDistance(e.touches[0], e.touches[1]);
        midpointRef.current = getMidpoint(e.touches[0], e.touches[1], el);
        // Snapshot the current scale as the base for this gesture
        committedScaleRef.current = currentScaleRef.current;
        isPinchingRef.current = true;
      }
    }

    let rafId: number | null = null;

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const ratio = dist / lastDistRef.current;
        const newScale = Math.min(maxScale, Math.max(minScale, committedScaleRef.current * ratio));

        // Skip micro-changes
        if (Math.abs(newScale - currentScaleRef.current) < 0.01) return;

        currentScaleRef.current = newScale;

        // Throttle preview callbacks via rAF
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            // Preview ratio = live scale / committed scale (for CSS transform)
            const previewRatio = currentScaleRef.current / committedScaleRef.current;
            onZoomPreviewRef.current?.({
              scale: previewRatio,
              originX: midpointRef.current.x,
              originY: midpointRef.current.y,
            });
          });
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2 && isPinchingRef.current) {
        isPinchingRef.current = false;
        lastDistRef.current = null;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // Commit immediately — no debounce (canvas render is already throttled via renderPage queue)
        onZoomChangeRef.current(currentScaleRef.current);
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [enabled, containerRef, minScale, maxScale]);

  /** Sync both refs when scale is set externally (e.g. button zoom, initial load) */
  const setCurrentScale = useCallback((s: number) => {
    currentScaleRef.current = s;
    committedScaleRef.current = s;
  }, []);

  /** Reset preview state — call before button-driven zoom changes */
  const resetPreview = useCallback(() => {
    committedScaleRef.current = currentScaleRef.current;
  }, []);

  return { setCurrentScale, resetPreview };
}
