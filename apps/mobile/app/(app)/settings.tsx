import { View, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { mode, setMode } = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerBackTitle: t('common.back'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
          headerShown: true,
        }}
      />
      <View className="flex-1 bg-neutral-950 px-6 pt-8">
        <Text className="text-neutral-400 text-xs uppercase mb-3 ml-1">
          {t('settings.language')}
        </Text>

        <TouchableOpacity
          className="bg-neutral-900 border border-neutral-800 rounded-t-xl p-4 flex-row items-center justify-between"
          onPress={() => setLanguage('cs')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base">{t('settings.czech')}</Text>
          {language === 'cs' && (
            <Ionicons name="checkmark" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-neutral-900 border border-neutral-800 border-t-0 rounded-b-xl p-4 flex-row items-center justify-between"
          onPress={() => setLanguage('en')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base">{t('settings.english')}</Text>
          {language === 'en' && (
            <Ionicons name="checkmark" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>

        <Text className="text-neutral-400 text-xs uppercase mb-3 ml-1 mt-8">
          {t('settings.theme')}
        </Text>

        <TouchableOpacity
          className="bg-neutral-900 border border-neutral-800 rounded-t-xl p-4 flex-row items-center justify-between"
          onPress={() => setMode('system')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base">{t('settings.themeSystem')}</Text>
          {mode === 'system' && (
            <Ionicons name="checkmark" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-neutral-900 border border-neutral-800 border-t-0 p-4 flex-row items-center justify-between"
          onPress={() => setMode('dark')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base">{t('settings.themeDark')}</Text>
          {mode === 'dark' && (
            <Ionicons name="checkmark" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-neutral-900 border border-neutral-800 border-t-0 rounded-b-xl p-4 flex-row items-center justify-between"
          onPress={() => setMode('light')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base">{t('settings.themeLight')}</Text>
          {mode === 'light' && (
            <Ionicons name="checkmark" size={22} color="#3B82F6" />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}
