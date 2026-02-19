/**
 * Talisay AI — Home Page
 * The most visually impressive page with hero carousel,
 * animated stats, feature cards, and interactive sections.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  BounceIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import HeroCarousel from '../components/Hero/Carousel';
import StatsCard from '../components/Cards/StatsCard';
import InfoCard from '../components/Cards/InfoCard';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Quick Stats Data ───
// Based on actual research: 15 curated publications (9 foreign + 6 local).
// Oil yield range from multiple studies: 38–65% (Thomson 2006, Janporn 2014,
// Santos et al. 2022, Arunachalam 2024). Countries include Philippines,
// Thailand, Malaysia, Côte d'Ivoire, Benin, and others.
const STATS = [
  { icon: 'flask', label: 'Kernel Oil Yield', value: '38–65%', color: '#2d6a4f' },
  { icon: 'document-text', label: 'Curated Studies', value: '15', color: '#3b82f6' },
  { icon: 'globe', label: 'Countries Studied', value: '6+', color: '#f97316' },
  { icon: 'leaf', label: 'Maturity Stages', value: '3', color: '#eab308' },
];

// ─── Featured Sections Data ───
const FEATURES = [
  {
    icon: 'scan',
    title: 'AI Fruit Scanner',
    description: 'Advanced machine learning algorithms analyze and scan Talisay fruits with precision, helping researchers and farmers alike.',
    badge: 'AI Powered',
    badgeColor: '#7c3aed',
    iconColor: '#7c3aed',
  },
  {
    icon: 'analytics',
    title: 'Growth Analytics',
    description: 'Track and monitor growth patterns, seasonal changes, and environmental factors affecting Terminalia Catappa populations.',
    badge: 'Live Data',
    badgeColor: '#22c55e',
    iconColor: '#22c55e',
  },
  {
    icon: 'library',
    title: 'Research Library',
    description: 'Access a curated collection of local and international publications about Talisay—from botanical science to traditional medicine.',
    badge: 'Updated',
    badgeColor: '#3b82f6',
    iconColor: '#3b82f6',
  },
];

// ─── Quick Links ───
const QUICK_LINKS = [
  { icon: 'scan', label: 'Scan Fruit', route: '/scan', color: '#2d6a4f' },
  { icon: 'time', label: 'History', route: '/history', color: '#f97316' },
  { icon: 'map', label: 'Mapping', route: '/mapping', color: '#ef4444' },
  { icon: 'chatbubbles', label: 'TalisAI Chat', route: '/chatbot', color: '#22c55e' },
  { icon: 'leaf', label: 'About Talisay', route: '/about-talisay', color: '#52b788' },
  { icon: 'document-text', label: 'Publications', route: '/publication', color: '#3b82f6' },
  { icon: 'bar-chart', label: 'Analytics', route: '/admin', color: '#7c3aed' },
  { icon: 'people', label: 'About Us', route: '/about-us', color: '#ec4899' },
];

// ─── Talisay Fruit Products Preview (Home Page) ───
// Seed-to-oil products listed first, then others.
const HOME_PRODUCTS = [
  {
    id: 'cooking-oil',
    imageUri: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
    icon: 'water',
    color: '#f97316',
    title: 'Culinary Kernel Oil',
    summary: 'Cold-pressed cooking oil comparable to almond oil. Rich in oleic & linoleic fatty acids.',
    category: 'Seed-to-Oil',
    stages: ['Yellow', 'Brown'],
  },
  {
    id: 'biodiesel',
    imageUri: 'https://images.unsplash.com/photo-1620490776268-6fdd63e4af76?w=400',
    icon: 'flame',
    color: '#ef4444',
    title: 'Biodiesel / Biofuel',
    summary: 'Transesterified seed oil used as a diesel fuel extender. Recognized by DOST Region 3.',
    category: 'Seed-to-Oil',
    stages: ['Brown'],
  },
  {
    id: 'cosmetic-oil',
    imageUri: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    icon: 'color-palette',
    color: '#ec4899',
    title: 'Cosmetic & Skincare Oil',
    summary: 'Refined kernel oil used in moisturizers, hair oils, and skin-conditioning formulas.',
    category: 'Seed-to-Oil',
    stages: ['Yellow', 'Brown'],
  },
  {
    id: 'pharma-oil',
    imageUri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    icon: 'medkit',
    color: '#7c3aed',
    title: 'Pharmaceutical-Grade Oil',
    summary: 'High-purity supercritical CO₂ extract used in dietary supplement capsules.',
    category: 'Seed-to-Oil',
    stages: ['Yellow', 'Brown'],
  },
  {
    id: 'edible-kernel',
    imageUri: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    icon: 'nutrition',
    color: '#22c55e',
    title: 'Edible Kernel Snack',
    summary: 'Nutritious nut snack with 25.4% protein and 11.2% fiber — similar to almonds.',
    category: 'Food',
    stages: ['Yellow', 'Brown'],
  },
  {
    id: 'tannin-dye',
    imageUri: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
    icon: 'color-filter',
    color: '#8b5cf6',
    title: 'Tannin Extract & Natural Dye',
    summary: 'Bark and husk rich in punicalagin and corilagin, used for textile dyeing and tanning.',
    category: 'Industrial',
    stages: ['Green', 'Yellow', 'Brown'],
  },
];

// ─── Recent Updates ───
// Based on real research milestones and publications in the project.
const UPDATES = [
  {
    id: 1,
    title: 'Oil Yield Study Published',
    summary: 'Janporn et al. reported up to 57% oil yield from T. catappa kernels using Soxhlet extraction, with detailed fatty-acid profiling (J. Food Drug Anal., 2015).',
    time: 'Key study',
    type: 'publication',
    icon: 'document-text',
    color: '#3b82f6',
  },
  {
    id: 2,
    title: 'DOST Feasibility Report',
    summary: 'DOST Region 3 reported ~51.2% oil content for Philippine Talisay samples in a study on using Talisay seed oil as a diesel fuel extender.',
    time: 'Local research',
    type: 'research',
    icon: 'flask',
    color: '#2d6a4f',
  },
  {
    id: 3,
    title: 'Multi-Variety Comparison',
    summary: 'Santos et al. (2022) documented oil content of 40–60% across different T. catappa varieties, with full functional characterization in Grasas y Aceites.',
    time: 'Foreign study',
    type: 'publication',
    icon: 'globe',
    color: '#f97316',
  },
];

// ─── Floating Leaf Animation Component ───
function FloatingLeaf({ delay = 0, left }) {
  const float = useSharedValue(0);

  React.useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top: -20, opacity: 0.15 }, style]}>
      <Ionicons name="leaf" size={24} color="#52b788" />
    </Animated.View>
  );
}

// ─── Section Header ───
function SectionHeader({ title, subtitle, action, onAction, delay = 0 }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(280)}
      style={styles.sectionHeader}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {action && (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Quick Link Button ───
function QuickLinkItem({ item, index }) {
  const { colors } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={ZoomIn.delay(400 + index * 70).duration(280)}
      onPress={() => router.push(item.route)}
      onPressIn={() => { scale.value = withSpring(0.9, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 8 }); }}
      style={[pressStyle, styles.quickLink]}
    >
      <View style={[styles.quickLinkIcon, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={[styles.quickLinkLabel, { color: colors.text }]} numberOfLines={1}>
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Update Item ───
function UpdateItem({ item, index }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(600 + index * 100).duration(280)}
      onPressIn={() => { scale.value = withSpring(0.98); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[
        pressStyle,
        styles.updateCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          ...Shadows.sm,
        },
      ]}
    >
      <View style={[styles.updateIconBg, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.updateContent}>
        <Text style={[styles.updateTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.updateSummary, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.summary}
        </Text>
        <Text style={[styles.updateTime, { color: colors.textTertiary }]}>{item.time}</Text>
      </View>
    </AnimatedPressable>
  );
}

// ─── Fruit Product Card (Home preview) ───
function FruitProductCard({ item, index }) {
  const { colors } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const stageColor = (s) =>
    s === 'Green' ? '#16a34a' : s === 'Yellow' ? '#ca8a04' : '#92400e';

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(500 + index * 80).duration(280)}
      onPress={() => router.push('/about-talisay')}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 8 }); }}
      style={[pressStyle, styles.fpCard, {
        backgroundColor: colors.card,
        borderColor: colors.borderLight,
        borderTopColor: item.color,
        borderTopWidth: 3,
        ...Shadows.sm,
      }]}
    >
      {/* Product image header */}
      {item.imageUri && (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.fpImage}
          resizeMode="cover"
        />
      )}

      {/* Row: icon + text + arrow */}
      <View style={styles.fpCardBody}>
        {/* Icon */}
        <View style={[styles.fpIconBg, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>

        {/* Text content */}
        <View style={styles.fpContent}>
          <View style={styles.fpTitleRow}>
            <Text style={[styles.fpTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.fpCatBadge, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
              <Text style={[styles.fpCatText, { color: item.color }]}>{item.category}</Text>
            </View>
          </View>
          <Text style={[styles.fpSummary, { color: colors.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.fpStageRow}>
            {item.stages.map(s => (
              <View key={s} style={[styles.fpStageBadge, {
                backgroundColor: stageColor(s) + '15',
                borderColor: stageColor(s) + '30',
              }]}>
                <View style={[styles.fpStageDot, { backgroundColor: stageColor(s) }]} />
                <Text style={[styles.fpStageText, { color: stageColor(s) }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
      </View>
    </AnimatedPressable>
  );
}

// ─── Call to Action Banner ───
function CTABanner() {
  const { colors, isDark, gradients } = useTheme();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(700).duration(280)}>
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ctaBanner, isMobile && styles.ctaBannerMobile]}
      >
        <View style={styles.ctaContent}>
          <Text style={[styles.ctaTitle, isMobile && { fontSize: 22 }]}>
            Discover Talisay AI
          </Text>
          <Text style={styles.ctaDescription}>
            Join researchers worldwide using artificial intelligence to study and preserve Terminalia Catappa for future generations.
          </Text>
          <Animated.View style={pulseStyle}>
            <Pressable style={styles.ctaBtn} onPress={() => router.push('/scan')}>
              <Text style={styles.ctaBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#1b4332" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Decorative elements */}
        <FloatingLeaf delay={0} left="80%" />
        <FloatingLeaf delay={500} left="70%" />
        <FloatingLeaf delay={1000} left="90%" />
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Main Home Page ───
export default function HomePage() {
  const { colors, isDark } = useTheme();
  const { isMobile, isDesktop, responsive, columns } = useResponsive();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ════ HERO CAROUSEL ════ */}
      <HeroCarousel />

      {/* ════ STATS SECTION ════ */}
      <View style={[styles.section, styles.statsSection, isDesktop && styles.sectionDesktop]}>
        <View style={[
          styles.statsGrid,
          { maxWidth: LayoutConst.maxContentWidth },
          isMobile && styles.statsGridMobile,
        ]}>
          {STATS.map((stat, idx) => (
            <StatsCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              delay={200 + idx * 80}
            />
          ))}
        </View>
      </View>

      {/* ════ QUICK LINKS ════ */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <SectionHeader
          title="Quick Access"
          subtitle="Jump to any section"
          delay={300}
        />
        <View style={[
          styles.quickLinksGrid,
          isMobile && styles.quickLinksGridMobile,
        ]}>
          {QUICK_LINKS.map((item, idx) => (
            <QuickLinkItem key={item.label} item={item} index={idx} />
          ))}
        </View>
      </View>

      {/* ════ FEATURES ════ */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <SectionHeader
          title="What We Do"
          subtitle="Powered by cutting-edge technology"
          action="Learn More"
          onAction={() => router.push('/about-talisay')}
          delay={400}
        />
        <View style={[
          styles.featuresGrid,
          isMobile && styles.featuresGridMobile,
        ]}>
          {FEATURES.map((feature, idx) => (
            <InfoCard
              key={feature.title}
              icon={feature.icon}
              iconColor={feature.iconColor}
              title={feature.title}
              description={feature.description}
              badge={feature.badge}
              badgeColor={feature.badgeColor}
              delay={500 + idx * 100}
              onPress={() => {}}
            />
          ))}
        </View>
      </View>

      {/* ════ TALISAY FRUIT PRODUCTS ════ */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <SectionHeader
          title="Talisay Fruit Products"
          subtitle="From seed oil to natural dyes — what Talisay produces"
          action="View All"
          onAction={() => router.push('/about-talisay')}
          delay={450}
        />
        {/* Seed-to-Oil label */}
        <Animated.View
          entering={FadeInUp.delay(480).duration(280)}
          style={[styles.fpGroupBanner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}
        >
          <Ionicons name="water" size={16} color="#f97316" />
          <Text style={[styles.fpGroupText, { color: '#c2410c' }]}>Seed-to-Oil Yield Products listed first</Text>
        </Animated.View>
        <View style={[styles.fpGrid, isMobile && styles.fpGridMobile]}>
          {HOME_PRODUCTS.map((item, idx) => (
            <FruitProductCard key={item.id} item={item} index={idx} />
          ))}
        </View>
        <Animated.View entering={FadeInUp.delay(1000).duration(280)}>
          <Pressable
            onPress={() => router.push('/about-talisay')}
            style={[styles.fpViewAllBtn, { borderColor: '#2d6a4f' + '40', backgroundColor: '#2d6a4f' + '08' }]}
          >
            <Text style={[styles.fpViewAllText, { color: '#2d6a4f' }]}>View all products & detailed info</Text>
            <Ionicons name="arrow-forward" size={16} color="#2d6a4f" />
          </Pressable>
        </Animated.View>
      </View>

      {/* ════ CTA BANNER ════ */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <CTABanner />
      </View>

      {/* ════ RECENT UPDATES ════ */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <SectionHeader
          title="Latest Updates"
          subtitle="What's happening in the Talisay AI world"
          action="View All"
          onAction={() => {}}
          delay={600}
        />
        <View style={styles.updatesList}>
          {UPDATES.map((update, idx) => (
            <UpdateItem key={update.id} item={update} index={idx} />
          ))}
        </View>
      </View>

      {/* ════ FUN FACTS MARQUEE ════ */}
      <Animated.View
        entering={FadeIn.delay(800)}
        style={[styles.factsBanner, {
          backgroundColor: isDark ? '#1a2b1f' : '#f0fdf4',
          borderColor: isDark ? '#2a3d2e' : '#bbf7d0',
        }]}
      >
        <Ionicons name="bulb" size={20} color="#eab308" />
        <Text style={[styles.factText, { color: colors.textSecondary }]}>
          Did you know? Talisay leaves contain tannins that are used in aquariums to create natural blackwater conditions, benefiting tropical fish health.
        </Text>
      </Animated.View>

      {/* Bottom padding */}
      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: LayoutConst.maxContentWidth,
    paddingHorizontal: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sectionHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sectionActionText: {
    ...Typography.captionMedium,
  },

  // Stats grid
  statsSection: {
    marginTop: -Spacing.xl,
    zIndex: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
    alignSelf: 'center',
    width: '100%',
  },
  statsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // Quick Links
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  quickLinksGridMobile: {
    gap: Spacing.sm,
  },
  quickLink: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: 90,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickLinkIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: {
    ...Typography.small,
    textAlign: 'center',
  },

  // Features
  featuresGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },

  // CTA Banner
  ctaBanner: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaBannerMobile: {
    padding: Spacing.lg,
  },
  ctaContent: {
    maxWidth: 500,
    gap: Spacing.md,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  ctaDescription: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b4332',
  },

  // Updates
  updatesList: {
    gap: Spacing.sm,
  },
  updateCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  updateIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  updateContent: {
    flex: 1,
    gap: 4,
  },
  updateTitle: {
    ...Typography.bodyMedium,
  },
  updateSummary: {
    ...Typography.caption,
    lineHeight: 20,
  },
  updateTime: {
    ...Typography.small,
    marginTop: 2,
  },

  // Fun Facts
  factsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  factText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 20,
  },

  // Fruit Products (home page)
  fpGroupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
    marginBottom: Spacing.md,
  },
  fpGroupText: { ...Typography.small, fontWeight: '600' },
  fpGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md,
  },
  fpGridMobile: { flexDirection: 'column', gap: Spacing.sm },
  fpCard: {
    width: '47%', minWidth: 260, flexGrow: 1,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'flex-start',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  fpImage: { width: '100%', height: 110 },
  fpCardBody: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.md, alignItems: 'flex-start', flex: 1, width: '100%',
  },
  fpIconBg: {
    width: 40, height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fpContent: { flex: 1, gap: 4 },
  fpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  fpTitle: { ...Typography.bodyMedium },
  fpCatBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  fpCatText: { ...Typography.tiny, fontWeight: '600' },
  fpSummary: { ...Typography.small, lineHeight: 18 },
  fpStageRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 },
  fpStageBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  fpStageDot: { width: 5, height: 5, borderRadius: 3 },
  fpStageText: { ...Typography.tiny, fontWeight: '600' },
  fpViewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1,
    marginTop: Spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  fpViewAllText: { ...Typography.captionMedium },
});
