'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text, Circle, Group } from 'react-konva';
import type Konva from 'konva';
import type { AnnotationTool } from './annotation-toolbar';

export interface AnnotationData {
  id: string;
  type: AnnotationTool;
  data: {
    points?: number[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    radiusX?: number;
    radiusY?: number;
    text?: string;
    color: string;
    strokeWidth: number;
    // For measurements
    realDistance?: number;
    realArea?: number;
  };
}

interface AnnotationOverlayProps {
  width: number;
  height: number;
  scale: number;
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  annotations: AnnotationData[];
  onAnnotationsChange: (annotations: AnnotationData[]) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  pixelsPerMeter: number | null; // calibration ratio
}

function generateId() {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AnnotationOverlay({
  width,
  height,
  scale,
  activeTool,
  activeColor,
  strokeWidth: lineWidth,
  annotations,
  onAnnotationsChange,
  selectedId,
  onSelectId,
  pixelsPerMeter,
}: AnnotationOverlayProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale, y: pos.y / scale };
  }, [scale]);

  const handleMouseDown = useCallback(() => {
    if (activeTool === 'select') return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'text') {
      setTextInput(pos);
      return;
    }

    setIsDrawing(true);
    setDrawStart(pos);

    if (activeTool === 'freehand' || activeTool === 'highlighter') {
      setCurrentPoints([pos.x, pos.y]);
    } else if (activeTool === 'measurement' || activeTool === 'area') {
      setCurrentPoints([pos.x, pos.y]);
    }
  }, [activeTool, getRelativePointerPosition]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing) return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'freehand' || activeTool === 'highlighter') {
      setCurrentPoints(prev => [...prev, pos.x, pos.y]);
    }
  }, [isDrawing, activeTool, getRelativePointerPosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart) {
      setIsDrawing(false);
      return;
    }

    const pos = getRelativePointerPosition();
    if (!pos) {
      setIsDrawing(false);
      return;
    }

    const id = generateId();
    let newAnnotation: AnnotationData | null = null;

    switch (activeTool) {
      case 'line':
        newAnnotation = {
          id,
          type: 'line',
          data: {
            points: [drawStart.x, drawStart.y, pos.x, pos.y],
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;

      case 'arrow':
        newAnnotation = {
          id,
          type: 'arrow',
          data: {
            points: [drawStart.x, drawStart.y, pos.x, pos.y],
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;

      case 'rectangle':
        newAnnotation = {
          id,
          type: 'rectangle',
          data: {
            x: Math.min(drawStart.x, pos.x),
            y: Math.min(drawStart.y, pos.y),
            width: Math.abs(pos.x - drawStart.x),
            height: Math.abs(pos.y - drawStart.y),
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;

      case 'ellipse':
        newAnnotation = {
          id,
          type: 'ellipse',
          data: {
            x: (drawStart.x + pos.x) / 2,
            y: (drawStart.y + pos.y) / 2,
            radiusX: Math.abs(pos.x - drawStart.x) / 2,
            radiusY: Math.abs(pos.y - drawStart.y) / 2,
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;

      case 'cloud': {
        newAnnotation = {
          id,
          type: 'cloud',
          data: {
            x: Math.min(drawStart.x, pos.x),
            y: Math.min(drawStart.y, pos.y),
            width: Math.abs(pos.x - drawStart.x),
            height: Math.abs(pos.y - drawStart.y),
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;
      }

      case 'freehand':
        newAnnotation = {
          id,
          type: 'freehand',
          data: {
            points: currentPoints,
            color: activeColor,
            strokeWidth: lineWidth,
          },
        };
        break;

      case 'highlighter':
        newAnnotation = {
          id,
          type: 'highlighter',
          data: {
            points: currentPoints,
            color: activeColor,
            strokeWidth: lineWidth * 4,
          },
        };
        break;

      case 'measurement': {
        const dx = pos.x - drawStart.x;
        const dy = pos.y - drawStart.y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        const realDistance = pixelsPerMeter ? pixelDist / pixelsPerMeter : pixelDist;
        newAnnotation = {
          id,
          type: 'measurement',
          data: {
            points: [drawStart.x, drawStart.y, pos.x, pos.y],
            color: '#EF4444',
            strokeWidth: 2,
            realDistance,
          },
        };
        break;
      }

      case 'area': {
        // For area, use rectangle dimensions
        const areaWidth = Math.abs(pos.x - drawStart.x);
        const areaHeight = Math.abs(pos.y - drawStart.y);
        const pixelArea = areaWidth * areaHeight;
        const realArea = pixelsPerMeter ? pixelArea / (pixelsPerMeter * pixelsPerMeter) : pixelArea;
        newAnnotation = {
          id,
          type: 'area',
          data: {
            x: Math.min(drawStart.x, pos.x),
            y: Math.min(drawStart.y, pos.y),
            width: areaWidth,
            height: areaHeight,
            color: '#3B82F6',
            strokeWidth: 2,
            realArea,
          },
        };
        break;
      }
    }

    if (newAnnotation) {
      onAnnotationsChange([...annotations, newAnnotation]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPoints([]);
  }, [isDrawing, drawStart, activeTool, activeColor, lineWidth, currentPoints, annotations, onAnnotationsChange, getRelativePointerPosition, pixelsPerMeter]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'select') return;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelectId(null);
    }
  }, [activeTool, onSelectId]);

  // Handle text input
  useEffect(() => {
    if (!textInput) return;
    const text = prompt('Zadejte text:');
    if (text) {
      const id = generateId();
      onAnnotationsChange([
        ...annotations,
        {
          id,
          type: 'text',
          data: {
            x: textInput.x,
            y: textInput.y,
            text,
            color: activeColor,
            strokeWidth: lineWidth,
          },
        },
      ]);
    }
    setTextInput(null);
  }, [textInput, activeColor, lineWidth, annotations, onAnnotationsChange]);

  function formatDistance(meters: number): string {
    if (meters >= 1) return `${meters.toFixed(2)} m`;
    return `${(meters * 100).toFixed(1)} cm`;
  }

  function formatArea(sqMeters: number): string {
    if (sqMeters >= 1) return `${sqMeters.toFixed(2)} m²`;
    return `${(sqMeters * 10000).toFixed(1)} cm²`;
  }

  function renderCloudPath(x: number, y: number, w: number, h: number): number[] {
    // Generate cloud shape as scalloped rectangle
    const bumps = Math.max(4, Math.floor((w + h) / 40));
    const points: number[] = [];
    const segments = bumps * 4;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let px: number, py: number;
      const bumpAmp = 6;
      if (t < 0.25) {
        const lt = t / 0.25;
        px = x + lt * w;
        py = y + Math.sin(lt * bumps * Math.PI) * bumpAmp;
      } else if (t < 0.5) {
        const lt = (t - 0.25) / 0.25;
        px = x + w + Math.sin(lt * bumps * Math.PI) * bumpAmp;
        py = y + lt * h;
      } else if (t < 0.75) {
        const lt = (t - 0.5) / 0.25;
        px = x + w - lt * w;
        py = y + h + Math.sin(lt * bumps * Math.PI) * bumpAmp;
      } else {
        const lt = (t - 0.75) / 0.25;
        px = x + Math.sin(lt * bumps * Math.PI) * bumpAmp;
        py = y + h - lt * h;
      }
      points.push(px, py);
    }
    return points;
  }

  const renderAnnotation = (ann: AnnotationData) => {
    const isSelected = selectedId === ann.id;
    const commonProps = {
      key: ann.id,
      onClick: () => activeTool === 'select' && onSelectId(ann.id),
      stroke: isSelected ? '#0EA5E9' : ann.data.color,
      strokeWidth: ann.data.strokeWidth,
    };

    switch (ann.type) {
      case 'line':
        return <Line {...commonProps} points={ann.data.points!} />;

      case 'arrow':
        return <Arrow {...commonProps} points={ann.data.points!} pointerLength={10} pointerWidth={8} fill={ann.data.color} />;

      case 'rectangle':
        return <Rect {...commonProps} x={ann.data.x} y={ann.data.y} width={ann.data.width} height={ann.data.height} />;

      case 'ellipse':
        return <Ellipse {...commonProps} x={ann.data.x!} y={ann.data.y!} radiusX={ann.data.radiusX!} radiusY={ann.data.radiusY!} />;

      case 'cloud':
        return (
          <Line
            {...commonProps}
            points={renderCloudPath(ann.data.x!, ann.data.y!, ann.data.width!, ann.data.height!)}
            closed
            tension={0.3}
          />
        );

      case 'text':
        return (
          <Text
            key={ann.id}
            x={ann.data.x}
            y={ann.data.y}
            text={ann.data.text}
            fontSize={16}
            fill={ann.data.color}
            onClick={() => activeTool === 'select' && onSelectId(ann.id)}
          />
        );

      case 'highlighter':
        return (
          <Line
            {...commonProps}
            points={ann.data.points!}
            opacity={0.3}
            lineCap="round"
            lineJoin="round"
          />
        );

      case 'freehand':
        return (
          <Line
            {...commonProps}
            points={ann.data.points!}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        );

      case 'measurement': {
        const pts = ann.data.points!;
        const midX = (pts[0] + pts[2]) / 2;
        const midY = (pts[1] + pts[3]) / 2;
        return (
          <Group key={ann.id}>
            <Line {...commonProps} points={pts} dash={[8, 4]} />
            <Circle x={pts[0]} y={pts[1]} radius={4} fill="#EF4444" />
            <Circle x={pts[2]} y={pts[3]} radius={4} fill="#EF4444" />
            <Text
              x={midX - 30}
              y={midY - 20}
              text={formatDistance(ann.data.realDistance!)}
              fontSize={14}
              fontStyle="bold"
              fill="#EF4444"
              padding={4}
            />
          </Group>
        );
      }

      case 'area': {
        return (
          <Group key={ann.id}>
            <Rect
              x={ann.data.x}
              y={ann.data.y}
              width={ann.data.width}
              height={ann.data.height}
              stroke="#3B82F6"
              strokeWidth={2}
              fill="rgba(59,130,246,0.1)"
              dash={[6, 3]}
              onClick={() => activeTool === 'select' && onSelectId(ann.id)}
            />
            <Text
              x={ann.data.x! + 4}
              y={ann.data.y! + 4}
              text={formatArea(ann.data.realArea!)}
              fontSize={14}
              fontStyle="bold"
              fill="#3B82F6"
              padding={4}
            />
          </Group>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={width * scale}
      height={height * scale}
      scaleX={scale}
      scaleY={scale}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: activeTool === 'select' ? 'default' : 'crosshair',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleStageClick}
    >
      <Layer>
        {annotations.map(renderAnnotation)}

        {/* Drawing preview */}
        {isDrawing && drawStart && (() => {
          const pos = getRelativePointerPosition();
          if (!pos) return null;

          if (activeTool === 'freehand' || activeTool === 'highlighter') {
            return (
              <Line
                points={currentPoints}
                stroke={activeColor}
                strokeWidth={activeTool === 'highlighter' ? lineWidth * 4 : lineWidth}
                opacity={activeTool === 'highlighter' ? 0.3 : 1}
                lineCap="round"
                lineJoin="round"
              />
            );
          }
          return null;
        })()}
      </Layer>
    </Stage>
  );
}
