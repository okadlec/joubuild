import { Rect, Circle, G } from 'react-native-svg';

const SELECTION_COLOR = '#38BDF8';
const HANDLE_SIZE = 8;
const DASH_ARRAY = '6,4';

interface SelectionHandlesProps {
  annotation: any;
  pdfWidth: number;
  pdfHeight: number;
  renderedWidth: number;
  renderedHeight: number;
}

function sx(x: number, pdfW: number, renderW: number) {
  return (x / pdfW) * renderW;
}
function sy(y: number, pdfH: number, renderH: number) {
  return (y / pdfH) * renderH;
}

function CornerHandle({ x, y }: { x: number; y: number }) {
  return (
    <Rect
      x={x - HANDLE_SIZE / 2}
      y={y - HANDLE_SIZE / 2}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill="#fff"
      stroke={SELECTION_COLOR}
      strokeWidth={1.5}
    />
  );
}

function EndpointHandle({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={HANDLE_SIZE / 2}
      fill="#fff"
      stroke={SELECTION_COLOR}
      strokeWidth={1.5}
    />
  );
}

export function SelectionHandles({
  annotation,
  pdfWidth,
  pdfHeight,
  renderedWidth,
  renderedHeight,
}: SelectionHandlesProps) {
  const d = annotation.data as Record<string, any>;
  const type = annotation.type;

  let bounds: { x: number; y: number; w: number; h: number } | null = null;

  switch (type) {
    case 'rectangle':
    case 'area': {
      const x = sx(d.x ?? 0, pdfWidth, renderedWidth);
      const y = sy(d.y ?? 0, pdfHeight, renderedHeight);
      const w = sx(d.width ?? 0, pdfWidth, renderedWidth);
      const h = sy(d.height ?? 0, pdfHeight, renderedHeight);
      bounds = { x, y, w, h };
      break;
    }
    case 'ellipse': {
      const cx = sx(d.x ?? 0, pdfWidth, renderedWidth);
      const cy = sy(d.y ?? 0, pdfHeight, renderedHeight);
      const rx = sx(d.radiusX ?? 0, pdfWidth, renderedWidth);
      const ry = sy(d.radiusY ?? 0, pdfHeight, renderedHeight);
      bounds = { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
      break;
    }
    case 'line':
    case 'arrow': {
      const pts = d.points as number[] | undefined;
      if (!pts || pts.length < 4) return null;
      const x1 = sx(pts[0], pdfWidth, renderedWidth);
      const y1 = sy(pts[1], pdfHeight, renderedHeight);
      const x2 = sx(pts[2], pdfWidth, renderedWidth);
      const y2 = sy(pts[3], pdfHeight, renderedHeight);
      return (
        <G>
          <EndpointHandle cx={x1} cy={y1} />
          <EndpointHandle cx={x2} cy={y2} />
        </G>
      );
    }
    case 'freehand':
    case 'highlighter': {
      const pts = d.points as number[] | undefined;
      if (!pts || pts.length < 4) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const px = sx(pts[i], pdfWidth, renderedWidth);
        const py = sy(pts[i + 1], pdfHeight, renderedHeight);
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      const pad = 4;
      bounds = { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
      break;
    }
    case 'pin': {
      const px = sx(d.x ?? 0, pdfWidth, renderedWidth);
      const py = sy(d.y ?? 0, pdfHeight, renderedHeight);
      return (
        <Circle
          cx={px}
          cy={py - 14}
          r={20}
          fill="transparent"
          stroke={SELECTION_COLOR}
          strokeWidth={2}
          strokeDasharray={DASH_ARRAY}
        />
      );
    }
    default:
      return null;
  }

  if (!bounds) return null;

  return (
    <G>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        fill="transparent"
        stroke={SELECTION_COLOR}
        strokeWidth={1.5}
        strokeDasharray={DASH_ARRAY}
      />
      <CornerHandle x={bounds.x} y={bounds.y} />
      <CornerHandle x={bounds.x + bounds.w} y={bounds.y} />
      <CornerHandle x={bounds.x} y={bounds.y + bounds.h} />
      <CornerHandle x={bounds.x + bounds.w} y={bounds.y + bounds.h} />
    </G>
  );
}
