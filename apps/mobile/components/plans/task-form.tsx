import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createTask } from '@joubuild/supabase';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';

interface TaskFormProps {
  projectId: string;
  sheetId?: string | null;
  annotationId?: string | null;
  onTaskCreated: () => void;
}

export function TaskForm({
  projectId,
  sheetId,
  annotationId,
  onTaskCreated,
}: TaskFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(projectId);

  if (!hasPermission('tasks', 'can_create')) {
    return null;
  }
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createTask(supabase, {
        project_id: projectId,
        sheet_id: sheetId ?? null,
        annotation_id: annotationId ?? null,
        title: title.trim(),
        status,
        priority,
        created_by: user?.id ?? null,
      });
      setTitle('');
      onTaskCreated();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-4 pt-4">
      <Text className="text-neutral-400 text-xs uppercase mb-2">
        {t('plans.taskTitle')}
      </Text>
      <TextInput
        className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
        placeholder={t('plans.taskTitle')}
        placeholderTextColor="#737373"
        value={title}
        onChangeText={setTitle}
      />

      <Text className="text-neutral-400 text-xs uppercase mb-2">
        {t('plans.taskStatus')}
      </Text>
      <View className="flex-row flex-wrap mb-4">
        {TASK_STATUSES.map((s) => {
          const color = TASK_STATUS_COLORS[s] ?? '#6B7280';
          return (
            <TouchableOpacity
              key={s}
              className="mr-2 mb-2 rounded-lg px-3 py-2"
              style={{
                backgroundColor: status === s ? color + '30' : '#262626',
                borderWidth: 1,
                borderColor: status === s ? color : '#404040',
              }}
              onPress={() => setStatus(s)}
            >
              <Text
                style={{ color: status === s ? color : '#a3a3a3' }}
                className="text-sm"
              >
                {TASK_STATUS_LABELS[s] ?? s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-neutral-400 text-xs uppercase mb-2">
        {t('plans.taskPriority')}
      </Text>
      <View className="flex-row flex-wrap mb-6">
        {TASK_PRIORITIES.map((p) => {
          const color = TASK_PRIORITY_COLORS[p] ?? '#6B7280';
          return (
            <TouchableOpacity
              key={p}
              className="mr-2 mb-2 rounded-lg px-3 py-2"
              style={{
                backgroundColor: priority === p ? color + '30' : '#262626',
                borderWidth: 1,
                borderColor: priority === p ? color : '#404040',
              }}
              onPress={() => setPriority(p)}
            >
              <Text
                style={{ color: priority === p ? color : '#a3a3a3' }}
                className="text-sm"
              >
                {TASK_PRIORITY_LABELS[p] ?? p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        className="bg-blue-500 rounded-lg py-3 items-center mb-8"
        onPress={submit}
        disabled={!title.trim() || creating}
        style={{ opacity: !title.trim() || creating ? 0.5 : 1 }}
      >
        <Text className="text-white font-semibold">
          {t('plans.createTask')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
