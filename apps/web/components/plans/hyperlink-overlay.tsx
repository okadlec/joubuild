'use client';

import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type { Hyperlink } from '@joubuild/shared';

interface HyperlinkOverlayProps {
  width: number;
  height: number;
  scale: number;
  hyperlinks: Hyperlink[];
  onHyperlinkClick: (hyperlink: Hyperlink) => void;
  onAreaDrop?: (x: number, y: number, width: number, height: number) => void;
  editMode?: boolean;
}

export function HyperlinkOverlay({
  width,
  height,
  scale,
  hyperlinks,
  onHyperlinkClick,
  editMode = false,
}: HyperlinkOverlayProps) {
  return (
    <Stage
      width={width * scale}
      height={height * scale}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: editMode ? 'auto' : 'none',
      }}
    >
      <Layer>
        {hyperlinks.map((link) => {
          const x = link.x * scale;
          const y = link.y * scale;
          const w = link.width * scale;
          const h = link.height * scale;

          return (
            <Group
              key={link.id}
              x={x}
              y={y}
              onClick={() => onHyperlinkClick(link)}
              listening={true}
            >
              <Rect
                width={w}
                height={h}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="rgba(59, 130, 246, 0.5)"
                strokeWidth={1}
                dash={[4, 4]}
                cornerRadius={2}
              />
              {link.label && (
                <Text
                  text={link.label}
                  fontSize={10 * scale}
                  fill="#3B82F6"
                  width={w}
                  align="center"
                  y={h + 2}
                />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
