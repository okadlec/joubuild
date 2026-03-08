import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
  TASK_PRIORITY_COLORS,
} from '@joubuild/shared';
import type { TaskCategory } from '@joubuild/shared';
import type { MemberWithProfile } from '@/hooks/use-project-members';

export interface TaskFiltersState {
  status?: string;
  priority?: string;
  assignee_id?: string;
  category_id?: string;
}

interface TaskFilterSheetProps {
  visible: boolean;
  filters: TaskFiltersState;
  categories: TaskCategory[];
  members: MemberWithProfile[];
  onApply: (filters: TaskFiltersState) => void;
  onClose: () => void;
}

export function TaskFilterSheet({
  visible,
  filters,
  categories,
  members,
  onApply,
  onClose,
}: TaskFilterSheetProps) {
  const { t } = useTranslation();

  const toggle = (key: keyof TaskFiltersState, value: string) => {
    onApply({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  };

  const clearAll = () => {
    onApply({});
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-neutral-950">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-800">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={24} color="#a3a3a3" />
          </TouchableOpacity>
          <Text className="text-white font-semibold text-lg">
            {t('tasks.filters')}
          </Text>
          <TouchableOpacity onPress={clearAll} className="p-1">
            <Text className="text-blue-500 text-sm">
              {t('tasks.clearFilters')}
              {activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {/* Status */}
          <Text className="text-neutral-400 text-xs uppercase mb-2">
            {t('tasks.statusLabel')}
          </Text>
          <View className="flex-row flex-wrap mb-5">
            {TASK_STATUSES.map((s) => {
              const color = TASK_STATUS_COLORS[s] ?? '#6B7280';
              const isSelected = filters.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  className="mr-2 mb-2 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: isSelected ? color + '30' : '#262626',
                    borderWidth: 1,
                    borderColor: isSelected ? color : '#404040',
                  }}
                  onPress={() => toggle('status', s)}
                >
                  <Text
                    style={{ color: isSelected ? color : '#a3a3a3' }}
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
              const isSelected = filters.priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  className="mr-2 mb-2 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: isSelected ? color + '30' : '#262626',
                    borderWidth: 1,
                    borderColor: isSelected ? color : '#404040',
                  }}
                  onPress={() => toggle('priority', p)}
                >
                  <Text
                    style={{ color: isSelected ? color : '#a3a3a3' }}
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
                {categories.map((c) => {
                  const isSelected = filters.category_id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      className="mr-2 mb-2 rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: isSelected ? c.color + '30' : '#262626',
                        borderWidth: 1,
                        borderColor: isSelected ? c.color : '#404040',
                      }}
                      onPress={() => toggle('category_id', c.id)}
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
            {members.map((member) => {
              const isSelected = filters.assignee_id === member.user_id;
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
                  onPress={() => toggle('assignee_id', member.user_id)}
                >
                  <View className="w-8 h-8 rounded-full bg-neutral-700 items-center justify-center mr-3">
                    <Text className="text-white text-xs font-medium">
                      {(member.full_name || member.email || '?')
                        .substring(0, 2)
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
        </ScrollView>

        <TouchableOpacity
          className="bg-blue-500 mx-4 mb-8 rounded-lg py-3 items-center"
          onPress={onClose}
        >
          <Text className="text-white font-semibold">
            {t('tasks.applyFilters')}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
