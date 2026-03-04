'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, ClipboardList, FileCheck, Send, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
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
import { FormRenderer } from './form-renderer';
import { FormBuilder } from './form-builder';

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
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const [templates, setTemplates] = useState(initialTemplates);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [showCreate, setShowCreate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('daily_report');
  const [rfis, setRfis] = useState<Rfi[]>(initialRfis);

  // Click-to-open state
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

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
    setSelectedSubmission(data);
    toast.success(t('formCreated'));
  }

  async function handleApproveReject(submissionId: string, newStatus: 'approved' | 'rejected') {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('form_submissions')
      .update({
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubmissions(prev =>
      prev.map(s => s.id === submissionId ? { ...s, status: newStatus } : s)
    );
    setSelectedSubmission(null);
    toast.success(newStatus === 'approved' ? 'Formulář schválen' : 'Formulář zamítnut');
  }

  type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'photo';
  type ParsedSchema = { fields: Array<{ name: string; type: FormFieldType; label: string; required?: boolean; options?: string[] }> };

  function parseSchema(raw: Record<string, unknown>): ParsedSchema {
    const s = raw as { fields?: unknown[] };
    return { fields: (s?.fields || []) as ParsedSchema['fields'] };
  }

  function getTemplateSchema(submission: FormSubmission): ParsedSchema {
    const template = templates.find(t => t.id === submission.template_id);
    return parseSchema(template?.schema || {});
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
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
            {t('templates')}
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
                <Card
                  key={sub.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedSubmission(sub)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {sub.form_templates?.name || 'Formulář'}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(sub.created_at)}</span>
                        {sub.form_templates?.type && (
                          <span>{t(`formTypes.${sub.form_templates.type}`)}</span>
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
                      {t(`formTypes.${tmpl.type}`)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex gap-2 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingTemplate(tmpl)}
                    >
                      Upravit šablonu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCreateSubmission(tmpl.id)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Vyplnit
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

      {/* Create template dialog */}
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

      {/* View/edit submission dialog */}
      <Dialog
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        className="max-w-2xl"
      >
        {selectedSubmission && (
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedSubmission.form_templates?.name || 'Formulář'}
              </DialogTitle>
            </DialogHeader>
            <FormRenderer
              submissionId={selectedSubmission.id}
              schema={getTemplateSchema(selectedSubmission)}
              initialData={selectedSubmission.data}
              status={selectedSubmission.status}
              onSaved={() => {
                // Refresh submission list
                setSelectedSubmission(null);
              }}
              onSubmitted={() => {
                setSubmissions(prev =>
                  prev.map(s => s.id === selectedSubmission.id ? { ...s, status: 'submitted' } : s)
                );
                setSelectedSubmission(null);
              }}
            />
            {selectedSubmission.status === 'submitted' && (
              <div className="mt-4 flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleApproveReject(selectedSubmission.id, 'approved')}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Schválit
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleApproveReject(selectedSubmission.id, 'rejected')}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Zamítnout
                </Button>
              </div>
            )}
          </>
        )}
      </Dialog>

      {/* Edit template dialog */}
      <Dialog
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        className="max-w-2xl"
      >
        {editingTemplate && (
          <>
            <DialogHeader>
              <DialogTitle>Upravit: {editingTemplate.name}</DialogTitle>
            </DialogHeader>
            <FormBuilder
              templateId={editingTemplate.id}
              initialSchema={parseSchema(editingTemplate.schema)}
              onSave={(newSchema) => {
                setTemplates(prev =>
                  prev.map(t => t.id === editingTemplate.id ? { ...t, schema: newSchema as unknown as Record<string, unknown> } : t)
                );
                setEditingTemplate(null);
              }}
            />
          </>
        )}
      </Dialog>
    </div>
  );
}
