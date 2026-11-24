import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeforeAfter } from '@/components/before-after';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { getDesign, type Design } from '@/lib/api';
import { roomName, styleName } from '@/lib/catalog';
import { relativeDay, timeOf } from '@/lib/format';
import { C } from '@/lib/theme';

export default function DesignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [design, setDesign] = useState<Design | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDesign(id).then(setDesign, (e: Error) => setError(e.message));
  }, [id]);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20, gap: 20 }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/designs'))}
        accessibilityLabel="Back"
        className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-70">
        <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={18} />
      </Pressable>

      {!design ? (
        <View className="flex-1 items-center justify-center gap-3">
          {error ? (
            <>
              <Text className="text-lg font-semibold text-cream">{error}</Text>
              <Text className="text-sm text-muted">It may have been removed.</Text>
            </>
          ) : (
            <ActivityIndicator color={C.accent} />
          )}
        </View>
      ) : (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-semibold tracking-tight text-cream">{styleName(design.style)}</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1">
                <Icon name={{ ios: 'house', android: 'home' }} size={14} color={C.accent} />
                <Text className="text-xs font-semibold text-cream">{roomName(design.roomType)}</Text>
              </View>
              <Text className="text-xs text-muted">
                {relativeDay(design.createdAt)}, {timeOf(design.createdAt)}
              </Text>
            </View>
          </View>

          <View className="aspect-[3/4]">
            <BeforeAfter before={design.originalUrl} after={design.resultUrl} />
          </View>
          <View className="flex-row items-center justify-center gap-1.5">
            <Icon name={{ ios: 'hand.draw', android: 'swipe' }} size={14} color={C.faint} />
            <Text className="text-xs text-faint">Drag the handle to compare</Text>
          </View>

          <View className="flex-1" />
          <Button title="Try another style" arrow onPress={() => router.navigate('/')} />
        </>
      )}
    </ScrollView>
  );
}
