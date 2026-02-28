'use client';

import { useState } from 'react';
import { Plus, ClipboardList, FileCheck, Clock, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { FORM_TYPE_LABELS, formatDate, type Rfi } from '@joubuild/shared';
import { toast } from 'sonner';
import { RfiView } from './rfi-view';

interface FormTemplate {
  id: string;
  name: string;
  type: string;
  schema: Record<string, unknown>;
  created_at: string;
}

interface FormSubmission {
  id: string;
  template_id: string;
  data: Record<string, unknown>;
  status: string;
  submitted_at: string | null;
  created_at: string;
  form_templates?: { name: string; type: string };
}

interface FormsViewProps {
  projectId: string;
  initialTemplates: FormTemplate[];
  initialSubmissions: FormSubmission[];
  initialRfis?: Rfi[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Koncept',
  submitted: 'Odesláno',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  submitted: 'default',
  approved: 'outline',
  rejected: 'destructive',
};

export function FormsView({ projectId, initialTemplates, initialSubmissions, initialRfis = [] }: FormsViewProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [showCreate, setShowCreate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('daily_report');
  const [rfis, setRfis] = useState<Rfi[]>(initialRfis);

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const defaultSchema = {
      fields: [
        { name: 'date', type: 'date', label: 'Datum', required: true },
        { name: 'weather', type: 'select', label: 'Počasí', options: ['Jasno', 'Oblačno', 'Déšť', 'Sníh'] },
        { name: 'temperature', type: 'number', label: 'Teplota (°C)' },
        { name: 'workers_count', type: 'number', label: 'Počet pracovníků' },
        { name: 'work_description', type: 'textarea', label: 'Popis prací', required: true },
        { name: 'notes', type: 'textarea', label: 'Poznámky' },
      ],
    };

    const { data, error } = await supabase
      .from('form_templates')
      .insert({
        project_id: projectId,
        name: templateName,
        type: templateType,
        schema: defaultSchema,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setTemplates(prev => [data, ...prev]);
    setShowCreate(false);
    setTemplateName('');
    toast.success('Šablona vytvořena');
  }

  async function handleCreateSubmission(templateId: string) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        template_id: templateId,
        project_id: projectId,
        data: {},
        status: 'draft',
        submitted_by: user?.id,
      })
      .select('*, form_templates(name, type)')
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubmissions(prev => [data, ...prev]);
    toast.success('Nový formulář vytvořen');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formuláře</h1>
          <p className="text-sm text-muted-foreground">Stavební deníky, inspekce a formuláře</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nová šablona
        </Button>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">
            <FileCheck className="mr-1 h-4 w-4" />
            Formuláře
          </TabsTrigger>
          <TabsTrigger value="templates">
            <ClipboardList className="mr-1 h-4 w-4" />
            Šablony
          </TabsTrigger>
          <TabsTrigger value="rfi">
            <MessageSquare className="mr-1 h-4 w-4" />
            RFI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          {submissions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <FileCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">Žádné formuláře</p>
              <p className="text-sm text-muted-foreground">Vytvořte šablonu a vyplňte první formulář</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {submissions.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {sub.form_templates?.name || 'Formulář'}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(sub.created_at)}</span>
                        {sub.form_templates?.type && (
                          <span>{FORM_TYPE_LABELS[sub.form_templates.type]}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANTS[sub.status]}>
                      {STATUS_LABELS[sub.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          {templates.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">Žádné šablony</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit šablonu
              </Button>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tmpl) => (
                <Card key={tmpl.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {FORM_TYPE_LABELS[tmpl.type] || tmpl.type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCreateSubmission(tmpl.id)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Vyplnit formulář
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="rfi">
          <div className="mt-4">
            <RfiView projectId={projectId} rfis={rfis} onRfisChange={setRfis} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>Nová šablona formuláře</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Stavební deník"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={templateType} onChange={(e) => setTemplateType(e.target.value)}>
              <option value="daily_report">Stavební deník</option>
              <option value="inspection">Inspekce</option>
              <option value="rfi">RFI</option>
              <option value="custom">Vlastní</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Zrušit</Button>
            <Button type="submit">Vytvořit</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
