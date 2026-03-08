import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from '@joubuild/supabase';

interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_checked: boolean;
  sort_order: number;
}

interface TaskChecklistProps {
  taskId: string;
  items: ChecklistItem[];
  onChanged: () => void;
}

export function TaskChecklist({
  taskId,
  items,
  onChanged,
}: TaskChecklistProps) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const checkedCount = items.filter((i) => i.is_checked).length;
  const total = items.length;
  const progress = total > 0 ? checkedCount / total : 0;

  const handleAdd = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      await createChecklistItem(supabase, {
        task_id: taskId,
        title: newTitle.trim(),
        sort_order: items.length,
      });
      setNewTitle('');
      onChanged();
    } catch (e) {
      console.error('createChecklistItem error:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    try {
      await toggleChecklistItem(supabase, item.id, !item.is_checked);
      onChanged();
    } catch (e) {
      console.error('toggleChecklistItem error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChecklistItem(supabase, id);
      onChanged();
    } catch (e) {
      console.error('deleteChecklistItem error:', e);
    }
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-neutral-400 text-xs uppercase">
          {t('plans.checklist')}
        </Text>
        {total > 0 && (
          <Text className="text-neutral-500 text-xs">
            {checkedCount}/{total}
          </Text>
        )}
      </View>

      {total > 0 && (
        <View className="h-2 bg-neutral-800 rounded-full mb-3 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: '#10B981',
            }}
          />
        </View>
      )}

      {items.map((item) => (
        <View
          key={item.id}
          className="flex-row items-center py-2 border-b border-neutral-800"
        >
          <TouchableOpacity onPress={() => handleToggle(item)} className="mr-3">
            <Ionicons
              name={item.is_checked ? 'checkbox' : 'square-outline'}
              size={22}
              color={item.is_checked ? '#10B981' : '#737373'}
            />
          </TouchableOpacity>
          <Text
            className="flex-1 text-sm"
            style={{
              color: item.is_checked ? '#737373' : '#fff',
              textDecorationLine: item.is_checked ? 'line-through' : 'none',
            }}
          >
            {item.title}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-1">
            <Ionicons name="close" size={18} color="#525252" />
          </TouchableOpacity>
        </View>
      ))}

      <View className="flex-row items-center mt-2">
        <TextInput
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm mr-2"
          placeholder={t('plans.checklistPlaceholder')}
          placeholderTextColor="#737373"
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!newTitle.trim() || adding}
          className="bg-neutral-800 rounded-lg px-3 py-2"
          style={{ opacity: !newTitle.trim() || adding ? 0.5 : 1 }}
        >
          <Ionicons name="add" size={20} color="#a3a3a3" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
