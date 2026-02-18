/**
 * Talisay AI — Info Card
 * Generic info card with title, description, icon, and optional badge.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Shadows, BorderRadius, Typography } from '../../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function InfoCard({
  title,
  description,
  icon,
  iconColor,
  badge,
  badgeColor,
  onPress,
  delay = 0,
  style,
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(delay).duration(280)}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
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
        style,
      ]}
    >
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
            <Ionicons name={icon} size={20} color={iconColor || colors.primary} />
          </View>
        )}
        {badge && (
          <View style={[styles.badge, { backgroundColor: (badgeColor || colors.primary) + '18' }]}>
            <Text style={[styles.badgeText, { color: badgeColor || colors.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
          {description}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cardWeb: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.tiny,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    ...Typography.h4,
  },
  description: {
    ...Typography.caption,
    lineHeight: 20,
  },
});
