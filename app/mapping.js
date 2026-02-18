/**
 * Talisay AI — Talisay Tree Mapping Page
 * Interactive map of the Philippines showing Talisay (Terminalia catappa) tree locations.
 * Uses Leaflet via WebView on native and iframe on web for cross-platform support.
 * Features: red pins, heat map overlay, location legend, search.
 */
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { TALISAY_LOCATIONS, LOCATION_STATS } from '../data/talisayLocations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Build Leaflet HTML ───
function buildMapHTML(locations, isDark) {
  const markers = locations.map(loc => {
    const radius = loc.density === 3 ? 12 : loc.density === 2 ? 9 : 6;
    const opacity = loc.density === 3 ? 0.9 : loc.density === 2 ? 0.7 : 0.5;
    return `
      L.circleMarker([${loc.lat}, ${loc.lng}], {
        radius: ${radius},
        fillColor: '#ef4444',
        color: '#991b1b',
        weight: 1.5,
        opacity: 1,
        fillOpacity: ${opacity},
      }).addTo(map).bindPopup(\`
        <div style="font-family: -apple-system, sans-serif; min-width: 180px;">
          <b style="font-size: 14px; color: #1e293b;">${loc.name.replace(/'/g, "\\'")}</b><br/>
          <span style="font-size: 11px; color: #64748b;">${loc.province.replace(/'/g, "\\'")} • ${loc.region.replace(/'/g, "\\'")}</span><br/>
          <div style="margin-top: 6px; padding: 4px 8px; border-radius: 4px; background: ${loc.density === 3 ? '#dcfce7' : loc.density === 2 ? '#fef9c3' : '#f1f5f9'}; display: inline-block;">
            <span style="font-size: 11px; font-weight: 600; color: ${loc.density === 3 ? '#166534' : loc.density === 2 ? '#854d0e' : '#475569'};">
              ${loc.density === 3 ? '🌳 Abundant' : loc.density === 2 ? '🌿 Moderate' : '🌱 Sparse'}
            </span>
          </div>
          ${loc.note ? `<p style="font-size: 11px; color: #475569; margin: 6px 0 0; line-height: 1.4;">${loc.note.replace(/'/g, "\\'")}</p>` : ''}
        </div>
      \`);
    `;
  }).join('\n');

  // Heat map data points
  const heatData = locations.map(loc => `[${loc.lat}, ${loc.lng}, ${loc.density * 0.4}]`).join(',\n        ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .legend {
      background: ${isDark ? '#1e293b' : 'white'};
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, sans-serif;
      font-size: 11px;
      color: ${isDark ? '#e2e8f0' : '#334155'};
      line-height: 1.6;
    }
    .legend-title {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
      color: ${isDark ? '#f8fafc' : '#0f172a'};
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid #991b1b;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [12.0, 122.0],
      zoom: 6,
      minZoom: 5,
      maxZoom: 15,
      zoomControl: true,
    });

    // Tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    // Heat layer
    var heatData = [
        ${heatData}
    ];
    L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: 1.2,
      gradient: {
        0.2: '#fee2e2',
        0.4: '#fca5a5',
        0.6: '#f87171',
        0.8: '#ef4444',
        1.0: '#991b1b',
      },
    }).addTo(map);

    // Markers
    ${markers}

    // Legend
    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
      var div = L.DomUtil.create('div', 'legend');
      div.innerHTML = \`
        <div class="legend-title">🌳 Talisay Tree Density</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444; width:14px; height:14px; opacity:0.9;"></div> Abundant</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444; width:11px; height:11px; opacity:0.7;"></div> Moderate</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444; width:8px; height:8px; opacity:0.5;"></div> Sparse</div>
      \`;
      return div;
    };
    legend.addTo(map);
  </script>
</body>
</html>`;
}

