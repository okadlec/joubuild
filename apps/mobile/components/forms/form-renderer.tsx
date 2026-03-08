import { useState } from 'react';
import { View, Text, TextInput, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'date';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormRendererProps {
  schema: { fields?: FormField[] };
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  editable?: boolean;
}

export function FormRenderer({
  schema,
  values,
  onChange,
  editable = true,
}: FormRendererProps) {
  const { t } = useTranslation();
  const fields = schema.fields ?? [];

  const setValue = (fieldId: string, value: any) => {
    onChange({ ...values, [fieldId]: value });
  };

  if (fields.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-neutral-500">{t('forms.noFields')}</Text>
      </View>
    );
  }

  return (
    <View>
      {fields.map((field) => (
        <View key={field.id} className="mb-4">
          <Text className="text-neutral-400 text-xs uppercase mb-2">
            {field.label}
            {field.required && <Text className="text-red-400"> *</Text>}
          </Text>

          {(field.type === 'text' || field.type === 'number') && (
            <TextInput
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white"
              placeholder={field.placeholder ?? field.label}
              placeholderTextColor="#737373"
              value={String(values[field.id] ?? '')}
              onChangeText={(v) =>
                setValue(field.id, field.type === 'number' ? Number(v) || '' : v)
              }
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              editable={editable}
            />
          )}

          {field.type === 'textarea' && (
            <TextInput
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white"
              placeholder={field.placeholder ?? field.label}
              placeholderTextColor="#737373"
              value={String(values[field.id] ?? '')}
              onChangeText={(v) => setValue(field.id, v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              editable={editable}
            />
          )}

          {field.type === 'boolean' && (
            <View className="flex-row items-center">
              <Switch
                value={!!values[field.id]}
                onValueChange={(v) => setValue(field.id, v)}
                trackColor={{ false: '#404040', true: '#3B82F680' }}
                thumbColor={values[field.id] ? '#3B82F6' : '#737373'}
                disabled={!editable}
              />
            </View>
          )}

          {field.type === 'select' && field.options && (
            <View className="flex-row flex-wrap">
              {field.options.map((opt) => {
                const isSelected = values[field.id] === opt;
                return (
                  <View
                    key={opt}
                    className="mr-2 mb-2 rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isSelected ? '#3B82F620' : '#262626',
                      borderWidth: 1,
                      borderColor: isSelected ? '#3B82F6' : '#404040',
                    }}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: isSelected ? '#3B82F6' : '#a3a3a3' }}
                      onPress={() => editable && setValue(field.id, opt)}
                    >
                      {opt}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
