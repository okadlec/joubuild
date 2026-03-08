import { useState } from 'react';
import { View, Text } from 'react-native';
import PdfRendererView from 'react-native-pdf-renderer';
import { useTranslation } from 'react-i18next';

interface PdfViewerProps {
  uri: string;
  onPageChange?: (page: number, totalPages: number) => void;
}

export function PdfViewer({ uri, onPageChange }: PdfViewerProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  return (
    <View className="flex-1">
      <PdfRendererView
        style={{ flex: 1 }}
        source={uri.startsWith('file://') ? uri : `file://${uri}`}
        distanceBetweenPages={16}
        maxZoom={5}
        onPageChange={(page, total) => {
          setCurrentPage(page);
          setTotalPages(total);
          onPageChange?.(page, total);
        }}
      />
      <View className="absolute bottom-4 left-0 right-0 items-center">
        <View className="bg-black/70 rounded-full px-4 py-2">
          <Text className="text-white text-sm">
            {t('plans.page', { current: currentPage, total: totalPages })}
          </Text>
        </View>
      </View>
    </View>
  );
}
