import { Stack } from 'expo-router';

export default function PlansLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#171717' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="sheet" options={{ headerShown: false }} />
    </Stack>
  );
}
