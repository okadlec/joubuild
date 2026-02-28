'use client';

import { Stage, Layer, Circle, Text, Group } from 'react-konva';
import { TASK_STATUS_COLORS, TASK_PRIORITY_COLORS, type Task } from '@joubuild/shared';

interface TaskPinOverlayProps {
  width: number;
  height: number;
  scale: number;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onPinDrop?: (x: number, y: number) => void;
  pinMode?: boolean;
}

export function TaskPinOverlay({
  width,
  height,
  scale,
  tasks,
  onTaskClick,
  onPinDrop,
  pinMode = false,
}: TaskPinOverlayProps) {
  const pinnedTasks = tasks.filter(t => t.pin_x != null && t.pin_y != null);

  return (
    <Stage
      width={width * scale}
      height={height * scale}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: pinMode ? 'auto' : 'none',
        cursor: pinMode ? 'crosshair' : 'default',
      }}
      onClick={(e) => {
        if (!pinMode || !onPinDrop) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        onPinDrop(pos.x / scale, pos.y / scale);
      }}
    >
      <Layer>
        {pinnedTasks.map((task) => {
          const x = (task.pin_x ?? 0) * scale;
          const y = (task.pin_y ?? 0) * scale;
          const color = TASK_STATUS_COLORS[task.status] || '#3B82F6';
          const priorityColor = TASK_PRIORITY_COLORS[task.priority] || '#6B7280';

          return (
            <Group
              key={task.id}
              x={x}
              y={y}
              onClick={(e) => {
                e.cancelBubble = true;
                onTaskClick(task);
              }}
              style={{ cursor: 'pointer' }}
              listening={true}
            >
              {/* Shadow */}
              <Circle
                radius={12}
                fill="rgba(0,0,0,0.2)"
                offsetY={-2}
              />
              {/* Main pin */}
              <Circle
                radius={10}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
              {/* Priority indicator */}
              <Circle
                radius={4}
                fill={priorityColor}
                offsetX={-7}
                offsetY={7}
                stroke="#fff"
                strokeWidth={1}
              />
              {/* Label */}
              <Text
                text={task.title.slice(0, 20)}
                fontSize={10}
                fill="#fff"
                offsetX={-14}
                offsetY={4}
                padding={2}
                // Background for text
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
