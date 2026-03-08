import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface Tag {
  id: string;
  name: string;
}

interface TaskTagPickerProps {
  selectedTags: Tag[];
  projectTags: Tag[];
  onAdd: (tag: Tag) => void;
  onRemove: (tagId: string) => void;
  onCreateTag: (name: string) => Promise<Tag | null>;
}

export function TaskTagPicker({
  selectedTags,
  projectTags,
  onAdd,
  onRemove,
  onCreateTag,
}: TaskTagPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedIds = new Set(selectedTags.map((t) => t.id));

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return projectTags
      .filter((tag) => !selectedIds.has(tag.id) && tag.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, projectTags, selectedIds]);

  const exactMatch = projectTags.some(
    (tag) => tag.name.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelect = (tag: Tag) => {
    onAdd(tag);
    setQuery('');
  };

  const handleCreate = async () => {
    if (!query.trim() || creating) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(query.trim());
      if (tag) {
        onAdd(tag);
        setQuery('');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = () => {
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else if (!exactMatch && query.trim()) {
      handleCreate();
    }
  };

  return (
    <View>
      <Text className="text-neutral-400 text-xs uppercase mb-2">
        {t('plans.tags')}
      </Text>

      {selectedTags.length > 0 && (
        <View className="flex-row flex-wrap mb-2">
          {selectedTags.map((tag) => (
            <View
              key={tag.id}
              className="flex-row items-center bg-blue-500/20 rounded-full px-3 py-1 mr-2 mb-2"
            >
              <Text className="text-blue-400 text-sm mr-1">{tag.name}</Text>
              <TouchableOpacity onPress={() => onRemove(tag.id)}>
                <Ionicons name="close-circle" size={16} color="#60A5FA" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TextInput
        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
        placeholder={t('plans.addTag')}
        placeholderTextColor="#737373"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      {(suggestions.length > 0 || (query.trim() && !exactMatch)) && (
        <View className="bg-neutral-800 border border-neutral-700 rounded-lg mt-1 overflow-hidden">
          {suggestions.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              className="px-3 py-2 border-b border-neutral-700"
              onPress={() => handleSelect(tag)}
            >
              <Text className="text-white text-sm">{tag.name}</Text>
            </TouchableOpacity>
          ))}
          {!exactMatch && query.trim() && (
            <TouchableOpacity
              className="px-3 py-2 flex-row items-center"
              onPress={handleCreate}
              disabled={creating}
            >
              <Ionicons name="add" size={16} color="#3B82F6" />
              <Text className="text-blue-400 text-sm ml-1">
                {`"${query.trim()}"`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
