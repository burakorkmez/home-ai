import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import type { ImageRef } from '@/lib/api';
import { C } from '@/lib/theme';

type Props = { before: ImageRef; after: ImageRef; autoPlay?: boolean; labels?: boolean; rounded?: boolean };

/** Drag the handle to compare. Left of the line = before, right = after. */
export function BeforeAfter({ before, after, autoPlay, labels = true, rounded = true }: Props) {
  const width = useSharedValue(0);
  const pos = useSharedValue(0.5);

  useEffect(() => {
    if (!autoPlay) return;
    // Two sweeps to hint "drag me", then rest in the middle for the user.
    const t = (to: number, duration = 1400) => withTiming(to, { duration, easing: Easing.inOut(Easing.cubic) });
    pos.set(withDelay(500, withSequence(t(0.2), t(0.8), t(0.2), t(0.8), t(0.5, 900))));
  }, [autoPlay, pos]);

  const pan = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-14, 14],
    onBegin: () => {
      cancelAnimation(pos);
    },
    onUpdate: (e) => {
      pos.set(Math.min(1, Math.max(0, e.x / width.get())));
    },
  });

  // Keyboard / screen-reader adjustment: same clamped position as dragging.
  const step = (delta: number) => {
    cancelAnimation(pos);
    pos.set(Math.min(1, Math.max(0, pos.get() + delta)));
  };

  const clip = useAnimatedStyle(() => ({ width: pos.get() * width.get() }));
  const beforeImg = useAnimatedStyle(() => ({ width: width.get() }));
  const handle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() * width.get() }] }));

  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
      <View
        className={`flex-1 overflow-hidden bg-surface ${rounded ? 'rounded-3xl' : ''}`}
        onLayout={(e) => width.set(e.nativeEvent.layout.width)}
        accessible
        focusable
        accessibilityRole="adjustable"
        accessibilityLabel="Before and after comparison"
        accessibilityHint="Adjust to reveal more of the before or after photo"
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
        onKeyDown={(e) => {
          const key = e.nativeEvent.key;
          if (key === 'ArrowRight' || key === 'ArrowUp') step(0.1);
          else if (key === 'ArrowLeft' || key === 'ArrowDown') step(-0.1);
        }}>
        <Image source={after} style={{ flex: 1 }} contentFit="cover" transition={250} />

        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' }, clip]}>
          <Animated.View style={[{ flex: 1 }, beforeImg]}>
            <Image source={before} style={{ flex: 1 }} contentFit="cover" />
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, left: -22, width: 44, alignItems: 'center' }, handle]}>
          <View style={{ flex: 1, width: 2, backgroundColor: C.cream }} />
          <View
            className="absolute top-1/2 -mt-[22px] h-11 w-11 items-center justify-center rounded-full bg-cream"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
            <Icon name={{ ios: 'arrow.left.and.right', android: 'swap_horiz' }} size={18} color={C.accentInk} />
          </View>
        </Animated.View>

        {labels && (
          <>
            <Text className="absolute left-3 top-3 overflow-hidden rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-cream">
              Before
            </Text>
            <Text className="absolute right-3 top-3 overflow-hidden rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">
              After
            </Text>
          </>
        )}
      </View>
    </GestureDetector>
  );
}
