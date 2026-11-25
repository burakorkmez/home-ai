import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { listDesigns, type DesignSummary } from '@/lib/api';
import { roomName, styleName } from '@/lib/catalog';
import { relativeDay } from '@/lib/format';
import { C } from '@/lib/theme';

export default function Designs() {
  const insets = useSafeAreaInsets();
  const cardWidth = (useWindowDimensions().width - 20 * 2 - 12) / 2;
  const [designs, setDesigns] = useState<DesignSummary[] | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      setError('');
      listDesigns().then(
        (r) => setDesigns(r.designs),
        (e: Error) => setError(e.message),
      );
    }, []),
  );

  return (
    <FlatList
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      data={designs ?? []}
      keyExtractor={(d) => d.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8, paddingBottom: 32, paddingHorizontal: 20, gap: 12 }}
      ListHeaderComponent={
        <View className="mb-2">
          <Text className="text-3xl font-semibold tracking-tight text-cream">My Designs</Text>
          {!!designs?.length && (
            <Text className="mt-1 text-sm text-muted">
              {designs.length} {designs.length === 1 ? 'design' : 'designs'}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        designs === null ? (
          <View className="flex-1 items-center justify-center px-6">
            {error ? <Text className="text-center text-sm text-muted">{error}</Text> : <ActivityIndicator color={C.accent} />}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
              <Icon name={{ ios: 'photo.stack', android: 'image' }} size={26} color={C.accent} />
            </View>
            <View className="items-center gap-1.5">
              <Text className="text-lg font-semibold text-cream">No designs yet</Text>
              <Text className="text-center text-sm leading-5 text-muted">
                Redesign your first room and it will show up here.
              </Text>
            </View>
            <View className="mt-2 w-60">
              <Button title="Create a design" arrow onPress={() => router.navigate('/')} />
            </View>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/design/[id]', params: { id: item.id } })}
          accessibilityLabel={`${styleName(item.style)} ${roomName(item.roomType)}`}
          style={{ width: cardWidth }}
          className="aspect-[3/4] overflow-hidden rounded-3xl bg-surface active:opacity-85">
          <Image source={{ uri: item.thumbUrl, cacheKey: `${item.id}-thumb` }} style={{ flex: 1 }} contentFit="cover" transition={200} recyclingKey={item.id} />
          <View
            className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-12"
            style={{ backgroundImage: 'linear-gradient(to bottom, transparent, rgba(10,8,6,0.88))' }}>
            <Text className="text-sm font-semibold text-cream">{styleName(item.style)}</Text>
            <Text className="mt-0.5 text-xs text-cream/70">
              {roomName(item.roomType)} · {relativeDay(item.createdAt)}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
