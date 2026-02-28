'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UsePinchZoomOptions {
  enabled: boolean;
  /** Called once at the end of the pinch gesture with the final scale */
  onZoomChange: (newScale: number) => void;
  /** Called during the gesture with a CSS-only preview scale (no re-render) */
  onZoomPreview?: (previewScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export function usePinchZoom(
  containerRef: React.RefObject<HTMLElement | null>,
  { enabled, onZoomChange, onZoomPreview, minScale = 0.25, maxScale = 3 }: UsePinchZoomOptions
) {
  const lastDistRef = useRef<number | null>(null);
  const currentScaleRef = useRef(1);
  const gestureBaseScaleRef = useRef(1);
  const isPinchingRef = useRef(false);

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

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastDistRef.current = getDistance(e.touches[0], e.touches[1]);
        gestureBaseScaleRef.current = currentScaleRef.current;
        isPinchingRef.current = true;
      }
    }

    let rafId: number | null = null;

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const ratio = dist / lastDistRef.current;
        const newScale = Math.min(maxScale, Math.max(minScale, gestureBaseScaleRef.current * ratio));

        // Skip micro-changes
        if (Math.abs(newScale - currentScaleRef.current) < 0.01) return;

        currentScaleRef.current = newScale;

        // Throttle preview callbacks via rAF
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            onZoomPreviewRef.current?.(currentScaleRef.current);
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
        // Commit the final scale — triggers one renderPage
        onZoomChangeRef.current(currentScaleRef.current);
        onZoomPreviewRef.current?.(1); // reset CSS preview
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

  const setCurrentScale = useCallback((s: number) => {
    currentScaleRef.current = s;
  }, []);

  return { setCurrentScale };
}
