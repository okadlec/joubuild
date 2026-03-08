import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useOrg } from '@/providers/org-provider';

export function OrgSwitcher() {
  const { t } = useTranslation();
  const { organizations, currentOrg, setCurrentOrgId } = useOrg();
  const [visible, setVisible] = useState(false);

  if (organizations.length === 0) {
    return (
      <Text className="text-white font-semibold text-base">
        {t('org.noOrganizations')}
      </Text>
    );
  }

  const select = async (id: string) => {
    await setCurrentOrgId(id);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center"
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text className="text-white font-semibold text-base mr-1" numberOfLines={1}>
          {currentOrg?.name ?? t('org.title')}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#a3a3a3" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View className="mt-24 mx-4 bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <View className="px-4 py-3 border-b border-neutral-800">
              <Text className="text-white font-semibold text-base">
                {t('org.switchOrganization')}
              </Text>
            </View>
            <FlatList
              data={organizations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800/50"
                  onPress={() => select(item.id)}
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-base flex-1 mr-2">
                    {item.name}
                  </Text>
                  {item.id === currentOrg?.id && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
