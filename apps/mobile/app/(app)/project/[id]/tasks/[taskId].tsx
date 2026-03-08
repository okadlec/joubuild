import { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  getTask,
  updateTask,
  deleteTask,
  getChecklists,
  getTaskComments,
  createComment,
  getTaskTags,
  getProjectTags,
  syncTaskTags,
  createTag,
} from '@joubuild/supabase';
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { useProjectMembers } from '@/hooks/use-project-members';
import { useTaskCategories } from '@/hooks/use-task-categories';
import { usePermissions } from '@/hooks/use-permissions';
import { TaskChecklist } from '@/components/plans/task-checklist';
import { TaskTagPicker } from '@/components/plans/task-tag-picker';
import { formatRelativeTime } from '@joubuild/shared';

interface Tag {
  id: string;
  name: string;
}

export default function TaskDetailScreen() {
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { members } = useProjectMembers(id!);
  const { categories } = useTaskCategories(id!);
  const { hasPermission } = usePermissions(id!);
  const canEdit = hasPermission('tasks', 'can_edit');
  const canDelete = hasPermission('tasks', 'can_delete');

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  // Tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [projectTagList, setProjectTagList] = useState<Tag[]>([]);

  // Checklists
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showAssigneeList, setShowAssigneeList] = useState(false);

  const loadData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);

    const [taskRes, checklistRes, tagsRes, projectTagsRes, commentsRes] =
      await Promise.all([
        getTask(supabase, taskId),
        getChecklists(supabase, taskId),
        getTaskTags(supabase, taskId),
        getProjectTags(supabase, id!),
        getTaskComments(supabase, taskId),
      ]);

    if (taskRes.error || !taskRes.data) {
      setLoading(false);
      return;
    }

    const t = taskRes.data;
    setTask(t);
    setTitle(t.title ?? '');
    setDescription(t.description ?? '');
    setStatus(t.status ?? 'open');
    setPriority(t.priority ?? 'normal');
    setCategoryId(t.category_id ?? null);
    setAssigneeId(t.assignee_id ?? null);

    setChecklistItems(checklistRes.data ?? []);

    const tags: Tag[] = (tagsRes.data ?? []).map((row: any) => ({
      id: row.tags.id,
      name: row.tags.name,
    }));
    setSelectedTags(tags);
    setProjectTagList(
      (projectTagsRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name }))
    );

    setComments(commentsRes.data ?? []);
    setLoading(false);
  }, [taskId, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reloadChecklists = useCallback(async () => {
    if (!taskId) return;
    const { data } = await getChecklists(supabase, taskId);
    setChecklistItems(data ?? []);
  }, [taskId]);

  const handleSave = async () => {
    if (!task || saving) return;
    setSaving(true);
    try {
      await updateTask(supabase, task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        category_id: categoryId,
        assignee_id: assigneeId,
      });
      await syncTaskTags(
        supabase,
        task.id,
        selectedTags.map((t) => t.id)
      );
      Alert.alert(t('tasks.taskUpdated'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('tasks.deleteTask'), t('tasks.deleteTaskConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tasks.deleteTask'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(supabase, task.id);
            router.back();
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
        project_id: id!,
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

  const handleSendComment = async () => {
    if (!commentBody.trim() || !user || sendingComment) return;
    setSendingComment(true);
    try {
      await createComment(supabase, {
        task_id: taskId!,
        user_id: user.id,
        body: commentBody.trim(),
      });
      setCommentBody('');
      const { data } = await getTaskComments(supabase, taskId!);
      setComments(data ?? []);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t('tasks.taskDetail') }} />
        <View className="flex-1 bg-neutral-950 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Stack.Screen options={{ title: t('tasks.taskDetail') }} />
        <View className="flex-1 bg-neutral-950 items-center justify-center">
          <Text className="text-neutral-400">{t('tasks.notFound')}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('tasks.taskDetail'),
          headerRight: () =>
            canEdit ? (
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !title.trim()}
                style={{ opacity: saving || !title.trim() ? 0.5 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text className="text-blue-500 font-semibold">
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView
        className="flex-1 bg-neutral-950 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white text-base mb-5"
          value={title}
          onChangeText={setTitle}
          placeholder={t('tasks.taskTitle')}
          placeholderTextColor="#737373"
          editable={canEdit}
        />

        {/* Description */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.description')}
        </Text>
        <TextInput
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-5"
          value={description}
          onChangeText={setDescription}
          placeholder={t('tasks.descriptionPlaceholder')}
          placeholderTextColor="#737373"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
          editable={canEdit}
        />

        {/* Status */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.statusLabel')}
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
                onPress={() => canEdit && setStatus(s)}
                disabled={!canEdit}
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
                onPress={() => canEdit && setPriority(p)}
                disabled={!canEdit}
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
            <View className="flex-row flex-wrap mb-5">
              <TouchableOpacity
                className="mr-2 mb-2 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: !categoryId ? '#3B82F620' : '#262626',
                  borderWidth: 1,
                  borderColor: !categoryId ? '#3B82F6' : '#404040',
                }}
                onPress={() => canEdit && setCategoryId(null)}
                disabled={!canEdit}
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
                    onPress={() => canEdit && setCategoryId(isSelected ? null : c.id)}
                    disabled={!canEdit}
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
        <View className="mb-5">
          {/* Current assignee display / toggle button */}
          <TouchableOpacity
            className="flex-row items-center rounded-lg px-3 py-2.5"
            style={{
              backgroundColor: '#262626',
              borderWidth: 1,
              borderColor: showAssigneeList ? '#3B82F6' : '#404040',
            }}
            onPress={() => canEdit && setShowAssigneeList(!showAssigneeList)}
            disabled={!canEdit}
          >
            {assigneeId ? (
              <>
                <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                  <Text className="text-blue-400 text-xs font-semibold">
                    {(() => {
                      const m = members.find((m) => m.user_id === assigneeId);
                      const name = m?.full_name || m?.email || '?';
                      return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                    })()}
                  </Text>
                </View>
                <Text className="text-white text-sm flex-1">
                  {(() => {
                    const m = members.find((m) => m.user_id === assigneeId);
                    return m?.full_name || m?.email || assigneeId;
                  })()}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="person-outline" size={18} color="#737373" />
                <Text className="text-neutral-400 text-sm ml-2 flex-1">
                  {t('tasks.unassigned')}
                </Text>
              </>
            )}
            <Ionicons
              name={showAssigneeList ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#737373"
            />
          </TouchableOpacity>

          {/* Expandable member list */}
          {showAssigneeList && (
            <View className="mt-1">
              <TouchableOpacity
                className="rounded-lg px-3 py-2 mb-1"
                style={{
                  backgroundColor: !assigneeId ? '#3B82F620' : '#262626',
                  borderWidth: 1,
                  borderColor: !assigneeId ? '#3B82F6' : '#404040',
                }}
                onPress={() => {
                  setAssigneeId(null);
                  setShowAssigneeList(false);
                }}
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
                    onPress={() => {
                      setAssigneeId(isSelected ? null : member.user_id);
                      setShowAssigneeList(false);
                    }}
                  >
                    <View className="w-8 h-8 rounded-full bg-neutral-700 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-medium">
                        {(member.full_name || member.email || '?')
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
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
          )}
        </View>

        {/* Tags */}
        {canEdit && (
          <View className="mb-5">
            <TaskTagPicker
              selectedTags={selectedTags}
              projectTags={projectTagList}
              onAdd={handleAddTag}
              onRemove={handleRemoveTag}
              onCreateTag={handleCreateTag}
            />
          </View>
        )}

        {/* Checklist */}
        <View className="mb-5">
          <TaskChecklist
            taskId={task.id}
            items={checklistItems}
            onChanged={reloadChecklists}
          />
        </View>

        {/* Comments */}
        <Text className="text-neutral-400 text-xs uppercase mb-2">
          {t('tasks.comments')}
        </Text>
        {comments.length === 0 ? (
          <View className="items-center py-6">
            <Ionicons name="chatbubbles-outline" size={32} color="#525252" />
            <Text className="text-neutral-500 mt-1 text-sm">
              {t('tasks.noComments')}
            </Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} className="mb-3">
              <View className="bg-neutral-800 rounded-xl px-4 py-3">
                <Text className="text-white">{comment.body}</Text>
              </View>
              <Text className="text-neutral-500 text-xs mt-1 ml-2">
                {formatRelativeTime(comment.created_at)}
              </Text>
            </View>
          ))
        )}

        {/* Add comment */}
        <View className="flex-row items-center mt-2 mb-5">
          <TextInput
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-4 py-2 text-white mr-2"
            placeholder={t('tasks.addComment')}
            placeholderTextColor="#737373"
            value={commentBody}
            onChangeText={setCommentBody}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentBody.trim() || sendingComment}
            className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center"
            style={{ opacity: !commentBody.trim() || sendingComment ? 0.5 : 1 }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Delete */}
        {canDelete && (
          <TouchableOpacity
            className="border border-red-900 rounded-lg py-3 items-center mb-12"
            onPress={handleDelete}
          >
            <Text className="text-red-500 font-semibold">
              {t('tasks.deleteTask')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}
