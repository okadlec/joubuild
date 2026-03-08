import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createAnnotationComment } from '@joubuild/supabase';
import { formatRelativeTime } from '@joubuild/shared';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';

interface CommentListProps {
  comments: any[];
  annotationId: string;
  projectId: string;
  onCommentAdded: () => void;
}

export function CommentList({
  comments,
  annotationId,
  projectId,
  onCommentAdded,
}: CommentListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(projectId);
  const canComment = hasPermission('tasks', 'can_create');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    await createAnnotationComment(supabase, {
      annotation_id: annotationId,
      user_id: user.id,
      body: body.trim(),
    });
    setBody('');
    setSending(false);
    onCommentAdded();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      {comments.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <Ionicons name="chatbubbles-outline" size={48} color="#525252" />
          <Text className="text-neutral-500 mt-2">
            {t('plans.noComments')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="mb-3">
              <View className="bg-neutral-800 rounded-xl px-4 py-3">
                <Text className="text-white">{item.body}</Text>
              </View>
              <Text className="text-neutral-500 text-xs mt-1 ml-2">
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>
          )}
        />
      )}

      {canComment && (
        <View className="flex-row items-center px-4 py-3 border-t border-neutral-800 bg-neutral-900">
          <TextInput
            className="flex-1 bg-neutral-800 rounded-full px-4 py-2 text-white mr-2"
            placeholder={t('plans.addComment')}
            placeholderTextColor="#737373"
            value={body}
            onChangeText={setBody}
            multiline
          />
          <TouchableOpacity
            onPress={send}
            disabled={!body.trim() || sending}
            className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center"
            style={{ opacity: !body.trim() || sending ? 0.5 : 1 }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
