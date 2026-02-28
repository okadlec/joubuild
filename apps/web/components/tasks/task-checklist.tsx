'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ChecklistItem } from '@joubuild/shared';
import { toast } from 'sonner';

export function TaskChecklist({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('checklists')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order');
      if (data) setItems(data as ChecklistItem[]);
    }
    load();
  }, [taskId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('checklists')
      .insert({
        task_id: taskId,
        title: newTitle.trim(),
        is_checked: false,
        sort_order: items.length,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(prev => [...prev, data as ChecklistItem]);
    setNewTitle('');
  }

  async function handleToggle(item: ChecklistItem) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('checklists')
      .update({ is_checked: !item.is_checked })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i));
  }

  async function handleDelete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('checklists').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const checkedCount = items.filter(i => i.is_checked).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          Checklist {items.length > 0 && <span className="text-muted-foreground">({checkedCount}/{items.length})</span>}
        </h4>
      </div>

      {items.length > 0 && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50">
            <button onClick={() => handleToggle(item)} className="shrink-0">
              {item.is_checked
                ? <CheckSquare className="h-4 w-4 text-green-500" />
                : <Square className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            <span className={`flex-1 text-sm ${item.is_checked ? 'text-muted-foreground line-through' : ''}`}>
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-2 flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Přidat položku..."
          className="h-8 flex-1 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8" disabled={!newTitle.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
