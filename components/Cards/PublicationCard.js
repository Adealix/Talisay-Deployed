/**
 * Talisay AI — Publication Card
 * Card for displaying publications with status badge.
 * Similar to "Current Openings" table in the reference design.
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

const STATUS_COLORS = {
  local: '#22c55e',
  foreign: '#3b82f6',
  recent: '#f97316',
  archived: '#9ca3af',
};

export default function PublicationCard({
  title,
  authors,
  year,
  category = 'local',
  abstract,
  onPress,
  delay = 0,
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const statusColor = STATUS_COLORS[category] || STATUS_COLORS.local;

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(delay).duration(280)}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      style={[
        pressStyle,
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          ...Shadows.sm,
        },
        Platform.OS === 'web' && styles.cardWeb,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.iconBg, { backgroundColor: statusColor + '15' }]}>
            <Ionicons name="document-text" size={18} color={statusColor} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.authors, { color: colors.textSecondary }]} numberOfLines={1}>
            {Array.isArray(authors) ? authors.join(', ') : authors}
          </Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </View>
          <Text style={[styles.year, { color: colors.textTertiary }]}>{year}</Text>
        </View>
      </View>

      {abstract && (
        <Text style={[styles.abstract, { color: colors.textSecondary }]} numberOfLines={2}>
          {abstract}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardWeb: {
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  left: {},
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyMedium,
  },
  authors: {
    ...Typography.small,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...Typography.tiny,
    fontWeight: '600',
  },
  year: {
    ...Typography.small,
  },
  abstract: {
    ...Typography.caption,
    marginTop: Spacing.sm,
    paddingLeft: 38 + Spacing.md,
  },
});
