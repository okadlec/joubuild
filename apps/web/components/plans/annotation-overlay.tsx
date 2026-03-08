'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text, Circle, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { AnnotationType } from '@joubuild/shared';
import type { AnnotationTool } from './annotation-toolbar';

export interface AnnotationData {
  id: string;
  type: AnnotationType;
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
    // For pin annotations
    icon?: 'photo' | 'task';
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
  onAnnotationClick?: (id: string) => void;
  onPinCreated?: (annotationId: string, initialTab: 'photos' | 'attributes') => void;
  pixelsPerMeter: number | null; // calibration ratio
  displayScale?: number; // CSS scale compensation when effectiveScale < zoom scale
  annotationCounts?: Record<string, { photos: number; tasks: number }>;
}

function generateId() {
  return crypto.randomUUID();
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
  onAnnotationClick,
  onPinCreated,
  pixelsPerMeter,
  displayScale = 1,
  annotationCounts,
}: AnnotationOverlayProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Node | null>(null);

  // Attach/detach Transformer when selection changes
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId && selectedShapeRef.current) {
      // Don't attach transformer to pin annotations
      const ann = annotations.find(a => a.id === selectedId);
      if (ann?.type === 'pin') {
        tr.nodes([]);
      } else {
        tr.nodes([selectedShapeRef.current]);
      }
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, annotations]);

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

  const handleMouseDown = useCallback((e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activeTool === 'select') return;

    // Prevent scrolling while drawing on touch devices
    if (e?.evt) {
      e.evt.preventDefault();
    }

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'photo_pin' || activeTool === 'task_pin') {
      const id = generateId();
      const newAnnotation: AnnotationData = {
        id,
        type: 'pin',
        data: {
          x: pos.x,
          y: pos.y,
          color: activeColor,
          strokeWidth: 2,
          icon: activeTool === 'photo_pin' ? 'photo' : 'task',
        },
      };
      onAnnotationsChange([...annotations, newAnnotation]);
      onPinCreated?.(id, activeTool === 'photo_pin' ? 'photos' : 'attributes');
      return;
    }

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
  }, [activeTool, activeColor, annotations, onAnnotationsChange, onPinCreated, getRelativePointerPosition]);

  const handleMouseMove = useCallback((e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing) return;

    // Prevent touch event from bubbling to container (avoids scrolling while drawing)
    if (e?.evt) {
      e.evt.preventDefault();
    }

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'freehand' || activeTool === 'highlighter') {
      setCurrentPoints(prev => [...prev, pos.x, pos.y]);
    }
  }, [isDrawing, activeTool, getRelativePointerPosition]);

  const handleMouseUp = useCallback((e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Prevent touch event from bubbling to container
    if (e?.evt) {
      e.evt.preventDefault();
    }

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

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
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

  const isLineBased = (type: AnnotationData['type']) =>
    ['line', 'arrow', 'freehand', 'highlighter', 'measurement'].includes(type);

  function getBadgePosition(ann: AnnotationData): { x: number; y: number } | null {
    const s = 1 / displayScale;
    switch (ann.type) {
      case 'pin':
        return { x: ann.data.x! + 12 * s, y: ann.data.y! - 12 * s };
      case 'rectangle':
      case 'area':
      case 'cloud':
        return { x: (ann.data.x ?? 0) + (ann.data.width ?? 0), y: ann.data.y ?? 0 };
      case 'ellipse':
        return { x: (ann.data.x ?? 0) + (ann.data.radiusX ?? 0), y: (ann.data.y ?? 0) - (ann.data.radiusY ?? 0) };
      case 'line':
      case 'arrow':
      case 'freehand':
      case 'highlighter':
      case 'measurement': {
        const pts = ann.data.points;
        if (!pts || pts.length < 2) return null;
        return { x: pts[0] + 8 * s, y: pts[1] - 16 * s };
      }
      default:
        return null;
    }
  }

  const renderBadge = (ann: AnnotationData) => {
    if (!annotationCounts) return null;
    const counts = annotationCounts[ann.id];
    if (!counts || (counts.photos === 0 && counts.tasks === 0)) return null;

    const pos = getBadgePosition(ann);
    if (!pos) return null;

    const parts: string[] = [];
    if (counts.photos > 0) parts.push(`${counts.photos}P`);
    if (counts.tasks > 0) parts.push(`${counts.tasks}T`);
    const label = parts.join(' ');

    const s = 1 / displayScale;
    const fontSize = 10 * s;
    const padding = 3 * s;
    const charWidth = fontSize * 0.65;
    const badgeW = label.length * charWidth + padding * 2;
    const badgeH = fontSize + padding * 2;

    return (
      <Group key={`badge-${ann.id}`} x={pos.x} y={pos.y} listening={false}>
        <Rect
          width={badgeW}
          height={badgeH}
          fill="rgba(0,0,0,0.75)"
          cornerRadius={4 * s}
        />
        <Text
          x={padding}
          y={padding}
          text={label}
          fontSize={fontSize}
          fill="#fff"
          fontStyle="bold"
        />
      </Group>
    );
  };

  const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;

    let updated: AnnotationData[];
    if (isLineBased(ann.type)) {
      // Offset all points by node position, then reset node to 0,0
      const dx = node.x();
      const dy = node.y();
      const oldPoints = ann.data.points!;
      const newPoints = oldPoints.map((v, i) => i % 2 === 0 ? v + dx : v + dy);
      node.position({ x: 0, y: 0 });

      const newData = { ...ann.data, points: newPoints };
      // Recalculate measurement distance
      if (ann.type === 'measurement' && pixelsPerMeter) {
        const ddx = newPoints[2] - newPoints[0];
        const ddy = newPoints[3] - newPoints[1];
        newData.realDistance = Math.sqrt(ddx * ddx + ddy * ddy) / pixelsPerMeter;
      }
      updated = annotations.map(a => a.id === id ? { ...a, data: newData } : a);
    } else {
      // rect/ellipse/cloud/text/area/pin: update x, y
      const newData = { ...ann.data, x: node.x(), y: node.y() };
      // Recalculate area
      if (ann.type === 'area' && pixelsPerMeter && newData.width && newData.height) {
        newData.realArea = (newData.width * newData.height) / (pixelsPerMeter * pixelsPerMeter);
      }
      updated = annotations.map(a => a.id === id ? { ...a, data: newData } : a);
    }
    onAnnotationsChange(updated);
  }, [annotations, onAnnotationsChange, pixelsPerMeter]);

  const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    // Reset scale on node
    node.scaleX(1);
    node.scaleY(1);

    let updated: AnnotationData[];
    if (isLineBased(ann.type)) {
      const oldPoints = ann.data.points!;
      const dx = node.x();
      const dy = node.y();
      const newPoints = oldPoints.map((v, i) => i % 2 === 0 ? v * scaleX + dx : v * scaleY + dy);
      node.position({ x: 0, y: 0 });

      const newData = { ...ann.data, points: newPoints };
      if (ann.type === 'measurement' && pixelsPerMeter) {
        const ddx = newPoints[2] - newPoints[0];
        const ddy = newPoints[3] - newPoints[1];
        newData.realDistance = Math.sqrt(ddx * ddx + ddy * ddy) / pixelsPerMeter;
      }
      updated = annotations.map(a => a.id === id ? { ...a, data: newData } : a);
    } else if (ann.type === 'ellipse') {
      const newData = {
        ...ann.data,
        x: node.x(),
        y: node.y(),
        radiusX: ann.data.radiusX! * Math.abs(scaleX),
        radiusY: ann.data.radiusY! * Math.abs(scaleY),
      };
      updated = annotations.map(a => a.id === id ? { ...a, data: newData } : a);
    } else {
      // rect/cloud/area/text
      const newData = {
        ...ann.data,
        x: node.x(),
        y: node.y(),
        width: (ann.data.width ?? 0) * Math.abs(scaleX),
        height: (ann.data.height ?? 0) * Math.abs(scaleY),
      };
      if (ann.type === 'area' && pixelsPerMeter) {
        newData.realArea = (newData.width! * newData.height!) / (pixelsPerMeter * pixelsPerMeter);
      }
      updated = annotations.map(a => a.id === id ? { ...a, data: newData } : a);
    }
    onAnnotationsChange(updated);
  }, [annotations, onAnnotationsChange, pixelsPerMeter]);

  const renderAnnotation = (ann: AnnotationData) => {
    const isSelected = selectedId === ann.id;
    const handleSelect = () => {
      if (activeTool === 'select') {
        onSelectId(ann.id);
        onAnnotationClick?.(ann.id);
      }
    };
    const commonProps = {
      key: ann.id,
      id: ann.id,
      onClick: handleSelect,
      onTap: handleSelect,
      stroke: isSelected ? '#0EA5E9' : ann.data.color,
      strokeWidth: ann.data.strokeWidth,
      draggable: activeTool === 'select',
      ref: isSelected ? ((node: Konva.Node | null) => { selectedShapeRef.current = node; }) : undefined,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(ann.id, e),
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
            {...commonProps}
            x={ann.data.x}
            y={ann.data.y}
            text={ann.data.text}
            fontSize={16}
            fill={ann.data.color}
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
          <Group key={ann.id} onClick={handleSelect} onTap={handleSelect}
            draggable={activeTool === 'select'}
            ref={isSelected ? ((node: Konva.Node | null) => { selectedShapeRef.current = node; }) as React.LegacyRef<Konva.Group> : undefined}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e)}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => handleTransformEnd(ann.id, e)}
          >
            <Line {...commonProps} points={pts} dash={[8, 4]} draggable={false} />
            <Circle x={pts[0]} y={pts[1]} radius={4} fill="#EF4444" onClick={handleSelect} onTap={handleSelect} />
            <Circle x={pts[2]} y={pts[3]} radius={4} fill="#EF4444" onClick={handleSelect} onTap={handleSelect} />
            <Text
              x={midX - 30}
              y={midY - 20}
              text={formatDistance(ann.data.realDistance!)}
              fontSize={14}
              fontStyle="bold"
              fill="#EF4444"
              padding={4}
              onClick={handleSelect}
              onTap={handleSelect}
            />
          </Group>
        );
      }

      case 'area': {
        return (
          <Group key={ann.id} onClick={handleSelect} onTap={handleSelect}
            draggable={activeTool === 'select'}
            ref={isSelected ? ((node: Konva.Node | null) => { selectedShapeRef.current = node; }) as React.LegacyRef<Konva.Group> : undefined}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e)}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => handleTransformEnd(ann.id, e)}
          >
            <Rect
              x={ann.data.x}
              y={ann.data.y}
              width={ann.data.width}
              height={ann.data.height}
              stroke="#3B82F6"
              strokeWidth={2}
              fill="rgba(59,130,246,0.1)"
              dash={[6, 3]}
              onClick={handleSelect}
              onTap={handleSelect}
            />
            <Text
              x={ann.data.x! + 4}
              y={ann.data.y! + 4}
              text={formatArea(ann.data.realArea!)}
              fontSize={14}
              fontStyle="bold"
              fill="#3B82F6"
              padding={4}
              onClick={handleSelect}
              onTap={handleSelect}
            />
          </Group>
        );
      }

      case 'pin': {
        const pinX = ann.data.x!;
        const pinY = ann.data.y!;
        const radius = 10 / (displayScale ?? 1);
        return (
          <Group key={ann.id} onClick={handleSelect} onTap={handleSelect}
            x={pinX}
            y={pinY}
            draggable={activeTool === 'select'}
            ref={isSelected ? ((node: Konva.Node | null) => { selectedShapeRef.current = node; }) as React.LegacyRef<Konva.Group> : undefined}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e)}
          >
            <Circle x={1} y={1} radius={radius} fill="rgba(0,0,0,0.3)" />
            <Circle
              x={0}
              y={0}
              radius={radius}
              fill={isSelected ? '#0EA5E9' : ann.data.color}
              stroke="#fff"
              strokeWidth={2 / (displayScale ?? 1)}
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
      pixelRatio={1}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: activeTool === 'select' ? 'default' : 'crosshair',
        ...(displayScale !== 1 ? {
          transform: `scale(${displayScale})`,
          transformOrigin: '0 0',
        } : {}),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      onClick={handleStageClick}
      onTap={handleStageClick}
    >
      <Layer>
        {annotations.map(renderAnnotation)}

        {/* Count badges (rendered on top of annotations, non-interactive) */}
        {annotationCounts && annotations.map(renderBadge)}

        {/* Transformer for selected annotation */}
        {activeTool === 'select' && selectedId && (
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            boundBoxFunc={(_old, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? _old : newBox
            }
          />
        )}

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
