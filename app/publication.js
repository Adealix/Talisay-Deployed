/**
 * Talisay Oil — Publication Page
 * Real local & foreign publications with filtering, search.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { publications, getPublicationsByType } from '../data/publications';

const CATEGORY_TABS = [
  { key: 'all', label: 'All', icon: 'library' },
  { key: 'local', label: 'Local', icon: 'flag' },
  { key: 'foreign', label: 'Foreign', icon: 'globe' },
];

function PublicationItem({ pub, index }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const categoryColors = {
    local: { bg: '#3b82f620', text: '#3b82f6', label: 'Local' },
    foreign: { bg: '#7c3aed20', text: '#7c3aed', label: 'Foreign' },
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(150 + index * 60).springify()}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[styles.pubCard, {
          backgroundColor: colors.card,
          borderColor: expanded ? colors.primary : colors.borderLight,
          ...Shadows.sm,
        }]}
      >
        {/* Top row: badges */}
        <View style={styles.pubBadges}>
          <View style={[styles.badge, { backgroundColor: categoryColors[pub.type].bg }]}>
            <Text style={[styles.badgeText, { color: categoryColors[pub.type].text }]}>
              {categoryColors[pub.type].label}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[styles.pubYear, { color: colors.textTertiary }]}>{pub.year}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.pubTitle, { color: colors.text }]}>{pub.title}</Text>

        {/* Authors & Publication */}
        <Text style={[styles.pubAuthors, { color: colors.textSecondary }]}>{pub.authors}</Text>
        <View style={styles.pubJournalRow}>
          <Ionicons name="document-text" size={14} color={colors.textTertiary} />
          <Text style={[styles.pubJournal, { color: colors.textTertiary }]}>
            {pub.publication}{pub.volume ? `, ${pub.volume}` : ''}{pub.pages ? `, pp. ${pub.pages}` : ''}
          </Text>
        </View>

        {/* Expanded reference */}
        {expanded && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.pubExpanded}>
            <View style={[styles.pubDivider, { backgroundColor: colors.borderLight }]} />
            <Text style={[styles.pubAbstractLabel, { color: colors.textSecondary }]}>Reference</Text>
            <Text style={[styles.pubAbstract, { color: colors.textSecondary }]}>{pub.reference}</Text>
            {pub.url && (
              <Pressable
                onPress={() => Linking.openURL(pub.url).catch(() => {})}
                style={styles.doiRow}
              >
                <Ionicons name="open-outline" size={14} color={colors.primary} />
                <Text style={[styles.doiText, { color: colors.primary }]}>Read more</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Expand indicator */}
        <View style={styles.expandRow}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function PublicationPage() {
  const { colors, isDark } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = publications;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.type === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.toLowerCase().includes(q) ||
          p.publication.toLowerCase().includes(q) ||
          (p.reference && p.reference.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, search]);

  const localCount = publications.filter((p) => p.type === 'local').length;
  const foreignCount = publications.filter((p) => p.type === 'foreign').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#0f1a12'] : ['#faf5ff', '#ede9fe']}
        style={styles.pageHeader}
      >
        <Animated.View entering={FadeInUp.springify()} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: '#7c3aed' + '20' }]}>
            <Ionicons name="library" size={28} color="#7c3aed" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Publications</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Explore local and international research on Terminalia catappa
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* Stats banner */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          style={[styles.statsRow, isMobile && styles.statsRowMobile]}
        >
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}>
            <Ionicons name="library" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{publications.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}>
            <Ionicons name="flag" size={18} color="#3b82f6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{localCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Local</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}>
            <Ionicons name="globe" size={18} color="#7c3aed" />
            <Text style={[styles.statValue, { color: colors.text }]}>{foreignCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Foreign</Text>
          </View>
        </Animated.View>

        {/* Search bar */}
        <Animated.View
          entering={FadeInUp.delay(150).springify()}
          style={[styles.searchBar, {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          }]}
        >
          <Ionicons name="search" size={18} color={colors.inputPlaceholder} />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search publications..."
            placeholderTextColor={colors.inputPlaceholder}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.inputPlaceholder} />
            </Pressable>
          )}
        </Animated.View>

        {/* Category tabs */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.tabRow}>
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveCategory(tab.key)}
                style={[styles.tab, {
                  backgroundColor: active ? colors.primary + '15' : 'transparent',
                  borderColor: active ? colors.primary : colors.borderLight,
                }]}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Results count */}
        <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
          {filtered.length} publication{filtered.length !== 1 ? 's' : ''} found
        </Text>

        {/* Publication list */}
        <View style={styles.pubList}>
          {filtered.length > 0 ? (
            filtered.map((pub, idx) => (
              <PublicationItem key={pub.id} pub={pub} index={idx} />
            ))
          ) : (
            <Animated.View
              entering={FadeInUp.springify()}
              style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            >
              <Ionicons name="document" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No publications found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                Try adjusting your search or filter criteria
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Contribute CTA */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <LinearGradient
            colors={isDark ? ['#312e81', '#1e1b4b'] : ['#ede9fe', '#ddd6fe']}
            style={styles.ctaBanner}
          >
            <Ionicons name="create" size={24} color={isDark ? '#c4b5fd' : '#7c3aed'} />
            <Text style={[styles.ctaTitle, { color: isDark ? '#c4b5fd' : '#4c1d95' }]}>
              Have a publication to share?
            </Text>
            <Text style={[styles.ctaText, { color: isDark ? '#ddd6fe' : '#5b21b6' }]}>
              We welcome contributions from researchers worldwide. Submit your Terminalia catappa
              research for review and inclusion in our database.
            </Text>
            <Pressable style={[styles.ctaBtn, { backgroundColor: isDark ? '#7c3aed' : '#5b21b6' }]}>
              <Ionicons name="mail" size={16} color="#fff" />
              <Text style={styles.ctaBtnText}>Submit Research</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  headerContent: { gap: Spacing.sm },
  headerContentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center', width: '100%',
  },
  headerIcon: {
    width: 52, height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 480 },
  content: { padding: Spacing.lg },
  contentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center', width: '100%',
    paddingHorizontal: Spacing.xxl,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsRowMobile: { gap: Spacing.sm },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statValue: { ...Typography.bodyMedium },
  statLabel: { ...Typography.small },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  tabText: { ...Typography.captionMedium },

  resultCount: { ...Typography.small, marginBottom: Spacing.md },

  /* Publication cards */
  pubList: { gap: Spacing.sm },
  pubCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  pubBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: { ...Typography.tiny, fontWeight: '600' },
  pubYear: { ...Typography.small },
  pubTitle: { ...Typography.bodyMedium, lineHeight: 22 },
  pubAuthors: { ...Typography.small },
  pubJournalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pubJournal: { ...Typography.small, fontStyle: 'italic' },
  pubExpanded: { gap: Spacing.sm, marginTop: Spacing.xs },
  pubDivider: { height: 1 },
  pubAbstractLabel: { ...Typography.captionMedium },
  pubAbstract: { ...Typography.small, lineHeight: 20 },
  doiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doiText: { ...Typography.small },
  expandRow: { alignItems: 'center', marginTop: Spacing.xs },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.bodyMedium },
  emptySubtitle: { ...Typography.small },

  /* CTA */
  ctaBanner: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  ctaTitle: { ...Typography.h4 },
  ctaText: { ...Typography.caption, lineHeight: 22 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  ctaBtnText: { ...Typography.button, color: '#fff' },
});
