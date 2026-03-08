import { useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Rect, Ellipse, Polyline } from 'react-native-svg';
import { PinMarker } from './pin-marker';
import { SelectionHandles } from './selection-handles';

interface AnnotationOverlayProps {
  annotations: any[];
  pdfWidth: number;
  pdfHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  selectedId?: string | null;
  isMoving?: boolean;
  onShapePress?: (annotationId: string) => void;
  onMoveEnd?: (annotationId: string, deltaXPdf: number, deltaYPdf: number) => void;
}

function scaleX(x: number, pdfW: number, renderW: number) {
  return (x / pdfW) * renderW;
}
function scaleY(y: number, pdfH: number, renderH: number) {
  return (y / pdfH) * renderH;
}

const HIT_STROKE_WIDTH = 30;

export function AnnotationOverlay({
  annotations,
  pdfWidth,
  pdfHeight,
  renderedWidth,
  renderedHeight,
  selectedId,
  isMoving,
  onShapePress,
  onMoveEnd,
}: AnnotationOverlayProps) {
  const moveStartRef = useRef({ x: 0, y: 0 });

  if (!pdfWidth || !pdfHeight || !renderedWidth || !renderedHeight) return null;

  const shapes = annotations.filter((a) => a.type !== 'pin');
  const pins = annotations.filter((a) => a.type === 'pin');
  const selectedAnnotation = selectedId
    ? annotations.find((a) => a.id === selectedId)
    : null;

  const panGesture = Gesture.Pan()
    .enabled(!!isMoving && !!selectedId)
    .onStart((e) => {
      moveStartRef.current = { x: e.x, y: e.y };
    })
    .onEnd((e) => {
      if (!selectedId) return;
      const deltaScreenX = e.x - moveStartRef.current.x;
      const deltaScreenY = e.y - moveStartRef.current.y;
      const deltaXPdf = deltaScreenX * (pdfWidth / renderedWidth);
      const deltaYPdf = deltaScreenY * (pdfHeight / renderedHeight);
      onMoveEnd?.(selectedId, deltaXPdf, deltaYPdf);
    });

  const svgContent = (
    <Svg
      width={renderedWidth}
      height={renderedHeight}
      className="absolute top-0 left-0"
    >
      {shapes.map((ann) => {
        const d = ann.data as Record<string, any>;
        const color = d.color ?? '#3B82F6';
        const sw = d.strokeWidth ?? 2;

        switch (ann.type) {
          case 'line':
          case 'arrow': {
            const pts = d.points as number[] | undefined;
            if (!pts || pts.length < 4) return null;
            const x1 = scaleX(pts[0], pdfWidth, renderedWidth);
            const y1 = scaleY(pts[1], pdfHeight, renderedHeight);
            const x2 = scaleX(pts[2], pdfWidth, renderedWidth);
            const y2 = scaleY(pts[3], pdfHeight, renderedHeight);
            return [
              <Line
                key={`hit-${ann.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                onPress={() => onShapePress?.(ann.id)}
              />,
              <Line
                key={ann.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={sw}
              />,
            ];
          }
          case 'rectangle':
          case 'area': {
            const rx = scaleX(d.x ?? 0, pdfWidth, renderedWidth);
            const ry = scaleY(d.y ?? 0, pdfHeight, renderedHeight);
            const rw = scaleX(d.width ?? 0, pdfWidth, renderedWidth);
            const rh = scaleY(d.height ?? 0, pdfHeight, renderedHeight);
            return [
              <Rect
                key={`hit-${ann.id}`}
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                fill="transparent"
                onPress={() => onShapePress?.(ann.id)}
              />,
              <Rect
                key={ann.id}
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                stroke={color}
                strokeWidth={sw}
                fill="transparent"
              />,
            ];
          }
          case 'ellipse': {
            const erx = scaleX(d.radiusX ?? 0, pdfWidth, renderedWidth);
            const ery = scaleY(d.radiusY ?? 0, pdfHeight, renderedHeight);
            const ecx = scaleX(d.x ?? 0, pdfWidth, renderedWidth);
            const ecy = scaleY(d.y ?? 0, pdfHeight, renderedHeight);
            return [
              <Ellipse
                key={`hit-${ann.id}`}
                cx={ecx}
                cy={ecy}
                rx={erx}
                ry={ery}
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                fill="transparent"
                onPress={() => onShapePress?.(ann.id)}
              />,
              <Ellipse
                key={ann.id}
                cx={ecx}
                cy={ecy}
                rx={erx}
                ry={ery}
                stroke={color}
                strokeWidth={sw}
                fill="transparent"
              />,
            ];
          }
          case 'freehand':
          case 'highlighter': {
            const pts = d.points as number[] | undefined;
            if (!pts || pts.length < 4) return null;
            const pointsStr: string[] = [];
            for (let i = 0; i < pts.length; i += 2) {
              pointsStr.push(
                `${scaleX(pts[i], pdfWidth, renderedWidth)},${scaleY(pts[i + 1], pdfHeight, renderedHeight)}`
              );
            }
            const joined = pointsStr.join(' ');
            return [
              <Polyline
                key={`hit-${ann.id}`}
                points={joined}
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                fill="none"
                onPress={() => onShapePress?.(ann.id)}
              />,
              <Polyline
                key={ann.id}
                points={joined}
                stroke={color}
                strokeWidth={sw}
                fill="none"
                opacity={ann.type === 'highlighter' ? 0.4 : 1}
              />,
            ];
          }
          default:
            return null;
        }
      })}

      {selectedAnnotation && (
        <SelectionHandles
          annotation={selectedAnnotation}
          pdfWidth={pdfWidth}
          pdfHeight={pdfHeight}
          renderedWidth={renderedWidth}
          renderedHeight={renderedHeight}
        />
      )}
    </Svg>
  );

  return (
    <View
      style={{ width: renderedWidth, height: renderedHeight }}
      pointerEvents="box-none"
      className="absolute top-0 left-0"
    >
      {isMoving && selectedId ? (
        <GestureDetector gesture={panGesture}>
          <View style={{ width: renderedWidth, height: renderedHeight }}>
            {svgContent}
          </View>
        </GestureDetector>
      ) : (
        svgContent
      )}

      {pins.map((ann) => {
        const d = ann.data as Record<string, any>;
        return (
          <PinMarker
            key={ann.id}
            type={d.icon === 'task' ? 'task' : 'photo'}
            x={scaleX(d.x ?? 0, pdfWidth, renderedWidth)}
            y={scaleY(d.y ?? 0, pdfHeight, renderedHeight)}
            selected={ann.id === selectedId}
            onPress={() => onShapePress?.(ann.id)}
          />
        );
      })}
    </View>
  );
}
