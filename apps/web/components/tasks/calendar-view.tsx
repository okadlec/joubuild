'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_COLORS, TASK_PRIORITY_COLORS, type Task } from '@joubuild/shared';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { days, monthLabel } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based: 0=Mon, 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return {
      days: cells,
      monthLabel: firstDay.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }),
    };
  }, [currentDate]);

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function toDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const dateKey = t.due_date?.slice(0, 10);
      if (dateKey) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const today = toDateStr(new Date());

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">{monthLabel}</h3>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px border-b">
        {WEEKDAYS.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map(({ date, isCurrentMonth }, i) => {
          const dateStr = toDateStr(date);
          const dayTasks = tasksByDate.get(dateStr) || [];
          const isToday = dateStr === today;

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r p-1 ${
                isCurrentMonth ? 'bg-background' : 'bg-muted/30'
              }`}
            >
              <div className={`mb-1 text-right text-xs ${
                isToday ? 'font-bold text-primary' : isCurrentMonth ? '' : 'text-muted-foreground'
              }`}>
                {isToday ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {date.getDate()}
                  </span>
                ) : (
                  date.getDate()
                )}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="cursor-pointer truncate rounded-sm px-1 py-0.5 text-[10px] text-white"
                    style={{ backgroundColor: TASK_STATUS_COLORS[task.status] || '#3B82F6' }}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayTasks.length - 3} dalších
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
