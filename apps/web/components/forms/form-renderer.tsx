'use client';

import { useState } from 'react';
import { Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface FormField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'photo';
  label: string;
  required?: boolean;
  options?: string[];
}

interface FormRendererProps {
  submissionId: string;
  schema: { fields: FormField[] };
  initialData: Record<string, unknown>;
  status: string;
  onSaved?: () => void;
  onSubmitted?: () => void;
}

export function FormRenderer({ submissionId, schema, initialData, status, onSaved, onSubmitted }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [saving, setSaving] = useState(false);

  function updateField(name: string, value: unknown) {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('form_submissions')
      .update({ data: formData, updated_at: new Date().toISOString() })
      .eq('id', submissionId);

    if (error) toast.error(error.message);
    else { toast.success('Formulář uložen'); onSaved?.(); }
    setSaving(false);
  }

  async function handleSubmit() {
    // Validate required fields
    const missing = schema.fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.label);

    if (missing.length > 0) {
      toast.error(`Vyplňte povinná pole: ${missing.join(', ')}`);
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('form_submissions')
      .update({
        data: formData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) toast.error(error.message);
    else { toast.success('Formulář odeslán'); onSubmitted?.(); }
    setSaving(false);
  }

  const readOnly = status === 'submitted' || status === 'approved';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulář</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schema.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input
                value={(formData[field.name] as string) || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={readOnly}
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                value={(formData[field.name] as string) || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={readOnly}
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={(formData[field.name] as string) || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={readOnly}
              />
            )}

            {field.type === 'date' && (
              <Input
                type="date"
                value={(formData[field.name] as string) || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={readOnly}
              />
            )}

            {field.type === 'select' && (
              <Select
                value={(formData[field.name] as string) || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Vyberte —</option>
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!formData[field.name]}
                  onChange={(e) => updateField(field.name, e.target.checked)}
                  disabled={readOnly}
                />
                <span className="text-sm">{field.label}</span>
              </label>
            )}

            {field.type === 'photo' && (
              <Input
                type="file"
                accept="image/*"
                disabled={readOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) updateField(field.name, file.name);
                }}
              />
            )}
          </div>
        ))}

        {!readOnly && (
          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-3.5 w-3.5" />
              Uložit koncept
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Send className="mr-1 h-3.5 w-3.5" />
              Odeslat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
