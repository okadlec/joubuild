'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Timesheet, Task } from '@joubuild/shared';
import { toast } from 'sonner';

interface TimesheetViewProps {
  projectId: string;
  tasks: Task[];
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TimesheetView({ projectId, tasks }: TimesheetViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [entries, setEntries] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Grid: task -> days
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = `${toDateStr(weekDates[0])} – ${toDateStr(weekDates[6])}`;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('timesheets')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .gte('date', toDateStr(weekDates[0]))
        .lte('date', toDateStr(weekDates[6]));

      if (data) {
        setEntries(data as Timesheet[]);
        const newGrid: Record<string, Record<string, number>> = {};
        for (const entry of data) {
          const taskKey = entry.task_id || '__general__';
          if (!newGrid[taskKey]) newGrid[taskKey] = {};
          newGrid[taskKey][entry.date] = entry.hours;
        }
        setGrid(newGrid);
      }
      setLoading(false);
    }
    load();
  }, [projectId, weekStart]);

  function updateHours(taskId: string, date: string, hours: number) {
    setGrid(prev => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || {}), [date]: hours },
    }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Delete existing entries for this week
    await supabase
      .from('timesheets')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .gte('date', toDateStr(weekDates[0]))
      .lte('date', toDateStr(weekDates[6]));

    // Insert new entries
    const inserts: { project_id: string; user_id: string; task_id: string | null; date: string; hours: number }[] = [];
    for (const [taskId, days] of Object.entries(grid)) {
      for (const [date, hours] of Object.entries(days)) {
        if (hours > 0) {
          inserts.push({
            project_id: projectId,
            user_id: user.id,
            task_id: taskId === '__general__' ? null : taskId,
            date,
            hours,
          });
        }
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('timesheets').insert(inserts);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }

    toast.success('Výkaz uložen');
    setSaving(false);
  }

  // Task rows - start with tasks that have entries + general
  const taskRows = useMemo(() => {
    const ids = new Set(Object.keys(grid));
    ids.add('__general__');
    return Array.from(ids);
  }, [grid]);

  function getTaskLabel(id: string) {
    if (id === '__general__') return 'Obecné práce';
    const task = tasks.find(t => t.id === id);
    return task?.title || id.slice(0, 8);
  }

  function totalForDay(date: string) {
    return Object.values(grid).reduce((sum, days) => sum + (days[date] || 0), 0);
  }

  function totalForTask(taskId: string) {
    return Object.values(grid[taskId] || {}).reduce((sum, h) => sum + h, 0);
  }

  const weekTotal = weekDates.reduce((sum, d) => sum + totalForDay(toDateStr(d)), 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Výkazy</h1>
          <p className="text-sm text-muted-foreground">Týdenní výkaz hodin</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Ukládání...' : 'Uložit výkaz'}
        </Button>
      </div>

      {/* Week navigation */}
      <div className="mb-4 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() - 7);
          setWeekStart(d);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="outline" size="icon" onClick={() => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + 7);
          setWeekStart(d);
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Načítání...</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left text-sm font-medium w-48">Úkol</th>
                  {weekDates.map((d, i) => (
                    <th key={i} className="p-2 text-center text-sm font-medium w-20">
                      <div>{WEEKDAYS[i]}</div>
                      <div className="text-xs text-muted-foreground">{d.getDate()}.{d.getMonth() + 1}.</div>
                    </th>
                  ))}
                  <th className="p-2 text-center text-sm font-medium w-20">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.map((taskId) => (
                  <tr key={taskId} className="border-b">
                    <td className="p-2 text-sm truncate max-w-[200px]">{getTaskLabel(taskId)}</td>
                    {weekDates.map((d) => {
                      const dateStr = toDateStr(d);
                      return (
                        <td key={dateStr} className="p-1">
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={grid[taskId]?.[dateStr] || ''}
                            onChange={(e) => updateHours(taskId, dateStr, parseFloat(e.target.value) || 0)}
                            className="h-8 w-16 text-center text-sm mx-auto"
                          />
                        </td>
                      );
                    })}
                    <td className="p-2 text-center text-sm font-medium">{totalForTask(taskId) || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50">
                  <td className="p-2 text-sm font-semibold">Celkem</td>
                  {weekDates.map((d) => (
                    <td key={toDateStr(d)} className="p-2 text-center text-sm font-semibold">
                      {totalForDay(toDateStr(d)) || '—'}
                    </td>
                  ))}
                  <td className="p-2 text-center text-sm font-bold">{weekTotal}h</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => {
          if (tasks.length > 0) {
            const unused = tasks.find(t => !taskRows.includes(t.id));
            if (unused) {
              setGrid(prev => ({ ...prev, [unused.id]: {} }));
            } else {
              toast.info('Všechny úkoly jsou již přidány');
            }
          }
        }}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Přidat řádek úkolu
        </Button>
      </div>
    </div>
  );
}
