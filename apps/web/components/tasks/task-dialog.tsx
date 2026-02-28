'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@joubuild/shared';
import type { Task, TaskCategory, ProjectMember } from '@joubuild/shared';
import { toast } from 'sonner';
import { TaskComments } from './task-comments';
import { TaskChecklist } from './task-checklist';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task: Task | null;
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  categories?: TaskCategory[];
  members?: (ProjectMember & { full_name?: string | null; email?: string })[];
  initialPinX?: number;
  initialPinY?: number;
  initialSheetId?: string;
}

export function TaskDialog({
  open,
  onClose,
  projectId,
  task,
  onCreated,
  onUpdated,
  onDeleted,
  categories = [],
  members = [],
  initialPinX,
  initialPinY,
  initialSheetId,
}: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setStartDate(task.start_date || '');
      setDueDate(task.due_date || '');
      setEstimatedHours(task.estimated_hours?.toString() || '');
      setEstimatedCost(task.estimated_cost?.toString() || '');
      setActualHours(task.actual_hours?.toString() || '0');
      setActualCost(task.actual_cost?.toString() || '0');
      setCategoryId(task.category_id || '');
      setAssigneeId(task.assignee_id || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('open');
      setPriority('normal');
      setStartDate('');
      setDueDate('');
      setEstimatedHours('');
      setEstimatedCost('');
      setActualHours('');
      setActualCost('');
      setCategoryId('');
      setAssigneeId('');
    }
  }, [task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();

    const payload = {
      title,
      description: description || null,
      status,
      priority,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      actual_hours: actualHours ? parseFloat(actualHours) : 0,
      actual_cost: actualCost ? parseFloat(actualCost) : 0,
      category_id: categoryId || null,
      assignee_id: assigneeId || null,
    };

    if (task) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', task.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      onUpdated(data as Task);
      toast.success('Úkol aktualizován');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...payload,
          project_id: projectId,
          created_by: user?.id,
          ...(initialPinX != null ? { pin_x: initialPinX, pin_y: initialPinY, sheet_id: initialSheetId } : {}),
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      onCreated(data as Task);
      toast.success('Úkol vytvořen');
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!task) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onDeleted(task.id);
    toast.success('Úkol smazán');
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{task ? 'Upravit úkol' : 'Nový úkol'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Název *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název úkolu"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Popis</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popis úkolu..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priorita</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— Bez kategorie —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Přiřazeno</Label>
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Nepřiřazeno —</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Začátek</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Termín</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Odhadované hodiny</Label>
            <Input
              type="number"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Odhadované náklady (Kč)</Label>
            <Input
              type="number"
              step="100"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {task && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Skutečné hodiny</Label>
              <Input
                type="number"
                step="0.5"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Skutečné náklady (Kč)</Label>
              <Input
                type="number"
                step="100"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {task && (
          <div className="border-t pt-4">
            <TaskChecklist taskId={task.id} />
          </div>
        )}

        {task && (
          <div className="border-t pt-4">
            <TaskComments taskId={task.id} />
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <div>
            {task && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Smazat
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ukládání...' : task ? 'Uložit' : 'Vytvořit'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
