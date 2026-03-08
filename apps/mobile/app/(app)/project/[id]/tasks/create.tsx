import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createTask } from '@joubuild/supabase';
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTaskCategories } from '@/hooks/use-task-categories';
import { useProjectMembers } from '@/hooks/use-project-members';

export default function CreateTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { categories } = useTaskCategories(id!);
  const { members } = useProjectMembers(id!);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createTask(supabase, {
        project_id: id!,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        category_id: categoryId,
        assignee_id: assigneeId,
        created_by: user?.id ?? null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('tasks.createTask'),
          headerRight: () => (
            <TouchableOpacity
              onPress={submit}
              disabled={!title.trim() || creating}
              style={{ opacity: !title.trim() || creating ? 0.5 : 1 }}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className="text-blue-500 font-semibold">{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-neutral-950 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.taskTitle')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
          placeholder={t('tasks.taskTitle')}
          placeholderTextColor="#737373"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Description */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.description')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
          placeholder={t('tasks.descriptionPlaceholder')}
          placeholderTextColor="#737373"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
        />

        {/* Status */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.statusLabel')}
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
                  {t(`tasks.status.${s}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Priority */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.priorityLabel')}
        </Text>
        <View className="flex-row flex-wrap mb-4">
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
                  {t(`tasks.priority.${p}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category */}
        {categories.length > 0 && (
          <>
            <Text className="text-neutral-400 text-xs uppercase mb-2">
              {t('tasks.category')}
            </Text>
            <View className="flex-row flex-wrap mb-4">
              <TouchableOpacity
                className="mr-2 mb-2 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: !categoryId ? '#3B82F620' : '#262626',
                  borderWidth: 1,
                  borderColor: !categoryId ? '#3B82F6' : '#404040',
                }}
                onPress={() => setCategoryId(null)}
              >
                <Text
                  className="text-sm"
                  style={{ color: !categoryId ? '#3B82F6' : '#a3a3a3' }}
                >
                  {t('tasks.noCategory')}
                </Text>
              </TouchableOpacity>
              {categories.map((c) => {
                const isSelected = categoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    className="mr-2 mb-2 rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isSelected ? c.color + '30' : '#262626',
                      borderWidth: 1,
                      borderColor: isSelected ? c.color : '#404040',
                    }}
                    onPress={() => setCategoryId(isSelected ? null : c.id)}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: isSelected ? c.color : '#a3a3a3' }}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Assignee */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.assignee')}
        </Text>
        <View className="mb-8">
          <TouchableOpacity
            className="rounded-lg px-3 py-2 mb-1"
            style={{
              backgroundColor: !assigneeId ? '#3B82F620' : '#262626',
              borderWidth: 1,
              borderColor: !assigneeId ? '#3B82F6' : '#404040',
            }}
            onPress={() => setAssigneeId(null)}
          >
            <Text
              className="text-sm"
              style={{ color: !assigneeId ? '#3B82F6' : '#a3a3a3' }}
            >
              {t('tasks.unassigned')}
            </Text>
          </TouchableOpacity>
          {members.map((member) => {
            const isSelected = assigneeId === member.user_id;
            const displayName = member.full_name || member.email || member.user_id;
            return (
              <TouchableOpacity
                key={member.user_id}
                className="flex-row items-center rounded-lg px-3 py-2 mb-1"
                style={{
                  backgroundColor: isSelected ? '#3B82F620' : '#262626',
                  borderWidth: 1,
                  borderColor: isSelected ? '#3B82F6' : '#404040',
                }}
                onPress={() => setAssigneeId(isSelected ? null : member.user_id)}
              >
                <View className="w-8 h-8 rounded-full bg-neutral-700 items-center justify-center mr-3">
                  <Text className="text-white text-xs font-medium">
                    {(member.full_name || member.email || '?').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text
                  className="text-sm flex-1"
                  style={{ color: isSelected ? '#3B82F6' : '#fff' }}
                >
                  {displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}
