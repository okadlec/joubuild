import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DocumentsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#171717' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('documents.title') }} />
      <Stack.Screen name="viewer" options={{ headerShown: false }} />
    </Stack>
  );
}
