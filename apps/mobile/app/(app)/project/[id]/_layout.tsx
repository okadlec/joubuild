import { Stack } from 'expo-router';

export default function ProjectLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#171717' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="plans" options={{ headerShown: false }} />
      <Stack.Screen name="documents" options={{ headerShown: false }} />
      <Stack.Screen name="tasks" options={{ headerShown: false }} />
      <Stack.Screen name="photos" options={{ headerShown: false }} />
      <Stack.Screen name="forms" options={{ headerShown: false }} />
      <Stack.Screen name="specifications" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: true }} />
      <Stack.Screen name="members" options={{ headerShown: true }} />
    </Stack>
  );
}
