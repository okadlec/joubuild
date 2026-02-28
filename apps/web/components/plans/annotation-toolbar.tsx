'use client';

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
}

const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#000000', '#FFFFFF'];
const STROKE_WIDTHS = [1, 2, 3, 5, 8];

const tools: { tool: AnnotationTool; icon: typeof MousePointer2; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Výběr' },
  { tool: 'line', icon: Minus, label: 'Čára' },
  { tool: 'rectangle', icon: Square, label: 'Obdélník' },
  { tool: 'ellipse', icon: Circle, label: 'Elipsa' },
  { tool: 'cloud', icon: Cloud, label: 'Oblak' },
  { tool: 'arrow', icon: ArrowRight, label: 'Šipka' },
  { tool: 'text', icon: Type, label: 'Text' },
  { tool: 'highlighter', icon: Highlighter, label: 'Zvýrazňovač' },
  { tool: 'freehand', icon: Pencil, label: 'Volná ruka' },
  { tool: 'measurement', icon: Ruler, label: 'Měření' },
  { tool: 'area', icon: Grid3X3, label: 'Plocha' },
  { tool: 'hyperlink', icon: Link2, label: 'Hyperlink' },
];

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
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1.5 shadow-sm">
      {/* Tools */}
      {tools.map(({ tool, icon: Icon, label }) => (
        <Button
          key={tool}
          variant={activeTool === tool ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onToolChange(tool)}
          title={label}
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
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo} title="Zpět">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo} title="Vpřed">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeleteSelected} disabled={!hasSelection} title="Smazat">
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save className="mr-1 h-3.5 w-3.5" />
        {saving ? 'Ukládání...' : 'Uložit'}
      </Button>
    </div>
  );
}
