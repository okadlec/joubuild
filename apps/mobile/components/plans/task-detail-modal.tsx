import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  updateTask,
  deleteTask,
  getChecklists,
  getTaskTags,
  getProjectTags,
  syncTaskTags,
  createTag,
} from '@joubuild/supabase';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import { useProjectMembers } from '@/hooks/use-project-members';
import { TaskChecklist } from './task-checklist';
import { TaskTagPicker } from './task-tag-picker';

interface TaskDetailModalProps {
  visible: boolean;
  task: any;
  projectId: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

interface Tag {
  id: string;
  name: string;
}

export function TaskDetailModal({
  visible,
  task,
  projectId,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const { t } = useTranslation();
  const { members } = useProjectMembers(projectId);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [projectTagList, setProjectTagList] = useState<Tag[]>([]);

  // Checklists
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!task) return;
    setLoading(true);

    const [checklistRes, tagsRes, projectTagsRes] = await Promise.all([
      getChecklists(supabase, task.id),
      getTaskTags(supabase, task.id),
      getProjectTags(supabase, projectId),
    ]);

    setChecklistItems(checklistRes.data ?? []);

    const tags: Tag[] = (tagsRes.data ?? []).map((row: any) => ({
      id: row.tags.id,
      name: row.tags.name,
    }));
    setSelectedTags(tags);

    setProjectTagList(
      (projectTagsRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name }))
    );

    setLoading(false);
  }, [task, projectId]);

  useEffect(() => {
    if (visible && task) {
      setTitle(task.title ?? '');
      setStatus(task.status ?? 'open');
      setPriority(task.priority ?? 'normal');
      setAssigneeId(task.assignee_id ?? null);
      loadData();
    }
  }, [visible, task, loadData]);

  const reloadChecklists = useCallback(async () => {
    if (!task) return;
    const { data } = await getChecklists(supabase, task.id);
    setChecklistItems(data ?? []);
  }, [task]);

  const handleSave = async () => {
    if (!task || saving) return;
    setSaving(true);
    try {
      await updateTask(supabase, task.id, {
        title: title.trim(),
        status,
        priority,
        assignee_id: assigneeId,
      });
      await syncTaskTags(
        supabase,
        task.id,
        selectedTags.map((t) => t.id)
      );
      onUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('plans.deleteTask'), t('plans.deleteTaskConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('plans.deleteTask'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(supabase, task.id);
            onDeleted();
            onClose();
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  const handleAddTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]
    );
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async (name: string): Promise<Tag | null> => {
    try {
      const { data, error } = await createTag(supabase, {
        project_id: projectId,
        name,
      });
      if (error || !data) return null;
      const newTag = { id: data.id, name: data.name };
      setProjectTagList((prev) => [...prev, newTag]);
      return newTag;
    } catch {
      return null;
    }
  };

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-neutral-950">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-800">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={24} color="#a3a3a3" />
          </TouchableOpacity>
          <Text className="text-white font-semibold text-lg">
            {t('plans.editTask')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !title.trim()}
            style={{ opacity: saving || !title.trim() ? 0.5 : 1 }}
            className="p-1"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text className="text-blue-500 font-semibold">
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            {/* Title */}
            <TextInput
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white text-base mb-5"
              value={title}
              onChangeText={setTitle}
              placeholder={t('plans.taskTitle')}
              placeholderTextColor="#737373"
            />

            {/* Status */}
            <Text className="text-neutral-400 text-xs uppercase mb-2">
              {t('plans.taskStatus')}
            </Text>
            <View className="flex-row flex-wrap mb-5">
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

            {/* Priority */}
            <Text className="text-neutral-400 text-xs uppercase mb-2">
              {t('plans.taskPriority')}
            </Text>
            <View className="flex-row flex-wrap mb-5">
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

            {/* Assignee */}
            <Text className="text-neutral-400 text-xs uppercase mb-2">
              {t('plans.assignee')}
            </Text>
            <View className="mb-5">
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
                  {t('plans.unassigned')}
                </Text>
              </TouchableOpacity>
              {members.map((member) => {
                const isSelected = assigneeId === member.user_id;
                const displayName =
                  member.full_name || member.email || member.user_id;
                const initials = (member.full_name || member.email || '?')
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <TouchableOpacity
                    key={member.user_id}
                    className="flex-row items-center rounded-lg px-3 py-2 mb-1"
                    style={{
                      backgroundColor: isSelected ? '#3B82F620' : '#262626',
                      borderWidth: 1,
                      borderColor: isSelected ? '#3B82F6' : '#404040',
                    }}
                    onPress={() =>
                      setAssigneeId(isSelected ? null : member.user_id)
                    }
                  >
                    <View className="w-8 h-8 rounded-full bg-neutral-700 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-medium">
                        {initials}
                      </Text>
                    </View>
                    <Text
                      className="text-sm flex-1"
                      style={{ color: isSelected ? '#3B82F6' : '#fff' }}
                    >
                      {displayName}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tags */}
            <View className="mb-5">
              <TaskTagPicker
                selectedTags={selectedTags}
                projectTags={projectTagList}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                onCreateTag={handleCreateTag}
              />
            </View>

            {/* Checklist */}
            <View className="mb-5">
              <TaskChecklist
                taskId={task.id}
                items={checklistItems}
                onChanged={reloadChecklists}
              />
            </View>

            {/* Delete */}
            <TouchableOpacity
              className="border border-red-900 rounded-lg py-3 items-center mb-12"
              onPress={handleDelete}
            >
              <Text className="text-red-500 font-semibold">
                {t('plans.deleteTask')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
