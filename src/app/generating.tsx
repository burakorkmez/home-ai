import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ApiError, generateDesign, uploadPhoto } from '@/lib/api';
import { isRoomType, isStyle, roomName, styleName } from '@/lib/catalog';
import { C } from '@/lib/theme';

const TIPS = [
  'Your walls, windows and layout stay exactly where they are.',
  'Daylight photos give the most realistic results.',
  'Photos taken from a corner show the most of the room.',
  'Try the same photo in a few styles to compare.',
  'Every design is saved to My Designs automatically.',
];

type Phase = 'uploading' | 'designing' | 'error';

export default function Generating() {
  const { photo, roomType, style } = useLocalSearchParams<{ photo: string; roomType: string; style: string }>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('uploading');
  const [error, setError] = useState('');
  const [tip, setTip] = useState(0);
  const uploadedPath = useRef<string | null>(null);
  const alive = useRef(true);

  async function run() {
    if (!photo || !isRoomType(roomType) || !isStyle(style)) {
      setError('Something went wrong with this request. Go back and try again.');
      return setPhase('error');
    }
    setError('');
    try {
      if (!uploadedPath.current) {
        setPhase('uploading');
        uploadedPath.current = (await uploadPhoto(photo)).path;
      }
      if (!alive.current) return;
      setPhase('designing');
      const design = await generateDesign({ originalPath: uploadedPath.current, roomType, style });
      if (!alive.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/design/[id]', params: { id: design.id } });
    } catch (e) {
      if (!alive.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : 'Check your connection and try again.');
      setPhase('error');
    }
  }

  const started = useRef(false);
  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      run();
    }
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const scan = useSharedValue(0);
  useEffect(() => {
    scan.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [scan]);
  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scan.get() * height * 0.62 - 80 }] }));

  const failed = phase === 'error';
  const title = isStyle(style) && isRoomType(roomType) ? `${styleName(style)} ${roomName(roomType).toLowerCase()}` : 'your room';

  return (
    <View className="flex-1 bg-bg">
      <View style={{ height: '62%' }} className="overflow-hidden">
        {!!photo && <Image source={photo} style={{ flex: 1, opacity: failed ? 0.35 : 0.75 }} contentFit="cover" blurRadius={failed ? 0 : 2} />}
        {!failed && (
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
              { backgroundImage: `linear-gradient(to bottom, transparent, ${C.accent}66)`, borderBottomWidth: 2, borderColor: C.accent },
              scanStyle,
            ]}
          />
        )}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', backgroundImage: `linear-gradient(to bottom, transparent, ${C.bg})` }}
        />
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Cancel"
          className="absolute left-5 h-11 w-11 items-center justify-center rounded-full bg-black/50 active:opacity-70"
          style={{ top: insets.top + 8 }}>
          <Icon name={{ ios: 'xmark', android: 'close' }} size={16} />
        </Pressable>
      </View>

      <View className="-mt-6 flex-1 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        {failed ? (
          <Animated.View entering={FadeIn} style={{ flex: 1, gap: 12 }}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-danger/15">
              <Icon name={{ ios: 'exclamationmark.triangle.fill', android: 'error' }} size={22} color={C.danger} />
            </View>
            <Text className="text-2xl font-semibold tracking-tight text-cream">That didn’t work</Text>
            <Text className="text-base leading-6 text-muted">{error}</Text>
            <View className="flex-1" />
            <Button title="Try again" arrow onPress={run} />
            <Button variant="secondary" title="Back" onPress={() => router.back()} />
          </Animated.View>
        ) : (
          <View className="flex-1 gap-3">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color={C.accent} size="small" />
              <Text className="text-sm font-medium text-accent">
                {phase === 'uploading' ? 'Uploading your photo…' : 'Redesigning with AI…'}
              </Text>
            </View>
            <Text className="text-3xl font-semibold tracking-tight text-cream">Creating your{'\n'}{title}</Text>
            <Text className="text-sm text-muted">This usually takes under a minute. Keep the app open.</Text>
            <View className="flex-1" />
            <View className="min-h-[88px] flex-row gap-3 rounded-3xl border border-line bg-surface p-4">
              <Icon name={{ ios: 'lightbulb', android: 'lightbulb' }} size={18} color={C.accent} />
              <Animated.View key={tip} entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
                <Text className="text-sm leading-5 text-cream">{TIPS[tip]}</Text>
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
