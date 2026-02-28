'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  type Task,
  type TaskCategory,
  type ProjectMember,
} from '@joubuild/shared';
import { Calendar } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const COLUMNS = ['open', 'in_progress', 'done', 'closed'] as const;

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTasksReorder: (tasks: Task[]) => void;
  projectId: string;
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
}

export function KanbanBoard({ tasks, onTaskClick, onTasksReorder, projectId, categories = [], members = [] }: KanbanBoardProps) {
  async function handleDrop(taskId: string, newStatus: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Chyba při aktualizaci');
      return;
    }

    onTasksReorder(
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus as Task['status'], updated_at: new Date().toISOString() }
          : t
      )
    );
  }

  return (
    <div className="mt-4 grid grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className="rounded-lg bg-muted/50 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('taskId');
              if (taskId) handleDrop(taskId, status);
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
              />
              <h3 className="text-sm font-semibold">
                {TASK_STATUS_LABELS[status]}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {columnTasks.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                  onClick={() => onTaskClick(task)}
                >
                  <CardContent className="p-3">
                    <div className="mb-1 flex items-start justify-between">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div
                        className="ml-2 mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: TASK_PRIORITY_COLORS[task.priority] }}
                        title={task.priority}
                      />
                    </div>

                    {task.description && (
                      <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {task.category_id && (() => {
                      const cat = categories.find(c => c.id === task.category_id);
                      return cat ? (
                        <Badge variant="outline" className="mb-1 text-[10px]" style={{ borderColor: cat.color, color: cat.color }}>
                          {cat.name}
                        </Badge>
                      ) : null;
                    })()}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('cs-CZ')}
                        </span>
                      )}
                      <div className="flex-1" />
                      {task.assignee_id && (() => {
                        const member = members.find(m => m.user_id === task.assignee_id);
                        return (
                          <Avatar
                            name={member?.full_name || member?.email || task.assignee_id.slice(0, 4)}
                            size="sm"
                          />
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
