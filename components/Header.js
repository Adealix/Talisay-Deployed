/**
 * Talisay Oil — Unified Header with Inline Navigation
 * Clean, elegant design inspired by modern SaaS headers (Recruit reference).
 * Nav items are inline inside the header bar with animated underline indicator.
 * Logo overlaps down into the content area for a layered effect.
 * Mobile: hamburger slide-out drawer.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  FadeInDown,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import ThemeToggle from './ThemeToggle';
import ProfileDropdown from './ProfileDropdown';
import { Spacing, Shadows, BorderRadius } from '../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Exported constants for layout calculations ───
export const LOGO_SIZE = 110;
export const LOGO_SIZE_MOBILE = 72;
export const HEADER_HEIGHT = 64;
export const HEADER_HEIGHT_MOBILE = 56;
export const LOGO_OVERLAP = 36;
export const LOGO_OVERLAP_MOBILE = 20;

// ─── Navigation Items ───
const NAV_ITEMS = [
  { key: '/', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: '/scan', label: 'Scan', icon: 'scan-outline', iconActive: 'scan' },
  { key: '/history', label: 'History', icon: 'time-outline', iconActive: 'time' },
  { key: '/admin', label: 'Admin', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { key: '/about-us', label: 'About Us', icon: 'people-outline', iconActive: 'people' },
  { key: '/about-talisay', label: 'Talisay', icon: 'leaf-outline', iconActive: 'leaf' },
  { key: '/publication', label: 'Publications', icon: 'document-text-outline', iconActive: 'document-text' },
];

// ─── Individual Desktop Nav Item ───
function DesktopNavItem({ item, isActive, onPress, colors }) {
  const hoverOpacity = useSharedValue(0);

  const hoverStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(45,106,79,${hoverOpacity.value * 0.06})`,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onHoverIn={() => { hoverOpacity.value = withTiming(1, { duration: 150 }); }}
      onHoverOut={() => { hoverOpacity.value = withTiming(0, { duration: 200 }); }}
      style={[hoverStyle, styles.navItem]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={isActive ? item.iconActive : item.icon}
        size={16}
        color={isActive ? colors.primary : colors.textTertiary}
        style={styles.navIcon}
      />
      <Text
        style={[
          styles.navLabel,
          {
            color: isActive ? colors.primary : colors.navText,
            fontWeight: isActive ? '600' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Mobile Drawer Nav Item ───
function MobileNavItem({ item, isActive, onPress, colors, index }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
        style={[
          animStyle,
          styles.mobileNavItem,
          isActive && { backgroundColor: colors.primary + '10' },
        ]}
      >
        <View style={[
          styles.mobileNavIconWrap,
          { backgroundColor: isActive ? colors.primary + '18' : colors.backgroundSecondary },
        ]}>
          <Ionicons
            name={isActive ? item.iconActive : item.icon}
            size={20}
            color={isActive ? colors.primary : colors.textTertiary}
          />
        </View>
        <Text
          style={[
            styles.mobileNavLabel,
            {
              color: isActive ? colors.primary : colors.text,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {item.label}
        </Text>
        {isActive && (
          <View style={[styles.mobileActiveDot, { backgroundColor: colors.primary }]} />
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: 'auto' }}
        />
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Animated Underline Indicator ───
function UnderlineIndicator({ activeIndex, itemPositions, colors }) {
  const left = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const pos = itemPositions[activeIndex];
    if (pos) {
      // Animate to the new position
      left.value = withSpring(pos.x, {
        damping: 20,
        stiffness: 180,
        mass: 0.8,
      });
      indicatorWidth.value = withSpring(pos.width, {
        damping: 20,
        stiffness: 180,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      // Hide indicator if position not available
      opacity.value = withTiming(0, { duration: 100 });
    }
  }, [activeIndex, itemPositions]);

  const animStyle = useAnimatedStyle(() => ({
    left: left.value,
    width: indicatorWidth.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.underline,
        { backgroundColor: colors.primary },
        animStyle,
      ]}
    />
  );
}

// ─── Main Header Component ───
export default function Header() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [itemPositions, setItemPositions] = useState({});

  // Filter nav items based on user role — hide Admin for non-admin users
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      if (item.key === '/admin') return user?.role === 'admin';
      return true;
    });
  }, [user?.role]);

  // When nav items change (login/logout), positions will be naturally
  // updated via onLayout callbacks — no reset needed.

  // Logo animation
  const logoScale = useSharedValue(1);
  const logoRotate = useSharedValue(0);

  const handleLogoPress = () => {
    logoScale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1.04, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    logoRotate.value = withSequence(
      withTiming(-4, { duration: 80 }),
      withTiming(4, { duration: 100 }),
      withSpring(0, { damping: 10 })
    );
    router.push('/');
  };

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const isActive = useCallback((key) => {
    if (key === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(key);
  }, [pathname]);

  const activeIndex = visibleNavItems.findIndex(item => isActive(item.key));

  const handleNav = useCallback((key) => {
    router.push(key);
    setMenuOpen(false);
  }, [router]);

  // Capture nav item positions for the animated underline
  const handleItemLayout = useCallback((index, event) => {
    const { x, width } = event.nativeEvent.layout;
    setItemPositions(prev => {
      if (prev[index]?.x === x && prev[index]?.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  }, []);

  const logoSz = isMobile ? LOGO_SIZE_MOBILE : LOGO_SIZE;
  const headerH = isMobile ? HEADER_HEIGHT_MOBILE : HEADER_HEIGHT;

  return (
    <View style={[styles.wrapper, { zIndex: 1000 }]}>
      {/* ─── Header Bar ─── */}
      <View
        style={[
          styles.headerBar,
          {
            height: headerH,
            backgroundColor: isDark ? '#111a14' : '#ffffff',
            borderBottomColor: isDark ? '#2a3d2e' : '#e5e7eb',
          },
        ]}
      >
        {/* Left: Logo spacer + Brand */}
        <View style={styles.leftSection}>
          {/* Space for the absolute-positioned logo */}
          <View style={{ width: logoSz + (isMobile ? 8 : 16) }} />

          {!isMobile && (
            <Pressable onPress={() => router.push('/')} style={styles.brandArea}>
              <Text style={[styles.brandName, { color: isDark ? '#e8f5e2' : '#1b4332' }]}>
                Talisay Oil
              </Text>
              <Text style={[styles.brandSub, { color: isDark ? '#6b8f70' : '#9ca3af' }]}>
                Yield Predictor
              </Text>
            </Pressable>
          )}
        </View>

        {/* Center: Desktop Nav Items */}
        {!isMobile && (
          <View style={styles.navSection}>
            <View style={styles.navItemsWrapper}>
              <View style={styles.navItemsRow}>
                {visibleNavItems.map((item, index) => (
                  <View
                    key={item.key}
                    onLayout={(e) => handleItemLayout(index, e)}
                  >
                    <DesktopNavItem
                      item={item}
                      isActive={isActive(item.key)}
                      onPress={() => handleNav(item.key)}
                      colors={colors}
                    />
                  </View>
                ))}
              </View>

              {/* Animated Underline — inside same wrapper so positions align */}
              <View style={styles.underlineTrack}>
                <UnderlineIndicator
                  activeIndex={activeIndex >= 0 ? activeIndex : 0}
                  itemPositions={itemPositions}
                  colors={colors}
                />
              </View>
            </View>
          </View>
        )}

        {/* Right: Hamburger (mobile) or Profile + Theme (desktop) */}
        <View style={styles.rightSection}>
          {isMobile ? (
            <>
              {/* Brand name on mobile */}
              <Pressable onPress={() => router.push('/')} style={styles.mobileBrand}>
                <Text style={[styles.mobileBrandText, { color: isDark ? '#e8f5e2' : '#1b4332' }]}>
                  Talisay Oil
                </Text>
              </Pressable>

              <View style={styles.mobileRight}>
                <ProfileDropdown />
                <ThemeToggle />
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  style={styles.hamburgerBtn}
                  accessibilityLabel="Open menu"
                  hitSlop={8}
                >
                  <Ionicons
                    name="menu"
                    size={24}
                    color={isDark ? '#e8f5e2' : '#374151'}
                  />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.rightActions}>
              <ProfileDropdown />
              <ThemeToggle />
            </View>
          )}
        </View>
      </View>

      {/* ─── Overlapping Logo ─── */}
      <View
        style={[
          styles.logoPositioner,
          { left: isMobile ? Spacing.md : Spacing.xl },
        ]}
      >
        <AnimatedPressable
          onPress={handleLogoPress}
          style={[
            logoAnimStyle,
            styles.logoContainer,
            {
              width: logoSz,
              height: logoSz,
              borderRadius: 16,
              backgroundColor: isDark ? '#1a2b1f' : '#ffffff',
              borderColor: isDark ? '#2a3d2e' : '#e5e7eb',
            },
          ]}
          accessibilityLabel="Go to Home"
          accessibilityRole="button"
        >
          <Image
            source={require('../assets/images/logos/talisay-logo.png')}
            style={{
              width: logoSz - 12,
              height: logoSz - 12,
              borderRadius: 12,
            }}
            resizeMode="contain"
          />
        </AnimatedPressable>
      </View>

      {/* ─── Mobile Slide-Out Drawer ─── */}
      <Modal
        visible={menuOpen}
        animationType="none"
        transparent
        onRequestClose={() => setMenuOpen(false)}
      >
        {/* Overlay */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuOpen(false)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          />
        </Pressable>

        {/* Drawer Panel */}
        <Animated.View
          entering={SlideInRight.duration(280).stiffness(150)}
          exiting={SlideOutRight.duration(250)}
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={[styles.drawerHead, { borderBottomColor: colors.divider }]}>
            <View>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Menu</Text>
              <Text style={[styles.drawerSub, { color: colors.textTertiary }]}>
                Navigate the app
              </Text>
            </View>
            <Pressable onPress={() => setMenuOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Drawer Nav Items */}
          <ScrollView
            style={styles.drawerScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: Spacing.sm }}
          >
            {visibleNavItems.map((item, idx) => (
              <MobileNavItem
                key={item.key}
                item={item}
                isActive={isActive(item.key)}
                onPress={() => handleNav(item.key)}
                colors={colors}
                index={idx}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    }),
  },

  /* Left */
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandArea: {
    gap: 0,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginTop: -1,
  },

  /* Center Nav */
  navSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemsWrapper: {
    position: 'relative',
  },
  navItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      },
    }),
  },
  navIcon: {
    opacity: 0.9,
  },
  navLabel: {
    fontSize: 13.5,
    letterSpacing: 0.1,
  },

  /* Animated Underline */
  underlineTrack: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  /* Right */
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: Platform.OS === 'web' ? undefined : 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },

  /* Mobile Header */
  mobileBrand: {
    flex: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  mobileBrandText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  mobileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hamburgerBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },

  /* Logo — overlaps into content */
  logoPositioner: {
    position: 'absolute',
    top: 4,
    zIndex: 1001,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.10)',
        transition: 'box-shadow 0.2s ease',
      },
    }),
    ...Shadows.lg,
  },

  /* Mobile Drawer */
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    borderLeftWidth: 1,
    ...Shadows.xl,
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  drawerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  drawerScroll: {
    flex: 1,
  },

  /* Mobile Nav Items */
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
  },
  mobileNavIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavLabel: {
    fontSize: 15,
    flex: 1,
  },
  mobileActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
});