// ─── Stat Badge ───
function StatBadge({ icon, label, value, color, colors, delay = 0 }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(280)}
      style={[styles.statBadge, { backgroundColor: color + '10', borderColor: color + '30' }]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Location List Item ───
function LocationItem({ loc, onPress, colors, isDark, delay = 0 }) {
  const densityInfo = {
    3: { label: 'Abundant', color: '#22c55e', bg: '#dcfce7', icon: '🌳' },
    2: { label: 'Moderate', color: '#eab308', bg: '#fef9c3', icon: '🌿' },
    1: { label: 'Sparse', color: '#64748b', bg: '#f1f5f9', icon: '🌱' },
  };
  const info = densityInfo[loc.density] || densityInfo[1];

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(200)}>
      <Pressable
        onPress={onPress}
        style={[styles.locItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        <View style={[styles.locDensityDot, { backgroundColor: info.bg }]}>
          <Text style={{ fontSize: 14 }}>{info.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.locName, { color: colors.text }]}>{loc.name}</Text>
          <Text style={[styles.locProvince, { color: colors.textSecondary }]}>{loc.province}</Text>
        </View>
        <View style={[styles.locDensityBadge, { backgroundColor: info.color + '15' }]}>
          <Text style={[styles.locDensityText, { color: info.color }]}>{info.label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Location Detail Modal ───
function LocationModal({ loc, visible, onClose, colors, isDark }) {
  if (!loc) return null;
  const densityInfo = {
    3: { label: 'Abundant', color: '#22c55e', bg: '#dcfce7', icon: '🌳' },
    2: { label: 'Moderate', color: '#eab308', bg: '#fef9c3', icon: '🌿' },
    1: { label: 'Sparse', color: '#64748b', bg: '#f1f5f9', icon: '🌱' },
  };
  const info = densityInfo[loc.density] || densityInfo[1];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>

          <View style={{ alignItems: 'center', gap: 8, padding: 20 }}>
            <Text style={{ fontSize: 36 }}>{info.icon}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{loc.name}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{loc.province} • {loc.region}</Text>

            <View style={[styles.locDensityBadge, { backgroundColor: info.color + '15', marginTop: 4 }]}>
              <Text style={[styles.locDensityText, { color: info.color }]}>{info.label} Density</Text>
            </View>

            {loc.note && (
              <Text style={[styles.modalNote, { color: colors.textSecondary }]}>{loc.note}</Text>
            )}

            <View style={[styles.coordBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: colors.borderLight }]}>
              <Ionicons name="location" size={14} color="#ef4444" />
              <Text style={[styles.coordText, { color: colors.textTertiary }]}>
                {loc.lat.toFixed(4)}°N, {loc.lng.toFixed(4)}°E
              </Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ════════════════════════════════════════════════
// ─── MAIN MAPPING PAGE ───
// ════════════════════════════════════════════════
export default function MappingPage() {
  const { colors, isDark } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const [search, setSearch] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [showList, setShowList] = useState(false);
  const [filterDensity, setFilterDensity] = useState('all');

  const filteredLocations = useMemo(() => {
    let locs = TALISAY_LOCATIONS;
    if (filterDensity !== 'all') {
      locs = locs.filter(l => l.density === Number(filterDensity));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      locs = locs.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.province.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q)
      );
    }
    return locs;
  }, [search, filterDensity]);

  const mapHTML = useMemo(() => buildMapHTML(TALISAY_LOCATIONS, isDark), [isDark]);

  // Render map based on platform
  const renderMap = () => {
    if (Platform.OS === 'web') {
      // On web, use direct HTML rendering via iframe with srcdoc
      return (
        <View style={styles.mapContainer}>
          <iframe
            srcDoc={mapHTML}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
            title="Talisay Tree Map"
          />
        </View>
      );
    } else {
      // Native: use WebView
      const WebView = require('react-native-webview').default;
      return (
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: mapHTML }}
            style={{ flex: 1, borderRadius: 12 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            scalesPageToFit
            originWhitelist={['*']}
          />
        </View>
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* ─── Page Header ─── */}
      <LinearGradient
        colors={isDark ? ['#2d1b1b', '#0f1318'] : ['#fef2f2', '#fecaca']}
        style={styles.pageHeader}
      >
        <Animated.View entering={FadeInUp.duration(280)} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="map" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Talisay Tree Mapping</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Explore the distribution of Talisay (Terminalia catappa) trees across the Philippine archipelago
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* ─── Stats Row ─── */}
        <Animated.View entering={FadeInUp.delay(100).duration(280)} style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
          <StatBadge icon="location" label="Locations" value={LOCATION_STATS.totalLocations} color="#ef4444" colors={colors} delay={100} />
          <StatBadge icon="map" label="Regions" value={LOCATION_STATS.totalRegions} color="#3b82f6" colors={colors} delay={150} />
          <StatBadge icon="leaf" label="Abundant" value={LOCATION_STATS.abundantLocations} color="#22c55e" colors={colors} delay={200} />
          <StatBadge icon="business" label="Provinces" value={LOCATION_STATS.totalProvinces} color="#f97316" colors={colors} delay={250} />
        </Animated.View>

        {/* ─── Map ─── */}
        <Animated.View entering={FadeInUp.delay(200).duration(280)} style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.mapCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapCardTitle, { color: colors.text }]}>Philippine Talisay Distribution</Text>
              <Text style={[styles.mapCardSub, { color: colors.textSecondary }]}>
                Red pins show known Talisay tree locations • Size indicates density
              </Text>
            </View>
          </View>
          {renderMap()}
        </Animated.View>

        {/* ─── Location List Toggle ─── */}
        <Animated.View entering={FadeInUp.delay(300).duration(280)}>
          <Pressable
            onPress={() => setShowList(!showList)}
            style={[styles.listToggleBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          >
            <Ionicons name={showList ? 'chevron-up' : 'list'} size={18} color={colors.primary} />
            <Text style={[styles.listToggleText, { color: colors.text }]}>
              {showList ? 'Hide Location List' : `View All ${TALISAY_LOCATIONS.length} Locations`}
            </Text>
            <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* ─── Expanded Location List ─── */}
        {showList && (
          <Animated.View entering={FadeIn.duration(280)} style={styles.listSection}>
            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search city, province, or region..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Density Filter */}
            <View style={[styles.filterRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              {[
                { key: 'all', label: `All (${TALISAY_LOCATIONS.length})` },
                { key: '3', label: `Abundant (${LOCATION_STATS.abundantLocations})` },
                { key: '2', label: `Moderate (${LOCATION_STATS.moderateLocations})` },
                { key: '1', label: `Sparse (${LOCATION_STATS.sparseLocations})` },
              ].map(tab => {
                const active = filterDensity === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setFilterDensity(tab.key)}
                    style={[styles.filterBtn, active && { backgroundColor: '#ef4444', ...Shadows.sm }]}
                  >
                    <Text style={[styles.filterBtnText, { color: active ? '#fff' : colors.textSecondary }]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Results count */}
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
            </Text>

            {/* Location Cards */}
            {filteredLocations.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No locations match your search</Text>
              </View>
            ) : (
              <View style={styles.locList}>
                {filteredLocations.map((loc, idx) => (
                  <LocationItem
                    key={loc.name + loc.province}
                    loc={loc}
                    onPress={() => setSelectedLoc(loc)}
                    colors={colors}
                    isDark={isDark}
                    delay={Math.min(idx * 30, 300)}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* ─── Info Section ─── */}
        <Animated.View entering={FadeInUp.delay(350).duration(280)} style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={[styles.infoCardTitle, { color: colors.text }]}>About Talisay Trees in the Philippines</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Talisay (Terminalia catappa), also known as Indian Almond, is one of the most widespread tropical trees in the Philippines.
            Found predominantly in coastal areas and lowland regions, these trees are known for their distinctive large leaves that turn
            brilliant red before dropping, and their edible almond-like kernels that contain 38–65% oil.
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 8 }]}>
            The tree is so culturally significant that at least two Philippine cities — Talisay in Cebu and Talisay in Batangas — are
            named after it. Talisay trees thrive in sandy, saline soil conditions and are commonly found along beaches, parks, and
            roadsides throughout the archipelago, from Batanes to Tawi-Tawi.
          </Text>
        </Animated.View>
      </View>

      <View style={{ height: Spacing.xxxl }} />

      {/* Detail Modal */}
      <LocationModal
        loc={selectedLoc}
        visible={!!selectedLoc}
        onClose={() => setSelectedLoc(null)}
        colors={colors}
        isDark={isDark}
      />
    </ScrollView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },

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

  /* Stats */
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statsRowMobile: { flexWrap: 'wrap' },
  statBadge: {
    flex: 1, minWidth: 70, alignItems: 'center', gap: 4,
    padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },

  /* Map Card */
  mapCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden', ...Shadows.md,
  },
  mapCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, paddingBottom: Spacing.sm,
  },
  mapCardTitle: { fontSize: 16, fontWeight: '700' },
  mapCardSub: { fontSize: 12, marginTop: 2 },
  mapContainer: {
    height: 420,
    ...Platform.select({ web: { height: 500 } }),
    marginHorizontal: 4,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  /* List toggle */
  listToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, ...Shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  listToggleText: { fontSize: 14, fontWeight: '600' },

  /* List Section */
  listSection: { gap: Spacing.sm },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  searchInput: {
    flex: 1, fontSize: 14, paddingVertical: 4,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  /* Filter */
  filterRow: {
    flexDirection: 'row', gap: 3, padding: 3,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    flexWrap: 'wrap',
  },
  filterBtn: {
    flex: 1, minWidth: 60, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, paddingHorizontal: 4, borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  filterBtnText: { fontSize: 11, fontWeight: '600' },
  resultCount: { fontSize: 12, fontWeight: '500' },

  /* Location list */
  locList: { gap: 6 },
  locItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  locDensityDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  locName: { fontSize: 14, fontWeight: '600' },
  locProvince: { fontSize: 11, marginTop: 1 },
  locDensityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  locDensityText: { fontSize: 10, fontWeight: '700' },

  /* Empty */
  emptyBox: {
    alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  emptyText: { fontSize: 13 },

  /* Info Card */
  infoCard: {
    padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.sm,
    ...Shadows.sm,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoCardTitle: { fontSize: 15, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },

  /* Modal */
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  modalBox: {
    width: '100%', maxWidth: 360,
    borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.lg,
  },
  modalClose: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    padding: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalSub: { fontSize: 13 },
  modalNote: { fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
  coordBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    marginTop: 4,
  },
  coordText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
