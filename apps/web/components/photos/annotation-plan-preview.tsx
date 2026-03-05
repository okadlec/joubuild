'use client';

import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnnotationPlanPreviewProps {
  projectId: string;
  sheetId: string;
  sheetName: string;
  annotationId: string;
  annotationType: string;
  annotationData: Record<string, unknown>;
  thumbnailUrl: string | null;
  sheetWidth: number | null;
  sheetHeight: number | null;
  planSetName?: string | null;
  onNavigate?: () => void;
}

/** Compute the center point of an annotation (in PDF coordinate space). */
function getAnnotationCenter(type: string, data: Record<string, unknown>): { x: number; y: number } | null {
  switch (type) {
    case 'rectangle':
    case 'cloud':
    case 'area': {
      const x = (data.x as number) ?? 0;
      const y = (data.y as number) ?? 0;
      const w = (data.width as number) ?? 0;
      const h = (data.height as number) ?? 0;
      return { x: x + w / 2, y: y + h / 2 };
    }
    case 'ellipse': {
      return { x: (data.x as number) ?? 0, y: (data.y as number) ?? 0 };
    }
    case 'text': {
      return { x: (data.x as number) ?? 0, y: (data.y as number) ?? 0 };
    }
    case 'line':
    case 'arrow':
    case 'freehand':
    case 'measurement': {
      const points = data.points as number[] | undefined;
      if (points && points.length >= 2) {
        let sumX = 0, sumY = 0;
        const count = Math.floor(points.length / 2);
        for (let i = 0; i < points.length; i += 2) {
          sumX += points[i];
          sumY += points[i + 1];
        }
        return { x: sumX / count, y: sumY / count };
      }
      return null;
    }
    default:
      return null;
  }
}

export function AnnotationPlanPreview({
  projectId,
  sheetId,
  sheetName,
  annotationId,
  annotationType,
  annotationData,
  thumbnailUrl,
  sheetWidth,
  sheetHeight,
  planSetName,
  onNavigate,
}: AnnotationPlanPreviewProps) {
  const router = useRouter();

  const center = getAnnotationCenter(annotationType, annotationData);

  console.log('[AnnotationPlanPreview] render:', {
    annotationType,
    annotationData,
    thumbnailUrl,
    sheetWidth,
    sheetHeight,
    center,
  });

  let pinLeftPct = 50;
  let pinTopPct = 50;
  if (center && sheetWidth && sheetHeight) {
    pinLeftPct = Math.max(0, Math.min(100, (center.x / sheetWidth) * 100));
    pinTopPct = Math.max(0, Math.min(100, (center.y / sheetHeight) * 100));
  }

  const handleClick = () => {
    router.push(`/project/${projectId}/plans?sheet=${sheetId}&annotation=${annotationId}`);
    onNavigate?.();
  };

  return (
    <button
      onClick={handleClick}
      className="group w-full rounded-lg border bg-muted/30 p-2 text-left transition-colors hover:bg-muted/60"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={sheetName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Náhled nedostupný
          </div>
        )}
        {/* Orange pin at annotation position */}
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${pinLeftPct}%`, top: `${pinTopPct}%` }}
        >
          <MapPin className="h-6 w-6 fill-orange-500 text-orange-600 drop-shadow-md" />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        <span className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">
          {sheetName}
        </span>
        {planSetName && (
          <span className="truncate text-xs text-muted-foreground">
            / {planSetName}
          </span>
        )}
      </div>
    </button>
  );
}
