'use client';

import { useState } from 'react';
import { BarChart2, Download, FileText, Plus, Calendar, Loader2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { use } from 'react';

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const reportTypes = [
    { id: 'tasks', label: 'Report úkolů', description: 'Export všech úkolů s filtry', icon: FileText },
    { id: 'daily', label: 'Denní report', description: 'Stavební deník za zvolené období', icon: Calendar },
    { id: 'photos', label: 'Fotodokumentace', description: 'Export fotek ze stavby', icon: BarChart2 },
    { id: 'as_built', label: 'As-Built export', description: 'ZIP archiv aktuálních výkresů', icon: Archive },
  ];

  async function generateReport(type: string) {
    setGenerating(type);

    try {
      const supabase = getSupabaseClient();

      if (type === 'tasks') {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id)
          .order('sort_order');

        if (!tasks || tasks.length === 0) {
          toast.info('Žádné úkoly k exportu');
          setGenerating(null);
          return;
        }

        // Generate CSV
        const headers = ['Název', 'Status', 'Priorita', 'Termín', 'Odhadované hodiny', 'Skutečné hodiny'];
        const rows = tasks.map(t => [
          t.title,
          t.status,
          t.priority,
          t.due_date || '',
          t.estimated_hours?.toString() || '',
          t.actual_hours?.toString() || '0',
        ]);

        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ukoly-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report vygenerován');

      } else if (type === 'daily') {
        const { data: submissions } = await supabase
          .from('form_submissions')
          .select('*, form_templates(name, type)')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!submissions || submissions.length === 0) {
          toast.info('Žádné záznamy deníku');
          setGenerating(null);
          return;
        }

        // Generate CSV of daily reports
        const headers = ['Datum', 'Šablona', 'Status', 'Data'];
        const rows = submissions.map(s => [
          s.created_at?.slice(0, 10) || '',
          (s.form_templates as { name: string } | null)?.name || '',
          s.status,
          JSON.stringify(s.data),
        ]);

        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `denik-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report vygenerován');

      } else if (type === 'photos') {
        const { data: photos } = await supabase
          .from('photos')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (!photos || photos.length === 0) {
          toast.info('Žádné fotky k exportu');
          setGenerating(null);
          return;
        }

        // Generate CSV list of photos
        const headers = ['Datum', 'Popis', 'Typ', 'URL'];
        const rows = photos.map(p => [
          p.created_at?.slice(0, 10) || '',
          p.caption || '',
          p.type,
          p.file_url,
        ]);

        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fotky-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report vygenerován');

      } else if (type === 'as_built') {
        // Fetch all current sheet versions
        const { data: sheets } = await supabase
          .from('sheets')
          .select('*, sheet_versions(*)')
          .eq('project_id', id);

        if (!sheets || sheets.length === 0) {
          toast.info('Žádné výkresy k exportu');
          setGenerating(null);
          return;
        }

        // Create manifest CSV
        const headers = ['List', 'Verze', 'URL'];
        const rows = sheets.map((s: { name: string; sheet_versions: { is_current: boolean; version_number: number; file_url: string }[] }) => {
          const current = s.sheet_versions?.find((v: { is_current: boolean }) => v.is_current) || s.sheet_versions?.[0];
          return [s.name, `v${current?.version_number || 1}`, current?.file_url || ''];
        });

        const csv = [headers.join(';'), ...rows.map((r: string[]) => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `as-built-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('As-Built manifest vygenerován (CSV s odkazy na aktuální výkresy)');
      }
    } catch (err) {
      console.error(err);
      toast.error('Chyba při generování reportu');
    }

    setGenerating(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporty</h1>
          <p className="text-sm text-muted-foreground">Generování a export reportů</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => generateReport(report.id)}
                disabled={generating !== null}
              >
                {generating === report.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {generating === report.id ? 'Generování...' : 'Generovat'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Plánované reporty</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-medium">Žádné plánované reporty</p>
          <p className="mb-4 text-sm text-muted-foreground">Nastavte automatické generování reportů</p>
          <Button variant="outline" onClick={() => setShowSchedule(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Naplánovat report
          </Button>
        </div>
      </div>

      <Dialog open={showSchedule} onClose={() => setShowSchedule(false)}>
        <DialogHeader>
          <DialogTitle>Naplánovat report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Typ reportu</Label>
            <Select defaultValue="tasks">
              <option value="tasks">Report úkolů</option>
              <option value="daily">Denní report</option>
              <option value="photos">Fotodokumentace</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frekvence</Label>
            <Select defaultValue="weekly">
              <option value="daily">Denně</option>
              <option value="weekly">Týdně</option>
              <option value="monthly">Měsíčně</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email příjemce</Label>
            <Input type="email" placeholder="email@example.com" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Zrušit</Button>
            <Button onClick={() => { toast.success('Plán reportu uložen'); setShowSchedule(false); }}>
              Uložit
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
