import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '@/hooks/use-tasks';
import { useTaskCategories } from '@/hooks/use-task-categories';
import { useProjectMembers } from '@/hooks/use-project-members';
import { usePermissions } from '@/hooks/use-permissions';
import { TaskListItem } from '@/components/tasks/task-list-item';
import { TaskFilterBar } from '@/components/tasks/task-filter-bar';
import { TaskSearchBar } from '@/components/tasks/task-search-bar';
import { TaskFilterSheet, type TaskFiltersState } from '@/components/tasks/task-filter-sheet';

export default function TasksListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { hasPermission } = usePermissions(id!);
  const canCreate = hasPermission('tasks', 'can_create');

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<TaskFiltersState>({});

  const filters = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(advancedFilters.assignee_id ? { assignee_id: advancedFilters.assignee_id } : {}),
      ...(advancedFilters.category_id ? { category_id: advancedFilters.category_id } : {}),
    }),
    [statusFilter, advancedFilters]
  );

  const { tasks, loading, refreshing, onRefresh } = useTasks(id!, filters);
  const { categories } = useTaskCategories(id!);
  const { members } = useProjectMembers(id!);

  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      map.set(m.user_id, m.full_name || m.email || '?');
    });
    return map;
  }, [members]);

  // Client-side filtering for search query and priority (not supported by API)
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (advancedFilters.priority) {
      result = result.filter((t) => t.priority === advancedFilters.priority);
    }
    return result;
  }, [tasks, searchQuery, advancedFilters.priority]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleApplyFilters = useCallback((f: TaskFiltersState) => {
    setAdvancedFilters(f);
    if (f.status) setStatusFilter(f.status);
  }, []);

  const activeFilterCount = Object.values(advancedFilters).filter(Boolean).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('tasks.title'),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowFilterSheet(true)}
              className="mr-2"
            >
              <View>
                <Ionicons name="options-outline" size={22} color="#fff" />
                {activeFilterCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-neutral-950">
        <TaskSearchBar onSearch={handleSearch} />
        <TaskFilterBar
          selectedStatus={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : filteredTasks.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="checkbox-outline" size={48} color="#525252" />
            <Text className="text-neutral-500 mt-2">{t('tasks.noTasks')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderItem={({ item }) => (
              <TaskListItem
                task={item}
                category={item.category_id ? categoryMap.get(item.category_id) : null}
                assigneeName={item.assignee_id ? memberMap.get(item.assignee_id) : null}
                onPress={() =>
                  router.push(`/(app)/project/${id}/tasks/${item.id}` as any)
                }
              />
            )}
          />
        )}

        {canCreate && (
          <TouchableOpacity
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={() => router.push(`/(app)/project/${id}/tasks/create` as any)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <TaskFilterSheet
          visible={showFilterSheet}
          filters={{ ...advancedFilters, status: statusFilter }}
          categories={categories}
          members={members}
          onApply={handleApplyFilters}
          onClose={() => setShowFilterSheet(false)}
        />
      </View>
    </>
  );
}
