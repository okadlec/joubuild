'use client';

import { useMemo } from 'react';
import { TASK_STATUS_COLORS, TASK_PRIORITY_COLORS, type Task } from '@joubuild/shared';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const { ganttTasks, startDate, totalDays, months } = useMemo(() => {
    const withDates = tasks.filter(t => t.start_date || t.due_date);
    if (withDates.length === 0) {
      return { ganttTasks: [], startDate: new Date(), totalDays: 30, months: [] };
    }

    const allDates = withDates.flatMap(t => {
      const dates: Date[] = [];
      if (t.start_date) dates.push(new Date(t.start_date));
      if (t.due_date) dates.push(new Date(t.due_date));
      return dates;
    });

    const min = new Date(Math.min(...allDates.map(d => d.getTime())));
    const max = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add 7-day padding
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);

    const total = Math.max(Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)), 30);

    // Generate month headers
    const monthHeaders: { label: string; left: number; width: number }[] = [];
    const cursor = new Date(min);
    cursor.setDate(1);
    while (cursor <= max) {
      const monthStart = Math.max(0, Math.ceil((cursor.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = Math.min(total, Math.ceil((nextMonth.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
      monthHeaders.push({
        label: cursor.toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' }),
        left: (monthStart / total) * 100,
        width: ((monthEnd - monthStart) / total) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      ganttTasks: withDates,
      startDate: min,
      totalDays: total,
      months: monthHeaders,
    };
  }, [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          Žádné úkoly s datem. Přidejte úkolům začátek nebo termín.
        </p>
      </div>
    );
  }

  function dayOffset(date: string) {
    return Math.ceil((new Date(date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Today marker
  const todayOffset = dayOffset(new Date().toISOString());
  const todayPct = (todayOffset / totalDays) * 100;

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      {/* Month headers */}
      <div className="relative h-8 border-b bg-muted/50">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 flex h-full items-center border-r px-2 text-xs font-medium text-muted-foreground"
            style={{ left: `${m.left}%`, width: `${m.width}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Task rows */}
      <div className="relative min-w-[800px]">
        {/* Today line */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 z-10 h-full w-px bg-red-400"
            style={{ left: `${todayPct}%` }}
          />
        )}

        {ganttTasks.map((task) => {
          const taskStart = task.start_date ? dayOffset(task.start_date) : (task.due_date ? dayOffset(task.due_date) - 1 : 0);
          const taskEnd = task.due_date ? dayOffset(task.due_date) : taskStart + 1;
          const left = (taskStart / totalDays) * 100;
          const width = Math.max(((taskEnd - taskStart) / totalDays) * 100, 1);
          const color = TASK_STATUS_COLORS[task.status] || '#3B82F6';

          return (
            <div
              key={task.id}
              className="flex h-10 cursor-pointer items-center border-b hover:bg-muted/30"
              onClick={() => onTaskClick(task)}
            >
              <div className="relative h-full w-full">
                <div
                  className="absolute top-2 h-6 rounded-md transition-opacity hover:opacity-80"
                  style={{
                    left: `${Math.max(0, left)}%`,
                    width: `${width}%`,
                    backgroundColor: color,
                    minWidth: '8px',
                  }}
                >
                  <span className="truncate px-2 text-xs leading-6 text-white">
                    {task.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
