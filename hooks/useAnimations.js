/**
 * Talisay AI — Animation Helpers
 * Common animated value factories using Reanimated.
 */
import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AnimationConfig } from '../constants/Layout';

/**
 * Fade-in animation on mount.
 */
export function useFadeIn(delay = 0, duration = AnimationConfig.normal) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return animatedStyle;
}

/**
 * Slide-up + fade-in animation on mount.
 */
export function useSlideUp(delay = 0, distance = 30, duration = AnimationConfig.slow) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, AnimationConfig.spring)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

/**
 * Scale-in animation on mount.
 */
export function useScaleIn(delay = 0) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, AnimationConfig.springBouncy)
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: AnimationConfig.normal })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Stagger children animations.
 * Returns a function that gives delay for index.
 */
export function useStagger(baseDelay = 0, interval = 80) {
  return (index) => baseDelay + index * interval;
}

/**
 * Press animation for interactive elements.
 */
export function usePressAnimation() {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

export default {
  useFadeIn,
  useSlideUp,
  useScaleIn,
  useStagger,
  usePressAnimation,
};
