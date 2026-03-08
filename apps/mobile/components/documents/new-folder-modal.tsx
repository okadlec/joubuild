import { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface NewFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => void;
}

export function NewFolderModal({
  visible,
  onClose,
  onCreateFolder,
}: NewFolderModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setName('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full">
          <Text className="text-white text-lg font-bold mb-4">
            {t('documents.newFolder')}
          </Text>
          <TextInput
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-4"
            placeholder={t('documents.folderName')}
            placeholderTextColor="#737373"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View className="flex-row justify-end gap-3">
            <TouchableOpacity
              className="px-4 py-2 rounded-lg"
              onPress={handleClose}
            >
              <Text className="text-neutral-400">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-lg"
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text className="text-white font-medium">
                {t('documents.createFolder')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
