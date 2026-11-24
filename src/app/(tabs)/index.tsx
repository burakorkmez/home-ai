import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Image as RNImage, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { listDesigns, SAMPLE_LIVING } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { ROOM_TYPES, STYLES, type RoomTypeId, type StyleId } from '@/lib/catalog';
import { C } from '@/lib/theme';

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2.5 px-5">
        <Text className="h-6 w-6 overflow-hidden rounded-full bg-elevated text-center text-xs font-bold leading-6 text-accent">
          {step}
        </Text>
        <Text className="text-lg font-semibold text-cream">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function Create() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const [photo, setPhoto] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<RoomTypeId | null>(null);
  const [style, setStyle] = useState<StyleId | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      listDesigns().then((r) => setRemaining(r.remaining));
    }, []),
  );

  async function pick(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return Alert.alert('Camera access needed', 'Allow camera access in Settings to take a photo.');
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled) setPhoto(res.assets[0].uri);
    } catch {
      Alert.alert('Camera unavailable', 'Try choosing a photo from your library instead.');
    }
  }

  const outOfQuota = remaining === 0;
  const ready = !!photo && !!roomType && !!style && !outOfQuota;

  function generate() {
    if (!ready) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/generating', params: { photo, roomType, style } });
  }

  const firstName = session?.user.name.split(' ')[0];

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8, paddingBottom: 32, gap: 28 }}>
      <View className="flex-row items-end justify-between px-5">
        <View>
          <Text className="text-sm text-muted">Hi {firstName} 👋</Text>
          <Text className="mt-1 text-3xl font-semibold tracking-tight text-cream">Redesign a room</Text>
        </View>
        {remaining !== null && (
          <View className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
            <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={14} color={C.accent} />
            <Text className="text-xs font-semibold text-cream">{remaining} left today</Text>
          </View>
        )}
      </View>

      <Section step={1} title="Your photo">
        <View className="px-5">
          {photo ? (
            <View className="aspect-[4/3] overflow-hidden rounded-3xl bg-surface">
              <Image source={photo} style={{ flex: 1 }} contentFit="cover" transition={200} />
              <View className="absolute right-3 top-3 flex-row gap-2">
                <Pressable
                  onPress={() => pick('library')}
                  className="flex-row items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-2 active:opacity-70">
                  <Icon name={{ ios: 'arrow.triangle.2.circlepath', android: 'refresh' }} size={14} />
                  <Text className="text-xs font-semibold text-cream">Change</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPhoto(null)}
                  accessibilityLabel="Remove photo"
                  className="h-9 w-9 items-center justify-center rounded-full bg-black/60 active:opacity-70">
                  <Icon name={{ ios: 'xmark', android: 'close' }} size={14} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="items-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-6 py-8">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                <Icon name={{ ios: 'camera.fill', android: 'photo_camera' }} size={24} color={C.accent} />
              </View>
              <View className="items-center gap-1">
                <Text className="text-base font-semibold text-cream">Add a photo of your room</Text>
                <Text className="text-center text-sm text-muted">Shoot from a corner in good light for the best result.</Text>
              </View>
              <View className="flex-row gap-2.5 self-stretch">
                <Pressable
                  onPress={() => pick('camera')}
                  className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-accent active:opacity-80">
                  <Icon name={{ ios: 'camera', android: 'photo_camera' }} size={16} color={C.accentInk} />
                  <Text className="font-semibold text-accent-ink">Take photo</Text>
                </Pressable>
                <Pressable
                  onPress={() => pick('library')}
                  className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-line bg-elevated active:opacity-80">
                  <Icon name={{ ios: 'photo.on.rectangle', android: 'photo_library' }} size={16} />
                  <Text className="font-semibold text-cream">Library</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  setPhoto(RNImage.resolveAssetSource(SAMPLE_LIVING)?.uri ?? null);
                  setRoomType('living-room');
                }}
                className="py-1">
                <Text className="text-sm font-medium text-accent">No photo handy? Try a sample room</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Section>

      <Section step={2} title="Room type">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {ROOM_TYPES.map((r) => {
            const on = r.id === roomType;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRoomType(r.id)}
                accessibilityState={{ selected: on }}
                className={`h-11 flex-row items-center gap-2 rounded-full border px-4 active:opacity-80 ${on ? 'border-accent bg-accent' : 'border-line bg-surface'}`}>
                <Icon name={r.icon} size={16} color={on ? C.accentInk : C.muted} />
                <Text className={`text-sm font-semibold ${on ? 'text-accent-ink' : 'text-cream'}`}>{r.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section step={3} title="Style">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {STYLES.map((s) => {
            const on = s.id === style;
            return (
              <Pressable
                key={s.id}
                onPress={() => setStyle(s.id)}
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.name} style`}
                className={`h-48 w-36 overflow-hidden rounded-3xl border-2 active:opacity-90 ${on ? 'border-accent' : 'border-transparent'}`}>
                <Image source={s.image} style={{ flex: 1 }} contentFit="cover" />
                <View
                  className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10"
                  style={{ backgroundImage: 'linear-gradient(to bottom, transparent, rgba(10,8,6,0.85))' }}>
                  <Text className="text-sm font-semibold text-cream">{s.name}</Text>
                </View>
                {on && (
                  <View className="absolute right-2.5 top-2.5 h-7 w-7 items-center justify-center rounded-full bg-accent">
                    <Icon name={{ ios: 'checkmark', android: 'check' }} size={14} color={C.accentInk} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <View className="gap-3 px-5">
        <Button title={outOfQuota ? 'Daily limit reached' : 'Generate design'} arrow={!outOfQuota} disabled={!ready} onPress={generate} />
        <Text className="text-center text-xs text-faint">
          {outOfQuota
            ? 'You get 5 new designs every day at 00:00 UTC.'
            : !photo
              ? 'Add a photo to get started.'
              : !roomType || !style
                ? 'Pick a room type and a style.'
                : 'Takes about a minute. Uses 1 of your daily designs.'}
        </Text>
      </View>
    </ScrollView>
  );
}
