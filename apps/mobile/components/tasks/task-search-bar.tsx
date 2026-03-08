import { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TaskSearchBarProps {
  onSearch: (query: string) => void;
}

export function TaskSearchBar({ onSearch }: TaskSearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(query.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  return (
    <View className="px-4 pb-2">
      <View className="flex-row items-center bg-neutral-800 rounded-lg px-3 py-2">
        <Ionicons name="search" size={18} color="#737373" />
        <TextInput
          className="flex-1 text-white ml-2 text-sm"
          placeholder={t('tasks.searchPlaceholder')}
          placeholderTextColor="#737373"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Ionicons
            name="close-circle"
            size={18}
            color="#737373"
            onPress={() => setQuery('')}
          />
        )}
      </View>
    </View>
  );
}
