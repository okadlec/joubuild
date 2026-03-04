'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MousePointer2,
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
  Trash2,
  Undo2,
  Redo2,
  Save,
  Check,
  Loader2,
  MoreHorizontal,
  X,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export type AnnotationTool =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'cloud'
  | 'arrow'
  | 'text'
  | 'highlighter'
  | 'freehand'
  | 'measurement'
  | 'area'
  | 'hyperlink';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDeleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  saving: boolean;
  autoSaveStatus?: 'idle' | 'saving' | 'saved';
}

const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#000000', '#FFFFFF'];
const STROKE_WIDTHS = [1, 2, 3, 5, 8];

const TOOL_DEFS: { tool: AnnotationTool; icon: typeof MousePointer2; labelKey: string }[] = [
  { tool: 'select', icon: MousePointer2, labelKey: 'select' },
  { tool: 'line', icon: Minus, labelKey: 'line' },
  { tool: 'rectangle', icon: Square, labelKey: 'rectangle' },
  { tool: 'ellipse', icon: Circle, labelKey: 'ellipse' },
  { tool: 'cloud', icon: Cloud, labelKey: 'cloud' },
  { tool: 'arrow', icon: ArrowRight, labelKey: 'arrow' },
  { tool: 'text', icon: Type, labelKey: 'text' },
  { tool: 'highlighter', icon: Highlighter, labelKey: 'highlighter' },
  { tool: 'freehand', icon: Pencil, labelKey: 'freehand' },
  { tool: 'measurement', icon: Ruler, labelKey: 'measurement' },
  { tool: 'area', icon: Grid3X3, labelKey: 'area' },
  { tool: 'hyperlink', icon: Link2, labelKey: 'hyperlink' },
];

// Primary tools for mobile quick access
const PRIMARY_MOBILE_TOOLS: AnnotationTool[] = ['select', 'freehand', 'rectangle', 'arrow', 'text', 'highlighter'];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onSave,
  onDeleteSelected,
  canUndo,
  canRedo,
  hasSelection,
  saving,
  autoSaveStatus = 'idle',
}: AnnotationToolbarProps) {
  const t = useTranslations('plans.toolbar');
  const tTypes = useTranslations('plans.annotationTypes');
  const tCommon = useTranslations('common');
  const isMobile = useIsMobile();
  const [showAllTools, setShowAllTools] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);

  const getToolLabel = (key: string) => {
    if (key === 'select') return t('select');
    if (key === 'hyperlink') return t('hyperlink');
    return tTypes(key);
  };

  if (isMobile) {
    return (
      <>
        {/* Floating action buttons (top) */}
        <div className="flex items-center justify-between gap-1 px-1">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
            {hasSelection && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onDeleteSelected}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button size="sm" onClick={onSave} disabled={saving} className="h-9">
            {autoSaveStatus === 'saving' ? (
              <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />...</>
            ) : autoSaveStatus === 'saved' ? (
              <><Check className="mr-1 h-3.5 w-3.5 text-green-500" />{t('saved')}</>
            ) : (
              <><Save className="mr-1 h-3.5 w-3.5" />{saving ? '...' : tCommon('save')}</>
            )}
          </Button>
        </div>

        {/* Style options row (expandable) */}
        {showStyleOptions && (
          <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
            <div className="flex gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 touch-target flex items-center justify-center',
                    activeColor === color ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                />
              ))}
            </div>
            <div className="mx-1 h-6 w-px bg-border" />
            <div className="flex gap-1">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded touch-target',
                    strokeWidth === w ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => onStrokeWidthChange(w)}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: Math.max(w * 2, 4), height: Math.max(w * 2, 4) }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile bottom tool bar */}
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1.5 shadow-sm">
          {TOOL_DEFS
            .filter((td) => PRIMARY_MOBILE_TOOLS.includes(td.tool))
            .map(({ tool, icon: Icon }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10 touch-target"
                onClick={() => onToolChange(tool)}
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}

          <Button
            variant={showAllTools ? 'default' : 'ghost'}
            size="icon"
            className="h-10 w-10 touch-target"
            onClick={() => setShowAllTools(!showAllTools)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>

          <Button
            variant={showStyleOptions ? 'default' : 'ghost'}
            size="icon"
            className="h-10 w-10 touch-target"
            onClick={() => setShowStyleOptions(!showStyleOptions)}
          >
            <Palette className="h-5 w-5" />
          </Button>
        </div>

        {/* All tools grid overlay */}
        {showAllTools && (
          <div className="rounded-lg border bg-background p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">{t('allTools')}</span>
              <button onClick={() => setShowAllTools(false)} className="rounded p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {TOOL_DEFS.map(({ tool, icon: Icon, labelKey }) => (
                <button
                  key={tool}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg p-2 touch-target',
                    activeTool === tool ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                  onClick={() => {
                    onToolChange(tool);
                    setShowAllTools(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium leading-tight">{getToolLabel(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1.5 shadow-sm">
      {/* Tools */}
      {TOOL_DEFS.map(({ tool, icon: Icon, labelKey }) => (
        <Button
          key={tool}
          variant={activeTool === tool ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onToolChange(tool)}
          title={getToolLabel(labelKey)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Colors */}
      <div className="flex gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform',
              activeColor === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
          />
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Stroke width */}
      <div className="flex gap-0.5">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded transition-colors',
              strokeWidth === w ? 'bg-accent' : 'hover:bg-accent/50'
            )}
            onClick={() => onStrokeWidthChange(w)}
            title={`${w}px`}
          >
            <div
              className="rounded-full bg-foreground"
              style={{ width: Math.max(w * 2, 4), height: Math.max(w * 2, 4) }}
            />
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Actions */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo} title={t('undo')}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo} title={t('redo')}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeleteSelected} disabled={!hasSelection} title={tCommon('delete')}>
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button size="sm" onClick={onSave} disabled={saving}>
        {autoSaveStatus === 'saving' ? (
          <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />{t('saving')}</>
        ) : autoSaveStatus === 'saved' ? (
          <><Check className="mr-1 h-3.5 w-3.5 text-green-500" />{t('saved')}</>
        ) : (
          <><Save className="mr-1 h-3.5 w-3.5" />{saving ? t('saving') : tCommon('save')}</>
        )}
      </Button>
    </div>
  );
}
