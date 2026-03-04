'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';
import { DEFAULT_CATEGORY_COLORS, type TaskCategory } from '@joubuild/shared';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface CategoryManagerProps {
  projectId: string;
  categories: TaskCategory[];
  onCategoriesChange: (categories: TaskCategory[]) => void;
}

export function CategoryManager({ projectId, categories, onCategoriesChange }: CategoryManagerProps) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(DEFAULT_CATEGORY_COLORS[0]);
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('task_categories')
      .insert({
        project_id: projectId,
        name: newName.trim(),
        color: newColor,
        sort_order: categories.length,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setAdding(false);
      return;
    }

    onCategoriesChange([...categories, data as TaskCategory]);
    setNewName('');
    setNewColor(DEFAULT_CATEGORY_COLORS[(categories.length + 1) % DEFAULT_CATEGORY_COLORS.length]);
    setAdding(false);
    toast.success(t('categories.categoryCreated'));
  }

  async function handleDelete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('task_categories').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onCategoriesChange(categories.filter(c => c.id !== id));
    toast.success(t('categories.categoryDeleted'));
  }

  async function handleUpdate(id: string, updates: Partial<TaskCategory>) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('task_categories')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error(error.message);
      return;
    }
    onCategoriesChange(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('categories.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length > 0 && (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-md border p-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div
                  className="h-5 w-5 shrink-0 rounded-full border"
                  style={{ backgroundColor: cat.color }}
                />
                <Input
                  defaultValue={cat.name}
                  className="h-8 flex-1"
                  onBlur={(e) => {
                    if (e.target.value !== cat.name) {
                      handleUpdate(cat.id, { name: e.target.value });
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{t('categories.newCategory')}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Elektro, ZTI, SDK..."
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('categories.color')}</Label>
            <div className="flex gap-1">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`h-6 w-6 rounded-full border-2 ${newColor === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={adding || !newName.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tCommon('add')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
