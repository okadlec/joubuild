'use client';

import { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Arrow, Text } from 'react-konva';
import { Pencil, Circle as CircleIcon, ArrowRight, Type, Undo2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MarkupTool = 'freehand' | 'circle' | 'arrow' | 'text';

interface MarkupShape {
  id: string;
  tool: MarkupTool;
  color: string;
  points?: number[];
  x?: number;
  y?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  text?: string;
}

interface PhotoMarkupProps {
  imageUrl: string;
  width: number;
  height: number;
  initialMarkup?: MarkupShape[];
  onSave: (shapes: MarkupShape[]) => void;
  onClose: () => void;
}

const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#000000'];
const TOOLS: { tool: MarkupTool; icon: typeof Pencil; label: string }[] = [
  { tool: 'freehand', icon: Pencil, label: 'Kresba' },
  { tool: 'circle', icon: CircleIcon, label: 'Kruh' },
  { tool: 'arrow', icon: ArrowRight, label: 'Šipka' },
  { tool: 'text', icon: Type, label: 'Text' },
];

export function PhotoMarkup({ imageUrl, width, height, initialMarkup = [], onSave, onClose }: PhotoMarkupProps) {
  const [shapes, setShapes] = useState<MarkupShape[]>(initialMarkup);
  const [activeTool, setActiveTool] = useState<MarkupTool>('freehand');
  const [activeColor, setActiveColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const currentShapeRef = useRef<MarkupShape | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = useCallback((e: any) => {
    const stage = e.target?.getStage?.();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    setIsDrawing(true);
    const id = `shape-${Date.now()}`;

    if (activeTool === 'freehand') {
      currentShapeRef.current = { id, tool: 'freehand', color: activeColor, points: [pos.x, pos.y] };
    } else if (activeTool === 'circle') {
      currentShapeRef.current = { id, tool: 'circle', color: activeColor, x: pos.x, y: pos.y, radius: 0 };
    } else if (activeTool === 'arrow') {
      currentShapeRef.current = { id, tool: 'arrow', color: activeColor, x: pos.x, y: pos.y, endX: pos.x, endY: pos.y };
    } else if (activeTool === 'text') {
      const text = prompt('Text:');
      if (text) {
        setShapes(prev => [...prev, { id, tool: 'text', color: activeColor, x: pos.x, y: pos.y, text }]);
      }
      setIsDrawing(false);
      return;
    }

    setShapes(prev => [...prev, currentShapeRef.current!]);
  }, [activeTool, activeColor]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing || !currentShapeRef.current) return;
    const stage = e.target?.getStage?.();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const shape = currentShapeRef.current;

    if (shape.tool === 'freehand') {
      shape.points = [...(shape.points || []), pos.x, pos.y];
    } else if (shape.tool === 'circle') {
      const dx = pos.x - (shape.x || 0);
      const dy = pos.y - (shape.y || 0);
      shape.radius = Math.sqrt(dx * dx + dy * dy);
    } else if (shape.tool === 'arrow') {
      shape.endX = pos.x;
      shape.endY = pos.y;
    }

    setShapes(prev => prev.map(s => s.id === shape.id ? { ...shape } : s));
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    currentShapeRef.current = null;
  }, []);

  function handleUndo() {
    setShapes(prev => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1.5">
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setActiveTool(tool)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        <div className="mx-1 h-6 w-px bg-border" />

        {COLORS.map((c) => (
          <button
            key={c}
            className={cn(
              'h-6 w-6 rounded-full border-2',
              activeColor === c ? 'border-foreground' : 'border-transparent'
            )}
            style={{ backgroundColor: c }}
            onClick={() => setActiveColor(c)}
          />
        ))}

        <div className="mx-1 h-6 w-px bg-border" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={shapes.length === 0}>
          <Undo2 className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="mr-1 h-3.5 w-3.5" />
          Zrušit
        </Button>
        <Button size="sm" onClick={() => onSave(shapes)}>
          <Save className="mr-1 h-3.5 w-3.5" />
          Uložit
        </Button>
      </div>

      {/* Canvas */}
      <div className="overflow-auto rounded-lg border">
        <Stage
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {shapes.map((shape) => {
              if (shape.tool === 'freehand' && shape.points) {
                return (
                  <Line
                    key={shape.id}
                    points={shape.points}
                    stroke={shape.color}
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }
              if (shape.tool === 'circle') {
                return (
                  <Circle
                    key={shape.id}
                    x={shape.x || 0}
                    y={shape.y || 0}
                    radius={shape.radius || 0}
                    stroke={shape.color}
                    strokeWidth={3}
                  />
                );
              }
              if (shape.tool === 'arrow') {
                return (
                  <Arrow
                    key={shape.id}
                    points={[shape.x || 0, shape.y || 0, shape.endX || 0, shape.endY || 0]}
                    stroke={shape.color}
                    fill={shape.color}
                    strokeWidth={3}
                    pointerLength={10}
                    pointerWidth={10}
                  />
                );
              }
              if (shape.tool === 'text') {
                return (
                  <Text
                    key={shape.id}
                    x={shape.x || 0}
                    y={shape.y || 0}
                    text={shape.text || ''}
                    fontSize={16}
                    fill={shape.color}
                  />
                );
              }
              return null;
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
