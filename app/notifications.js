/**
 * Talisay AI — Notifications Screen
 * Shows the current user's in-app notifications with read/delete actions.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Spacing, BorderRadius, Shadows, Typography } from '../constants/Layout';

// ─── Helpers ───
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_META = {
  new_post:    { icon: '📢', color: '#3b82f6', label: 'New Post' },
  new_comment: { icon: '💬', color: '#8b5cf6', label: 'Comment' },
  new_like:    { icon: '❤️',  color: '#ef4444', label: 'Like' },
  system:      { icon: '🔔', color: '#f59e0b', label: 'System' },
};

// ─── Actor Avatar ───
const AVATAR_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
function avatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ActorAvatar({ actor, size = 42 }) {
  if (!actor) {
    return (
      <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#6b7280' }]}>
        <Ionicons name="notifications" size={size * 0.45} color="#fff" />
      </View>
    );
  }
  const name = `${actor.firstName || ''} ${actor.lastName || ''}`.trim();
  const color = avatarColor(name);
  const initials = ((actor.firstName || '')[0] || '') + ((actor.lastName || '')[0] || '');
  if (actor.avatar) {
    return <Image source={{ uri: actor.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '700' }}>
        {initials.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

// ─── Single Notification Row ───
function NotifRow({ notif, onRead, onDelete, onPress, colors, isDark, index }) {
  const meta = TYPE_META[notif.type] || TYPE_META.system;
  const isUnread = !notif.read;

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).duration(280)}>
      <Pressable
        onPress={() => onPress(notif)}
        style={[
          styles.notifRow,
          {
            backgroundColor: isUnread
              ? (isDark ? '#1e2f22' : '#f0fdf4')
              : (isDark ? '#161f1a' : '#ffffff'),
            borderColor: isUnread
              ? (isDark ? '#2d6a4f55' : '#bbf7d0')
              : (isDark ? '#1e2a20' : '#e5e7eb'),
          },
        ]}
      >
        {/* Unread indicator strip */}
        {isUnread && (
          <View style={[styles.unreadStrip, { backgroundColor: meta.color }]} />
        )}

        {/* Actor avatar */}
        <View style={styles.notifAvatarWrap}>
          <ActorAvatar actor={notif.actor} size={44} />
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: meta.color + 'ee' }]}>
            <Text style={{ fontSize: 9 }}>{meta.icon}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              { color: colors.text, fontWeight: isUnread ? '700' : '500' },
            ]}
            numberOfLines={1}
          >
            {notif.title}
          </Text>
          <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {notif.body}
          </Text>
          <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
            {timeAgo(notif.createdAt)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.notifActions}>
          {isUnread && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onRead(notif._id); }}
              hitSlop={6}
              style={[styles.actionDot, { backgroundColor: meta.color }]}
              accessibilityLabel="Mark as read"
            />
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onDelete(notif._id); }}
            hitSlop={8}
            style={styles.deleteBtn}
            accessibilityLabel="Delete notification"
          >
            <Ionicons name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAllRead,
    markOneRead,
    removeNotification,
  } = useNotifications();

  // Refresh on mount
  useEffect(() => {
    refresh();
  }, []);

  const handlePress = useCallback((notif) => {
    // Mark as read
    if (!notif.read) markOneRead(notif._id);
    // Navigate to the related post if data present
    if (notif.data?.postId) {
      router.push('/forum');
    }
  }, [markOneRead, router]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view notifications</Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/index')}
        >
          <Text style={styles.loginBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Page Header ─── */}
      <LinearGradient
        colors={isDark ? ['#1a2b1f', '#0d1a10'] : ['#f0fdf4', '#ffffff']}
        style={styles.pageHeader}
      >
        <View style={styles.pageHeaderInner}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Notifications</Text>
            <Text style={[styles.pageSub, { color: colors.textTertiary }]}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              style={[styles.markAllBtn, { borderColor: colors.primary + '66' }]}
            >
              <Ionicons name="checkmark-done" size={15} color={colors.primary} />
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ─── List ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={[styles.centered, { paddingTop: 80 }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              You'll see forum activity, likes, and comments here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n, i) => (
              <NotifRow
                key={n._id}
                notif={n}
                index={i}
                colors={colors}
                isDark={isDark}
                onRead={markOneRead}
                onDelete={removeNotification}
                onPress={handlePress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  pageHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 13,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 6,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
    ...Shadows.sm,
  },
  unreadStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },

  notifAvatarWrap: {
    position: 'relative',
    marginLeft: 4,
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 2,
  },

  notifActions: {
    alignItems: 'center',
    gap: 8,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  loginBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
