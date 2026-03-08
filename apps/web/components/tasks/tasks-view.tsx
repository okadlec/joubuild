'use client';

import { useState, useMemo } from 'react';
import { Plus, List, Columns, Calendar, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KanbanBoard } from './kanban-board';
import { TaskList } from './task-list';
import { TaskDialog } from './task-dialog';
import { TaskFiltersBar, EMPTY_FILTERS, type TaskFilters } from './task-filters';
import { GanttChart } from './gantt-chart';
import { CalendarView } from './calendar-view';
import type { Task, TaskCategory, ProjectMember, Tag } from '@joubuild/shared';
import { usePermissions } from '@/lib/hooks/use-permissions';

interface TasksViewProps {
  projectId: string;
  initialTasks: Task[];
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
  tags?: Tag[];
}

export function TasksView({ projectId, initialTasks, categories = [], members = [], tags = [] }: TasksViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = usePermissions(projectId);
  const canCreate = hasPermission('tasks', 'can_create');
  const canEdit = hasPermission('tasks', 'can_edit');
  const canDelete = hasPermission('tasks', 'can_delete');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !(t.description || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.categoryId && t.category_id !== filters.categoryId) return false;
      if (filters.assigneeId && t.assignee_id !== filters.assigneeId) return false;
      return true;
    });
  }, [tasks, filters]);

  function handleTaskCreated(task: Task) {
    setTasks(prev => [...prev, task]);
    setShowCreate(false);
  }

  function handleTaskUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTask(null);
  }

  function handleTaskDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Úkoly</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} úkolů</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filtr
          </Button>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nový úkol
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-4">
          <TaskFiltersBar
            filters={filters}
            onChange={setFilters}
            categories={categories}
            members={members}
          />
        </div>
      )}

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <Columns className="mr-1 h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-1 h-4 w-4" />
            Seznam
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-1 h-4 w-4" />
            Kalendář
          </TabsTrigger>
          <TabsTrigger value="gantt">
            <BarChart3 className="mr-1 h-4 w-4" />
            Gantt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={setEditingTask}
            onTasksReorder={setTasks}
            projectId={projectId}
            categories={categories}
            members={members}
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskList
            tasks={filteredTasks}
            onTaskClick={setEditingTask}
            categories={categories}
            members={members}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView tasks={filteredTasks} onTaskClick={setEditingTask} />
        </TabsContent>

        <TabsContent value="gantt">
          <GanttChart tasks={filteredTasks} onTaskClick={setEditingTask} />
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={showCreate || !!editingTask}
        onClose={() => { setShowCreate(false); setEditingTask(null); }}
        projectId={projectId}
        task={editingTask}
        onCreated={handleTaskCreated}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        categories={categories}
        members={members}
        tags={tags}
        readOnly={!canEdit && !canCreate}
      />
    </div>
  );
}
