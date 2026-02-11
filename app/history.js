/**
 * Talisay AI — Scan History Page
 * Shows saved analysis results with filters, card grid, and detail modal.
 * Adapted from talisay_oil's history page, using talisay_ai's design system.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeInLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { historyService } from '../services/historyService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Helpers ───
function formatDateLabel(isoDate) {
  const d = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getCategoryColor(cat) {
  switch (cat?.toUpperCase()) {
    case 'GREEN': return '#22c55e';
    case 'YELLOW': return '#eab308';
    case 'BROWN': return '#92400e';
    default: return '#6b7280';
  }
}

// ─── History Card ───
function HistoryCard({ entry, onPress, delay = 0, colors, isDark }) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(14)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[cardStyle, styles.historyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        {/* Thumbnail */}
        {entry.imageUri ? (
          <Image source={{ uri: entry.imageUri }} style={styles.cardThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.cardThumb, styles.cardThumbPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
            <Ionicons name="leaf" size={28} color={colors.textTertiary} />
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardBody}>
          {/* Type badge */}
          {entry.analysisType === 'comparison' && (
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="git-compare" size={10} color={colors.primary} />
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>Comparison</Text>
            </View>
          )}

          {/* Category */}
          <View style={[styles.catBadge, { backgroundColor: getCategoryColor(entry.category) }]}>
            <Text style={styles.catBadgeText}>{entry.category || 'Unknown'}</Text>
          </View>

          {/* Oil yield */}
          <Text style={[styles.oilYieldText, { color: colors.text }]}>
            {entry.oilYieldPercent?.toFixed(1) ?? '—'}% oil
          </Text>

          {/* Comparison label */}
          {entry.comparisonLabel && (
            <Text style={[styles.compLabelText, { color: colors.textTertiary }]} numberOfLines={1}>
              {entry.comparisonLabel}
            </Text>
          )}

          {/* Date */}
          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{formatDateLabel(entry.createdAt)}</Text>
          <Text style={[styles.cardTime, { color: colors.textTertiary }]}>{formatTime(entry.createdAt)}</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Detail Modal ───
function DetailModal({ entry, visible, onClose, onDelete, colors, isDark }) {
  if (!entry) return null;
  const dims = entry.dimensions || {};

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {entry.imageName || 'Analysis Result'}
              </Text>
              <View style={styles.modalMetaRow}>
                {entry.analysisType === 'comparison' && (
                  <View style={[styles.modalTypeBadge, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="git-compare" size={11} color={colors.primary} />
                    <Text style={[styles.modalTypeText, { color: colors.primary }]}>Comparison</Text>
                  </View>
                )}
                <Text style={[styles.modalDate, { color: colors.textTertiary }]}>
                  {formatDateLabel(entry.createdAt)} • {formatTime(entry.createdAt)}
                </Text>
              </View>
            </View>

            {/* Image */}
            <View style={styles.modalImageSection}>
              {entry.imageUri ? (
                <Image source={{ uri: entry.imageUri }} style={styles.modalImage} resizeMode="contain" />
              ) : (
                <View style={[styles.modalImagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                  <Ionicons name="leaf" size={48} color={colors.textTertiary} />
                </View>
              )}
              {entry.comparisonLabel && (
                <View style={[styles.compLabelBox, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Text style={styles.compLabelBoxText}>{entry.comparisonLabel}</Text>
                </View>
              )}
            </View>

            {/* Results */}
            <View style={styles.modalDetails}>
              {/* Oil Yield + Color Row */}
              <View style={styles.modalResultRow}>
                <View style={[styles.modalResultCol, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f0fdf4', borderColor: colors.borderLight }]}>
                  <Ionicons name="water" size={18} color="#22c55e" />
                  <Text style={[styles.modalResultLabel, { color: colors.textSecondary }]}>Oil Yield</Text>
                  <Text style={[styles.modalResultValue, { color: colors.text }]}>
                    {entry.oilYieldPercent?.toFixed(1) ?? '—'}%
                  </Text>
                  {entry.yieldCategory && (
                    <Text style={[styles.modalResultSub, { color: colors.textTertiary }]}>{entry.yieldCategory}</Text>
                  )}
                </View>
                <View style={[styles.modalResultCol, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fefce8', borderColor: colors.borderLight }]}>
                  <Ionicons name="color-palette" size={18} color={getCategoryColor(entry.category)} />
                  <Text style={[styles.modalResultLabel, { color: colors.textSecondary }]}>Color</Text>
                  <View style={[styles.modalCatBadge, { backgroundColor: getCategoryColor(entry.category) }]}>
                    <Text style={styles.modalCatText}>{entry.category || 'Unknown'}</Text>
                  </View>
                  {entry.colorConfidence != null && (
                    <Text style={[styles.modalResultSub, { color: colors.textTertiary }]}>
                      {Math.round(entry.colorConfidence * 100)}% confidence
                    </Text>
                  )}
                </View>
              </View>

              {/* Dimensions */}
              {dims && Object.keys(dims).length > 0 && (
                <View style={[styles.modalSection, { borderColor: colors.borderLight }]}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="resize" size={16} color={colors.primary} />
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Dimensions</Text>
                  </View>
                  <View style={styles.dimGrid}>
                    {[
                      { label: 'Length', value: dims.lengthCm ?? dims.length_cm, unit: 'cm', icon: 'resize-outline' },
                      { label: 'Width', value: dims.widthCm ?? dims.width_cm, unit: 'cm', icon: 'resize-outline' },
                      { label: 'Kernel', value: dims.kernelWeightG ?? dims.kernel_mass_g, unit: 'g', icon: 'scale-outline', decimals: 2 },
                      { label: 'Total', value: dims.wholeFruitWeightG ?? dims.whole_fruit_weight_g, unit: 'g', icon: 'barbell-outline', decimals: 1 },
                    ].map((d, i) => (
                      <View key={i} style={[styles.dimItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: colors.borderLight }]}>
                        <Ionicons name={d.icon} size={16} color={colors.primary} />
                        <Text style={[styles.dimLabel, { color: colors.textTertiary }]}>{d.label}</Text>
                        <Text style={[styles.dimValue, { color: colors.text }]}>
                          {d.value != null ? Number(d.value).toFixed(d.decimals ?? 1) : '—'}
                        </Text>
                        <Text style={[styles.dimUnit, { color: colors.textTertiary }]}>{d.unit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Maturity & Features */}
              {(entry.maturityStage || entry.hasSpots) && (
                <View style={[styles.modalSection, { borderColor: colors.borderLight }]}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Features</Text>
                  </View>
                  {entry.maturityStage && (
                    <View style={styles.featureRow}>
                      <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>Maturity:</Text>
                      <Text style={[styles.featureValue, { color: colors.text }]}>{entry.maturityStage}</Text>
                    </View>
                  )}
                  {entry.hasSpots && (
                    <View style={[styles.spotBadge, { backgroundColor: '#f9731612' }]}>
                      <Ionicons name="warning" size={14} color="#f97316" />
                      <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600' }}>
                        Spots detected ({entry.spotCoverage ? (entry.spotCoverage * 100).toFixed(1) : '—'}% coverage)
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Interpretation */}
              {entry.interpretation && (
                <View style={[styles.modalSection, { borderColor: colors.borderLight }]}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="bulb" size={16} color="#f59e0b" />
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Interpretation</Text>
                  </View>
                  <Text style={[styles.interpText, { color: colors.textSecondary }]}>{entry.interpretation}</Text>
                </View>
              )}

              {/* Delete button */}
              <Pressable onPress={onDelete} style={[styles.deleteBtn, { borderColor: '#ef444440' }]}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.deleteBtnText}>Delete This Entry</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ════════════════════════════════════════════════
// ─── MAIN HISTORY PAGE ───
// ════════════════════════════════════════════════
export default function HistoryPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isMobile, isDesktop } = useResponsive();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEntry, setModalEntry] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // ─── Load history ───
  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { items } = await historyService.listHistory({ limit: 100 });
      const processed = (items || []).map((item) => ({
        ...item,
        analysisType: item.analysisType || 'single',
      }));
      setEntries(processed);
    } catch (e) {
      console.warn('[History]', e?.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Actions ───
  const handleDelete = async (id) => {
    const doDelete = async () => {
      try {
        await historyService.deleteHistoryItem(id);
        setModalEntry(null);
        loadHistory();
      } catch (e) {
        console.warn('[History] delete error', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this scan entry?')) doDelete();
    } else {
      Alert.alert('Delete Entry', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleClear = async () => {
    const doClear = async () => {
      try {
        await historyService.clearAllHistory();
        setEntries([]);
      } catch (e) {
        console.warn('[History] clear error', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Clear ALL scan history? This cannot be undone.')) doClear();
    } else {
      Alert.alert('Clear History', 'Delete all scan entries? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: doClear },
      ]);
    }
  };

  // ─── Filtered entries ───
  const filteredEntries = entries.filter(
    (e) => filterType === 'all' || e.analysisType === filterType
  );
  const singleCount = entries.filter((e) => e.analysisType === 'single').length;
  const compCount = entries.filter((e) => e.analysisType === 'comparison').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* ─── Page Header ─── */}
      <LinearGradient
        colors={isDark ? ['#1a1f2e', '#0f1318'] : ['#eff6ff', '#dbeafe']}
        style={styles.pageHeader}
      >
        <Animated.View entering={FadeInUp.springify()} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: '#3b82f6' + '20' }]}>
            <Ionicons name="time" size={28} color="#3b82f6" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Scan History</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            View your saved Talisay fruit analysis results
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* ─── Not Logged In ─── */}
        {!isAuthenticated ? (
          <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Ionicons name="log-in-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign In to View History</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Log in or create an account to save and view your scan history.
            </Text>
            <Pressable onPress={() => router.push('/account')} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.actionBtnText}>Sign In</Text>
            </Pressable>
          </Animated.View>
        ) : loading ? (
          /* ─── Loading ─── */
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading history...</Text>
          </View>
        ) : entries.length === 0 ? (
          /* ─── Empty ─── */
          <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Ionicons name="scan-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scans Yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Analyze a Talisay fruit image on the Scan page to see your history here.
            </Text>
            <Pressable onPress={() => router.push('/scan')} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.actionBtnText}>Go to Scan</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            {/* ─── Filter Tabs ─── */}
            <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.filterRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              {[
                { key: 'all', label: `All (${entries.length})`, icon: 'list' },
                { key: 'single', label: `Single (${singleCount})`, icon: 'image' },
                { key: 'comparison', label: `Compare (${compCount})`, icon: 'git-compare' },
              ].map((tab) => {
                const active = filterType === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setFilterType(tab.key)}
                    style={[styles.filterBtn, active && { backgroundColor: colors.primary, ...Shadows.sm }]}
                  >
                    <Ionicons name={tab.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.filterBtnText, { color: active ? '#fff' : colors.textSecondary }]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>

            {/* ─── Toolbar ─── */}
            <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.toolbar}>
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </Text>
              <Pressable onPress={handleClear} style={[styles.clearAllBtn, { borderColor: '#ef444440' }]}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </Pressable>
            </Animated.View>

            {/* ─── Cards Grid ─── */}
            {filteredEntries.length === 0 ? (
              <Animated.View entering={FadeInUp.springify()} style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Ionicons name="filter-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No {filterType === 'single' ? 'Single Analysis' : 'Comparison'} Scans
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Try the {filterType === 'single' ? 'comparison' : 'single'} filter or scan a new Talisay fruit.
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.cardGrid}>
                {filteredEntries.map((entry, idx) => (
                  <HistoryCard
                    key={entry.id || entry._id || idx}
                    entry={entry}
                    onPress={() => setModalEntry(entry)}
                    delay={Math.min(idx * 50, 400)}
                    colors={colors}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ height: Spacing.xxxl }} />

      {/* ─── Detail Modal ─── */}
      <DetailModal
        entry={modalEntry}
        visible={!!modalEntry}
        onClose={() => setModalEntry(null)}
        onDelete={() => modalEntry && handleDelete(modalEntry.id || modalEntry._id)}
        colors={colors}
        isDark={isDark}
      />
    </ScrollView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Page Header */
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  headerContent: { gap: Spacing.sm },
  headerContentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' },
  headerIcon: { width: 52, height: 52, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 500 },

  content: { padding: Spacing.lg, gap: Spacing.md },
  contentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: Spacing.xxl },

  /* Empty / Login Prompt */
  emptyCard: {
    alignItems: 'center', gap: Spacing.sm, padding: Spacing.xxl,
    borderRadius: BorderRadius.lg, borderWidth: 1, ...Shadows.sm,
  },
  emptyTitle: { ...Typography.h4, textAlign: 'center' },
  emptyDesc: { ...Typography.caption, textAlign: 'center', maxWidth: 320 },
  actionBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.md, marginTop: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: Spacing.md },
  loadingText: { fontSize: 14, fontWeight: '500' },

  /* Filter Row */
  filterRow: {
    flexDirection: 'row', gap: 4, padding: 4,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  filterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  filterBtnText: { fontSize: 12, fontWeight: '600' },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  resultCount: { fontSize: 13, fontWeight: '500' },
  clearAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  clearAllText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  /* Card Grid */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },

  /* History Card */
  historyCard: {
    width: 165, borderRadius: BorderRadius.lg, borderWidth: 1,
    overflow: 'hidden', ...Shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  cardThumb: { width: '100%', height: 120 },
  cardThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: Spacing.sm, gap: 3 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginBottom: 2,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  catBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  catBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  oilYieldText: { fontSize: 16, fontWeight: '700' },
  compLabelText: { fontSize: 10, fontWeight: '500' },
  cardDate: { fontSize: 11 },
  cardTime: { fontSize: 10 },

  /* Modal */
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.md,
  },
  modalContainer: {
    width: '100%', maxWidth: 700, maxHeight: '92%',
    borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.lg,
  },
  modalCloseBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  modalHeader: {
    padding: Spacing.lg, paddingTop: Spacing.xl,
    borderBottomWidth: 1, gap: Spacing.xs,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  modalTypeText: { fontSize: 11, fontWeight: '700' },
  modalDate: { fontSize: 12 },

  modalImageSection: { position: 'relative' },
  modalImage: { width: '100%', height: 280 },
  modalImagePlaceholder: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' },
  compLabelBox: {
    position: 'absolute', bottom: 8, left: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  compLabelBoxText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  modalDetails: { padding: Spacing.lg, gap: Spacing.md },

  /* Result Row */
  modalResultRow: { flexDirection: 'row', gap: Spacing.sm },
  modalResultCol: {
    flex: 1, alignItems: 'center', gap: 4,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  modalResultLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalResultValue: { fontSize: 26, fontWeight: '800' },
  modalResultSub: { fontSize: 11, fontWeight: '500' },
  modalCatBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  modalCatText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Modal Section */
  modalSection: { gap: Spacing.sm, paddingTop: Spacing.md, borderTopWidth: 1 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalSectionTitle: { fontSize: 14, fontWeight: '700' },

  /* Dimensions */
  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dimItem: {
    flex: 1, minWidth: '40%', alignItems: 'center', gap: 2,
    padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  dimLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  dimValue: { fontSize: 18, fontWeight: '700' },
  dimUnit: { fontSize: 10, fontWeight: '500' },

  /* Features */
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  featureLabel: { fontSize: 13, fontWeight: '500' },
  featureValue: { fontSize: 14, fontWeight: '700' },
  spotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, borderRadius: BorderRadius.sm,
  },

  /* Interpretation */
  interpText: { fontSize: 13, lineHeight: 20 },

  /* Delete */
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1,
    marginTop: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
