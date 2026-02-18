/**
 * Talisay AI — Stats Card
 * Animated card displaying a statistic with icon.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Shadows, BorderRadius, Typography } from '../../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function StatsCard({ icon, label, value, color, delay = 0, onPress }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(delay).duration(280)}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      style={[
        pressStyle,
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          ...Shadows.md,
        },
        Platform.OS === 'web' && styles.cardWeb,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '15' }]}>
        <Ionicons name={icon || 'stats-chart'} size={22} color={color || colors.primary} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cardWeb: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  value: {
    ...Typography.h2,
    letterSpacing: -0.5,
  },
  label: {
    ...Typography.caption,
  },
});
