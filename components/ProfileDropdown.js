/**
 * Talisay Oil — Profile Dropdown
 * Circular avatar/icon that opens a dropdown with Login/Profile/Logout.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  Image,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius } from '../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileDropdown() {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated, logout, profileImage } = useAuth();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => setIsOpen(!isOpen);

  const handleLogin = () => {
    setIsOpen(false);
    router.push('/account');
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push('/account');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const avatarSize = isMobile ? 34 : 38;

  return (
    <View style={styles.container}>
      {/* Avatar Button */}
      <AnimatedPressable
        onPress={handleToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animStyle,
          styles.avatarButton,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: isAuthenticated ? '#52b788' : (isDark ? 'rgba(255,255,255,0.3)' : '#d1d5db'),
            backgroundColor: isAuthenticated
              ? (isDark ? '#1a3d2e' : '#d1fae5')
              : (isDark ? '#333' : '#f3f4f6'),
          },
        ]}
        accessibilityLabel={isAuthenticated ? 'Profile menu' : 'Login'}
        accessibilityRole="button"
      >
        {isAuthenticated && profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={[styles.avatarImage, { width: avatarSize - 4, height: avatarSize - 4, borderRadius: (avatarSize - 4) / 2 }]}
          />
        ) : (
          <Ionicons
            name={isAuthenticated ? 'person' : 'person-outline'}
            size={isMobile ? 18 : 20}
            color={isAuthenticated ? '#52b788' : (isDark ? '#a3c4a8' : '#6b7280')}
          />
        )}
      </AnimatedPressable>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <Animated.View
            entering={FadeInDown.duration(200).duration(280)}
            exiting={FadeOutUp.duration(150)}
            style={[
              styles.dropdown,
              {
                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                borderColor: isDark ? '#333' : '#e5e7eb',
                ...Platform.select({
                  web: {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                  },
                }),
              },
            ]}
          >
            {/* Triangle pointer */}
            <View style={[styles.triangle, {
              borderBottomColor: isDark ? '#1e1e1e' : '#ffffff',
            }]} />

            {isAuthenticated ? (
              <>
                {/* User Info */}
                <View style={[styles.userInfo, { borderBottomColor: isDark ? '#333' : '#f3f4f6' }]}>
                  <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2d4a3e' : '#d1fae5' }]}>
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.userAvatarImage}
                      />
                    ) : (
                      <Ionicons name="person" size={16} color="#52b788" />
                    )}
                  </View>
                  <View style={styles.userText}>
                    <Text style={[styles.userName, { color: isDark ? '#fff' : '#111' }]} numberOfLines={1}>
                      {user?.name || user?.firstName || user?.email?.split('@')[0] || 'User'}
                    </Text>
                    <Text style={[styles.userEmail, { color: isDark ? '#999' : '#6b7280' }]} numberOfLines={1}>
                      {user?.email || ''}
                    </Text>
                  </View>
                </View>

                {/* Profile */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={handleProfile}
                >
                  <Ionicons name="person-outline" size={18} color={isDark ? '#ccc' : '#374151'} />
                  <Text style={[styles.menuText, { color: isDark ? '#ccc' : '#374151' }]}>Profile</Text>
                </Pressable>

                {/* History */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={() => { setIsOpen(false); router.push('/history'); }}
                >
                  <Ionicons name="time-outline" size={18} color={isDark ? '#ccc' : '#374151'} />
                  <Text style={[styles.menuText, { color: isDark ? '#ccc' : '#374151' }]}>History</Text>
                </Pressable>

                {/* About Us */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={() => { setIsOpen(false); router.push('/about-us'); }}
                >
                  <Ionicons name="people-outline" size={18} color={isDark ? '#ccc' : '#374151'} />
                  <Text style={[styles.menuText, { color: isDark ? '#ccc' : '#374151' }]}>About Us</Text>
                </Pressable>

                {/* Admin — only for admin role */}
                {user?.role === 'admin' && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                    ]}
                    onPress={() => { setIsOpen(false); router.push('/admin'); }}
                  >
                    <Ionicons name="bar-chart-outline" size={18} color="#f97316" />
                    <Text style={[styles.menuText, { color: '#f97316' }]}>Admin</Text>
                  </Pressable>
                )}

                {/* Divider */}
                <View style={[styles.separator, { backgroundColor: isDark ? '#333' : '#f3f4f6' }]} />

                {/* Logout */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    styles.menuItemLast,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Log Out</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Not logged in header */}
                <View style={[styles.guestHeader, { borderBottomColor: isDark ? '#333' : '#f3f4f6' }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={isDark ? '#999' : '#9ca3af'} />
                  <Text style={[styles.guestText, { color: isDark ? '#999' : '#6b7280' }]}>
                    Not signed in
                  </Text>
                </View>

                {/* About Us — always visible */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={() => { setIsOpen(false); router.push('/about-us'); }}
                >
                  <Ionicons name="people-outline" size={18} color={isDark ? '#ccc' : '#374151'} />
                  <Text style={[styles.menuText, { color: isDark ? '#ccc' : '#374151' }]}>About Us</Text>
                </Pressable>

                {/* Login */}
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    styles.menuItemLast,
                    pressed && { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' },
                  ]}
                  onPress={handleLogin}
                >
                  <Ionicons name="log-in-outline" size={18} color="#52b788" />
                  <Text style={[styles.menuText, { color: '#52b788', fontWeight: '600' }]}>Sign In</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1100,
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.15s ease, border-color 0.2s ease',
      },
    }),
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  backdrop: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1099,
      },
      default: {
        position: 'absolute',
        top: -100,
        left: -200,
        width: 500,
        height: 500,
        zIndex: 1099,
      },
    }),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 10,
    width: 240,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1100,
  },
  triangle: {
    position: 'absolute',
    top: -8,
    right: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  guestText: {
    fontSize: 13,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  separator: {
    height: 1,
    marginVertical: 2,
  },
  menuText: {
    fontSize: 14,
  },
});
