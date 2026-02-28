'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface FormSchema {
  fields: FormField[];
}

interface FormBuilderProps {
  templateId: string;
  initialSchema: FormSchema;
  onSave: (schema: FormSchema) => void;
}

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Dlouhý text' },
  { value: 'number', label: 'Číslo' },
  { value: 'date', label: 'Datum' },
  { value: 'select', label: 'Výběr' },
  { value: 'checkbox', label: 'Zaškrtávací' },
  { value: 'photo', label: 'Fotografie' },
];

export function FormBuilder({ templateId, initialSchema, onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialSchema.fields || []);
  const [saving, setSaving] = useState(false);

  function addField() {
    setFields(prev => [...prev, {
      name: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
    }]);
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  function moveField(from: number, to: number) {
    if (to < 0 || to >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(from, 1);
    newFields.splice(to, 0, moved);
    setFields(newFields);
  }

  async function handleSave() {
    setSaving(true);
    const schema: FormSchema = { fields };
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('form_templates')
      .update({ schema, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Šablona uložena');
      onSave(schema);
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Editor polí</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? 'Ukládání...' : 'Uložit šablonu'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field, index) => (
          <div key={index} className="flex items-start gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1 pt-1">
              <button onClick={() => moveField(index, index - 1)} className="text-muted-foreground hover:text-foreground" disabled={index === 0}>↑</button>
              <button onClick={() => moveField(index, index + 1)} className="text-muted-foreground hover:text-foreground" disabled={index === fields.length - 1}>↓</button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                  placeholder="Název pole"
                  className="h-8 flex-1"
                />
                <Select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                  className="h-8 w-32"
                >
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </Select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  Povinné
                </label>
              </div>
              {field.type === 'select' && (
                <Input
                  value={(field.options || []).join(', ')}
                  onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Možnosti (oddělené čárkou)"
                  className="h-8 text-sm"
                />
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeField(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addField}>
          <Plus className="mr-2 h-4 w-4" />
          Přidat pole
        </Button>
      </CardContent>
    </Card>
  );
}
