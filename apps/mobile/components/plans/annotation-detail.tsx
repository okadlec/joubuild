import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PhotoGallery } from './photo-gallery';
import { CommentList } from './comment-list';
import { TaskForm } from './task-form';
import { TaskDetailModal } from './task-detail-modal';
import { Ionicons } from '@expo/vector-icons';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  formatRelativeTime,
} from '@joubuild/shared';
import { usePermissions } from '@/hooks/use-permissions';

type Tab = 'photos' | 'tasks' | 'comments';

interface AnnotationDetailProps {
  annotation: any;
  photos: any[];
  tasks: any[];
  comments: any[];
  projectId: string;
  sheetId: string;
  onRefresh: () => void;
}

export function AnnotationDetail({
  annotation,
  photos,
  tasks,
  comments,
  projectId,
  sheetId,
  onRefresh,
}: AnnotationDetailProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions(projectId);
  const [activeTab, setActiveTab] = useState<Tab>('photos');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const canCreateTasks = hasPermission('tasks', 'can_create');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'photos', label: t('plans.photos'), count: photos.length },
    { key: 'tasks', label: t('plans.tasks'), count: tasks.length },
    { key: 'comments', label: t('plans.comments'), count: comments.length },
  ];

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="flex-row border-b border-neutral-800">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 py-3 items-center"
            onPress={() => {
              setActiveTab(tab.key);
              setShowTaskForm(false);
            }}
            style={{
              borderBottomWidth: 2,
              borderBottomColor:
                activeTab === tab.key ? '#3B82F6' : 'transparent',
            }}
          >
            <Text
              className="text-sm"
              style={{
                color: activeTab === tab.key ? '#3B82F6' : '#a3a3a3',
              }}
            >
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-1">
        {activeTab === 'photos' && (
          <PhotoGallery
            photos={photos}
            projectId={projectId}
            annotationId={annotation.id}
            onPhotoAdded={onRefresh}
          />
        )}

        {activeTab === 'tasks' && !showTaskForm && (
          <View className="flex-1">
            {tasks.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons
                  name="checkbox-outline"
                  size={48}
                  color="#525252"
                />
                <Text className="text-neutral-500 mt-2">
                  {t('plans.noTasks')}
                </Text>
              </View>
            ) : (
              <View className="px-4 pt-4">
                {tasks.map((task) => {
                  const color = TASK_STATUS_COLORS[task.status] ?? '#6B7280';
                  const label = TASK_STATUS_LABELS[task.status] ?? task.status;
                  return (
                    <TouchableOpacity
                      key={task.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3"
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedTask(task);
                        setTaskDetailVisible(true);
                      }}
                    >
                      <Text className="text-white font-medium">
                        {task.title}
                      </Text>
                      <View className="flex-row items-center mt-2">
                        <View
                          className="rounded px-2 py-0.5 mr-2"
                          style={{
                            backgroundColor: color + '30',
                          }}
                        >
                          <Text
                            className="text-xs"
                            style={{ color }}
                          >
                            {label}
                          </Text>
                        </View>
                        <Text className="text-neutral-500 text-xs">
                          {formatRelativeTime(task.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {canCreateTasks && (
              <TouchableOpacity
                className="absolute bottom-4 right-4 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
                onPress={() => setShowTaskForm(true)}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'tasks' && showTaskForm && (
          <TaskForm
            projectId={projectId}
            sheetId={sheetId}
            annotationId={annotation.id}
            onTaskCreated={() => {
              setShowTaskForm(false);
              onRefresh();
            }}
          />
        )}

        {activeTab === 'comments' && (
          <CommentList
            comments={comments}
            annotationId={annotation.id}
            projectId={projectId}
            onCommentAdded={onRefresh}
          />
        )}
      </View>

      <TaskDetailModal
        visible={taskDetailVisible}
        task={selectedTask}
        projectId={projectId}
        onClose={() => {
          setTaskDetailVisible(false);
          setSelectedTask(null);
        }}
        onUpdated={onRefresh}
        onDeleted={onRefresh}
      />
    </View>
  );
}
