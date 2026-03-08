import { View, Text, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePlanSets } from '@/hooks/use-plan-sets';
import { SheetThumbnail } from '@/components/plans/sheet-thumbnail';
import { Ionicons } from '@expo/vector-icons';

export default function PlansListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { planSets, loading, refreshing, onRefresh } = usePlanSets(id!);

  const sections = planSets.map((ps) => ({
    title: ps.name,
    data: chunkPairs(ps.sheets ?? []),
  }));

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('plans.title'),
          headerStyle: { backgroundColor: '#171717' },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-neutral-950">
        {sections.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="map-outline" size={64} color="#525252" />
            <Text className="text-neutral-500 mt-4 text-lg">
              {t('plans.noPlans')}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => index.toString()}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ padding: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
            renderSectionHeader={({ section: { title } }) => (
              <Text className="text-white text-lg font-bold px-2 pt-4 pb-2">
                {title}
              </Text>
            )}
            renderItem={({ item: pair }) => (
              <View className="flex-row">
                {pair.map((sheet: any) => (
                  <SheetThumbnail
                    key={sheet.id}
                    sheet={sheet}
                    onPress={(sheetId) =>
                      router.push(
                        `/(app)/project/${id}/plans/sheet/${sheetId}` as any
                      )
                    }
                  />
                ))}
                {pair.length === 1 && <View className="flex-1 m-1" />}
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

function chunkPairs<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push(arr.slice(i, i + 2));
  }
  return result;
}
