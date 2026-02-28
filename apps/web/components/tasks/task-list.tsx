'use client';

import { Badge } from '@/components/ui/badge';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  formatDate,
  type Task,
  type TaskCategory,
  type ProjectMember,
} from '@joubuild/shared';
import { Avatar } from '@/components/ui/avatar';
import { Calendar, MapPin } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
}

export function TaskList({ tasks, onTaskClick, categories = [], members = [] }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">Žádné úkoly</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-2 font-medium">Úkol</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Priorita</th>
            <th className="pb-2 font-medium">Kategorie</th>
            <th className="pb-2 font-medium">Přiřazeno</th>
            <th className="pb-2 font-medium">Termín</th>
            <th className="pb-2 font-medium">Výkres</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="cursor-pointer border-b hover:bg-muted/50"
              onClick={() => onTaskClick(task)}
            >
              <td className="py-3">
                <p className="font-medium">{task.title}</p>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                )}
              </td>
              <td className="py-3">
                <Badge
                  style={{ backgroundColor: TASK_STATUS_COLORS[task.status], color: '#fff' }}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </td>
              <td className="py-3">
                <Badge variant="outline" style={{ borderColor: TASK_PRIORITY_COLORS[task.priority] }}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
              </td>
              <td className="py-3 text-sm">
                {task.category_id ? (() => {
                  const cat = categories.find(c => c.id === task.category_id);
                  return cat ? (
                    <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }}>
                      {cat.name}
                    </Badge>
                  ) : '—';
                })() : '—'}
              </td>
              <td className="py-3">
                {task.assignee_id ? (() => {
                  const member = members.find(m => m.user_id === task.assignee_id);
                  return (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={member?.full_name || member?.email || '?'} size="sm" />
                      <span className="text-sm">{member?.full_name || member?.email || task.assignee_id.slice(0, 8)}</span>
                    </div>
                  );
                })() : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {task.due_date ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.due_date)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {task.pin_x != null ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Na výkresu
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
