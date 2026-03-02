'use client';

import { useState, useEffect } from 'react';
import {
  Minus,
  Square,
  Circle,
  ArrowRight,
  Type,
  Highlighter,
  Pencil,
  Ruler,
  Grid3X3,
  Cloud,
  Link2,
  MousePointer2,
  MessageSquare,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@joubuild/shared';
import { cn } from '@/lib/utils';
import type { AnnotationData } from './annotation-overlay';

const ANNOTATION_TYPE_CONFIG: Record<string, { icon: typeof Minus; label: string }> = {
  line: { icon: Minus, label: 'Čára' },
  rectangle: { icon: Square, label: 'Obdélník' },
  ellipse: { icon: Circle, label: 'Elipsa' },
  cloud: { icon: Cloud, label: 'Oblak' },
  arrow: { icon: ArrowRight, label: 'Šipka' },
  text: { icon: Type, label: 'Text' },
  highlighter: { icon: Highlighter, label: 'Zvýrazňovač' },
  freehand: { icon: Pencil, label: 'Volná ruka' },
  measurement: { icon: Ruler, label: 'Měření' },
  area: { icon: Grid3X3, label: 'Plocha' },
  hyperlink: { icon: Link2, label: 'Hyperlink' },
  select: { icon: MousePointer2, label: 'Výběr' },
};

interface AnnotationListPanelProps {
  annotations: AnnotationData[];
  sheetVersionId: string;
  onAnnotationClick: (id: string) => void;
  selectedId: string | null;
}

export function AnnotationListPanel({
  annotations,
  sheetVersionId,
  onAnnotationClick,
  selectedId,
}: AnnotationListPanelProps) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [createdDates, setCreatedDates] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadMeta() {
      if (annotations.length === 0) return;

      const supabase = getSupabaseClient();
      const ids = annotations.map((a) => a.id);

      // Load comment counts
      const { data: comments } = await supabase
        .from('comments')
        .select('annotation_id')
        .in('annotation_id', ids);

      if (comments) {
        const counts: Record<string, number> = {};
        for (const c of comments) {
          counts[c.annotation_id] = (counts[c.annotation_id] || 0) + 1;
        }
        setCommentCounts(counts);
      }

      // Load creation dates
      const { data: annRows } = await supabase
        .from('annotations')
        .select('id, created_at')
        .in('id', ids);

      if (annRows) {
        const dates: Record<string, string> = {};
        for (const a of annRows) {
          dates[a.id] = a.created_at;
        }
        setCreatedDates(dates);
      }
    }

    loadMeta();
  }, [annotations, sheetVersionId]);

  if (annotations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Žádné anotace</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">
          Anotace ({annotations.length})
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        {annotations.map((ann) => {
          const config = ANNOTATION_TYPE_CONFIG[ann.type] || {
            icon: MousePointer2,
            label: ann.type,
          };
          const Icon = config.icon;
          const count = commentCounts[ann.id] || 0;
          const createdAt = createdDates[ann.id];

          return (
            <button
              key={ann.id}
              onClick={() => onAnnotationClick(ann.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent',
                selectedId === ann.id && 'bg-accent'
              )}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: ann.data.color + '20', color: ann.data.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{config.label}</span>
                  {ann.type === 'text' && ann.data.text && (
                    <span className="truncate text-xs text-muted-foreground">
                      &quot;{ann.data.text}&quot;
                    </span>
                  )}
                </div>
                {createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(createdAt)}
                  </p>
                )}
              </div>
              {count > 0 && (
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="text-xs">{count}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
