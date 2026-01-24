import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const MotionTokens = {
  // Calm, consistent motion
  enterDurationMs: 240,
  exitDurationMs: 160, // lighter/faster (used for back)
  enterOffsetY: 8,
  exitOffsetY: 6,
  easingIn: Easing.out(Easing.cubic),
  easingOut: Easing.in(Easing.cubic),
};

export function useFadeUpMotion(deps: readonly unknown[] = []) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(MotionTokens.enterOffsetY)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(MotionTokens.enterOffsetY);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MotionTokens.enterDurationMs,
        easing: MotionTokens.easingIn,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: MotionTokens.enterDurationMs,
        easing: MotionTokens.easingIn,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const animatedStyle = useMemo(
    () => ({
      opacity,
      transform: [{ translateY }],
    }),
    [opacity, translateY],
  );

  return { opacity, translateY, animatedStyle };
}

export function runFadeDownExit(options: {
  opacity: Animated.Value;
  translateY: Animated.Value;
  onDone: () => void;
  durationMs?: number;
}) {
  const durationMs = options.durationMs ?? MotionTokens.exitDurationMs;

  Animated.parallel([
    Animated.timing(options.opacity, {
      toValue: 0,
      duration: durationMs,
      easing: MotionTokens.easingOut,
      useNativeDriver: true,
    }),
    Animated.timing(options.translateY, {
      toValue: MotionTokens.exitOffsetY,
      duration: durationMs,
      easing: MotionTokens.easingOut,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) options.onDone();
  });
}

