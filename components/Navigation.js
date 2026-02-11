/**
 * Talisay Oil — Navigation Bar
 * Dark nav bar below header. Items are CENTERED.
 * Desktop: centered horizontal tabs. Mobile: hamburger drawer.
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, Typography, Layout, BorderRadius } from '../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NAV_HEIGHT = 48;

const NAV_ITEMS = [
  { key: '/', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: '/grade', label: 'Grade', icon: 'school-outline', iconActive: 'school' },
  { key: '/history', label: 'History', icon: 'time-outline', iconActive: 'time' },
  { key: '/admin', label: 'Admin', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { key: '/about-us', label: 'About Us', icon: 'people-outline', iconActive: 'people' },
  { key: '/about-talisay', label: 'About Talisay', icon: 'leaf-outline', iconActive: 'leaf' },
  { key: '/publication', label: 'Publication', icon: 'document-text-outline', iconActive: 'document-text' },
];

function NavItem({ item, isActive, onPress, colors, isMobile }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isMobile) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animStyle, styles.mobileNavItem, isActive && { backgroundColor: colors.primary + '12' }]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Ionicons
          name={isActive ? item.iconActive : item.icon}
          size={22}
          color={isActive ? colors.navTextActive : colors.navText}
        />
        <Text
          style={[
            styles.mobileNavLabel,
            {
              color: isActive ? colors.navTextActive : colors.navText,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {item.label}
        </Text>
        {isActive && (
          <View style={[styles.activeIndicatorMobile, { backgroundColor: colors.navIndicator }]} />
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animStyle,
        styles.navItem,
        isActive && styles.navItemActive,
        Platform.OS === 'web' && { cursor: 'pointer' },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[
          styles.navLabel,
          {
            color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)',
            fontWeight: isActive ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {isActive && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <View style={styles.activeIndicator} />
        </View>
      )}
    </AnimatedPressable>
  );
}

export default function Navigation() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Filter nav items based on user role — hide Admin for non-admin users
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      // Only show Admin menu if user is logged in AND has admin role
      if (item.key === '/admin') {
        return user?.role === 'admin';
      }
      return true;
    });
  }, [user?.role]);

  const handleNav = useCallback((key) => {
    router.push(key);
    setMenuOpen(false);
  }, [router]);

  const isActive = useCallback((key) => {
    if (key === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(key);
  }, [pathname]);

  // Mobile hamburger menu
  if (isMobile) {
    return (
      <View style={[styles.mobileNavBar, {
        backgroundColor: isDark ? '#1a1a1a' : '#333333',
      }]}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.hamburger}
          accessibilityLabel="Open menu"
          hitSlop={8}
        >
          <Ionicons name="menu" size={24} color="#ffffff" />
        </Pressable>

        {/* Current page label */}
        <Text style={styles.currentPage}>
          {visibleNavItems.find(it => isActive(it.key))?.label || 'Home'}
        </Text>

        <View style={{ width: 40 }} />

        {/* Mobile slide-out menu */}
        <Modal
          visible={menuOpen}
          animationType="none"
          transparent
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setMenuOpen(false)}
          >
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.overlayBg}
            />
          </Pressable>

          <Animated.View
            entering={SlideInRight.duration(200).damping(20)}
            exiting={SlideOutRight.duration(180)}
            style={[styles.drawer, {
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
            }]}
          >
            <View style={[styles.drawerHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Menu</Text>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
              {visibleNavItems.map((item, idx) => (
                <Animated.View
                  key={item.key}
                  entering={FadeInDown.delay(idx * 30).duration(200)}
                >
                  <NavItem
                    item={item}
                    isActive={isActive(item.key)}
                    onPress={() => handleNav(item.key)}
                    colors={colors}
                    isMobile={true}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        </Modal>
      </View>
    );
  }

  // Desktop / Tablet — dark bar with centered nav items
  return (
    <View style={[styles.navBar, {
      backgroundColor: isDark ? '#1a1a1a' : '#333333',
    }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navContent}
      >
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={isActive(item.key)}
            onPress={() => handleNav(item.key)}
            colors={colors}
            isMobile={false}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Desktop nav — dark centered bar */
  navBar: {
    height: NAV_HEIGHT,
    zIndex: 100,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 0,
    height: '100%',
    paddingHorizontal: Spacing.md,
  },
  navItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        transition: 'background-color 0.2s ease',
      },
    }),
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  navLabel: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  activeIndicator: {
    width: '60%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#52b788',
  },

  /* Mobile nav */
  mobileNavBar: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    zIndex: 100,
  },
  hamburger: {
    padding: Spacing.xs,
    width: 40,
    alignItems: 'center',
  },
  currentPage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },

  /* Drawer */
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    borderLeftWidth: 1,
    ...Shadows.xl,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    paddingTop: Spacing.xxl,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  drawerScroll: {
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
    position: 'relative',
  },
  mobileNavLabel: {
    fontSize: 15,
    flex: 1,
  },
  activeIndicatorMobile: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
});
