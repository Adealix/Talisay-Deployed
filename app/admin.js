/**
 * Talisay AI — Admin Dashboard & Analytics
 * Comprehensive interactive dashboard with real-time data from ML models,
 * scientific Terminalia catappa data, and system metrics.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import StatsCard from '../components/Cards/StatsCard';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { fetchAnalyticsOverview, fetchUsers, fetchAllHistory, updateUser, toggleUserStatus, deleteHistory } from '../services/analyticsService';
import {
  generateCategoryCSV,
  generateOverallCSV,
  generateCategoryPDF,
  generateOverallPDF,
  downloadFile,
  downloadPDF,
} from '../services/reportService';
import {
  OIL_YIELD_DATA,
  SEED_TO_OIL,
  NUTRITIONAL_DATA,
  FATTY_ACID_PROFILE,
  DIMENSION_RANGES,
  CORRELATION_FACTORS,
  MODEL_ARCHITECTURE,
  BOTANICAL_INFO,
  SCIENCE_SUMMARY,
} from '../data/talisayScience';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ═══════════════════════════════════════════════════
   CATEGORY COLOR MAP
   ═══════════════════════════════════════════════════ */
const CAT_COLORS = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  BROWN: '#a16207',
};
const CAT_LABELS = {
  GREEN: 'Green / Immature',
  YELLOW: 'Yellow / Mature',
  BROWN: 'Brown / Overripe',
};

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function pct(v, d = 1) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(d)}%`;
}
function num(v, d = 1) {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toFixed(d) : String(v);
}
function fmtCount(n) {
  if (n == null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════
   TAB SELECTOR
   ═══════════════════════════════════════════════════ */
function TabBar({ tabs, selected, onSelect, colors }) {
  return (
    <View style={s.tabBar}>
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onSelect(t.key)}
          style={[
            s.tabItem,
            {
              backgroundColor: selected === t.key ? colors.primary + '18' : 'transparent',
              borderColor: selected === t.key ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={t.icon}
            size={16}
            color={selected === t.key ? colors.primary : colors.textTertiary}
          />
          <Text
            style={[
              s.tabLabel,
              { color: selected === t.key ? colors.primary : colors.textSecondary },
            ]}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   CARD WRAPPER
   ═══════════════════════════════════════════════════ */
function Card({ children, colors, delay = 0, style }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(280)}
      style={[
        s.card,
        { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.md },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function CardTitle({ icon, title, subtitle, colors, right }) {
  return (
    <View style={s.cardHeader}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {icon && (
            <View style={[s.cardTitleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name={icon} size={16} color={colors.primary} />
            </View>
          )}
          <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   INTERACTIVE BAR CHART
   ═══════════════════════════════════════════════════ */
function BarChart({ data, maxVal, colors, barColor, labelKey = 'label', valueKey = 'value', height = 160, showValues = true }) {
  const [hovered, setHovered] = useState(null);
  const max = maxVal || Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <View style={[s.barChartWrap, { height: height + 46 }]}>
      <View style={[s.barChartInner, { height }]}>
        {data.map((item, idx) => {
          const h = ((item[valueKey] || 0) / max) * height;
          const isHov = hovered === idx;
          const bg = item.color || barColor || colors.primary;
          return (
            <Pressable
              key={idx}
              onPressIn={() => setHovered(idx)}
              onPressOut={() => setHovered(null)}
              onHoverIn={() => setHovered(idx)}
              onHoverOut={() => setHovered(null)}
              style={s.barCol}
            >
              {(showValues || isHov) && (
                <Text style={[s.barVal, { color: isHov ? bg : colors.textTertiary }]}>
                  {item[valueKey] != null ? (typeof item[valueKey] === 'number' && item[valueKey] % 1 !== 0 ? item[valueKey].toFixed(1) : item[valueKey]) : ''}
                </Text>
              )}
              <View style={[s.barTrack, { backgroundColor: colors.borderLight, height }]}>
                <Animated.View
                  entering={FadeInUp.delay(200 + idx * 40).duration(280)}
                  style={[
                    s.barFill,
                    { height: h, backgroundColor: bg, opacity: isHov ? 1 : 0.8 },
                  ]}
                />
              </View>
              <Text
                style={[s.barLbl, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {item[labelKey] || ''}
              </Text>
              {/* Tooltip */}
              {isHov && (
                <View style={[s.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.tooltipTitle, { color: colors.text }]}>{item[labelKey]}</Text>
                  <Text style={[s.tooltipVal, { color: bg }]}>{item[valueKey]}</Text>
                  {item.detail && <Text style={[s.tooltipDetail, { color: colors.textSecondary }]}>{item.detail}</Text>}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   PIE CHART — circular, works on native + web
   Native: border-arc segments (thick-border circle rotated around own center)
   Web: conic-gradient
   ═══════════════════════════════════════════════════ */
function DonutChart({ data, colors, height = 180, labelKey = 'label', valueKey = 'value' }) {
  const total = data.reduce((sum, d) => sum + (d[valueKey] || 0), 0);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const segments = data.map((item, idx) => ({
    ...item,
    pctVal: total > 0 ? (item[valueKey] || 0) / total : 0,
    idx,
  })).filter(s => s.pctVal > 0);

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
        <Text style={{ ...Typography.small, color: colors.textTertiary }}>No data available</Text>
      </View>
    );
  }

  const PIE_SIZE = 160;
  const HALF = PIE_SIZE / 2;
  const INNER = 56; // donut hole diameter
  const isWeb = Platform.OS === 'web';

  // Build cumulative start/end degrees
  let cumPct = 0;
  const arcSegments = segments.map(seg => {
    const start = cumPct * 360;
    const end = (cumPct + seg.pctVal) * 360;
    cumPct += seg.pctVal;
    return { ...seg, startDeg: start, endDeg: end, sweepDeg: seg.pctVal * 360 };
  });

  // Web: conic-gradient
  const conicGradient = isWeb
    ? `conic-gradient(${arcSegments.map(s => `${s.color || colors.primary} ${s.startDeg.toFixed(1)}deg ${s.endDeg.toFixed(1)}deg`).join(', ')})`
    : null;

  // Native: border-arc technique.
  // A "quarter arc" is a PIE_SIZE×PIE_SIZE View with borderRadius=HALF, borderWidth=HALF.
  // When borderTopColor+borderRightColor = segment color, borderBottomColor+borderLeftColor = transparent,
  // it fills the top-right quadrant. Rotating the whole circle View around its OWN center
  // (which is its default pivot in RN) correctly sweeps a 90° arc into any position.
  // For segments > 90°: we stack multiple 90° arcs, each at startDeg + 90*n.
  // For a partial last arc (< 90°): we use a clip container approach to cut it.
  //
  // Simpler and equally reliable: render a solid colored circle for each segment
  // using overflow:hidden clip on a half-width rect that's positioned at the segment's start angle.
  // BUT the cleanest approach for RN that NEVER needs transformOrigin is:
  // Render ALL filled arcs as a flat stacked list of border-colored circle outlines
  // at the correct rotation — each naturally pivoting around its center = pie center.

  // For each segment, break into ≤90° sub-arcs, each rendered as a colored quarter-circle border.
  function NativePieSegments() {
    const views = [];
    arcSegments.forEach((seg, si) => {
      const col = seg.color || colors.primary;
      const opacity = hoveredIdx === seg.idx ? 1 : 0.88;
      let remaining = seg.sweepDeg;
      let currentAngle = seg.startDeg;

      while (remaining > 0.5) {
        const chunk = Math.min(90, remaining);
        // A circle view with borderWidth = HALF fills as a thick ring.
        // We color 1 or 2 borders to show a quadrant (max 90° chunk).
        // The view is rotated by currentAngle around its own center.
        // borderTopColor fills the top-right visible quadrant by default.
        // We always use top+right for "the visible arc chunk" and rotate it into position.
        const fraction = chunk / 90; // 0..1 within this quarter
        views.push(
          <View
            key={`${si}-${currentAngle}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: PIE_SIZE,
              height: PIE_SIZE,
              borderRadius: HALF,
              borderWidth: HALF,
              borderTopColor: col,
              borderRightColor: fraction > 0.5 ? col : 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              opacity,
              transform: [{ rotate: `${currentAngle - 45}deg` }],
            }}
          />
        );
        currentAngle += chunk;
        remaining -= chunk;
      }
    });

    return <>{views}</>;
  }

  return (
    <View style={{ paddingVertical: Spacing.sm, alignItems: 'center' }}>
      {/* ── Circular pie ── */}
      <Pressable
        onPressIn={() => {}}
        onPressOut={() => setHoveredIdx(null)}
        style={{ width: PIE_SIZE, height: PIE_SIZE, marginBottom: Spacing.md }}
      >
        {isWeb ? (
          <View style={{
            width: PIE_SIZE, height: PIE_SIZE, borderRadius: HALF,
            // @ts-ignore web-only
            background: conicGradient,
          }} />
        ) : (
          // Background circle (fills the full pie area with the last segment's color to avoid gaps)
          <View style={{ position: 'absolute', width: PIE_SIZE, height: PIE_SIZE, borderRadius: HALF,
            backgroundColor: arcSegments.length > 0 ? (arcSegments[arcSegments.length - 1].color || colors.primary) + 'CC' : colors.borderLight }}
          >
            <NativePieSegments />
          </View>
        )}
        {/* Donut hole */}
        <View style={{
          position: 'absolute',
          top: (PIE_SIZE - INNER) / 2, left: (PIE_SIZE - INNER) / 2,
          width: INNER, height: INNER,
          borderRadius: INNER / 2,
          backgroundColor: colors.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ ...Typography.h3, color: colors.text, fontWeight: '800', fontSize: 17, lineHeight: 20 }}>{total}</Text>
          <Text style={{ ...Typography.tiny, color: colors.textTertiary, fontSize: 9 }}>total</Text>
        </View>
      </Pressable>

      {/* ── Legend ── */}
      <View style={{ gap: Spacing.xs, width: '100%' }}>
        {segments.map((seg, idx) => {
          const isHov = hoveredIdx === seg.idx;
          return (
            <Pressable
              key={idx}
              onPressIn={() => setHoveredIdx(seg.idx)}
              onPressOut={() => setHoveredIdx(null)}
              onHoverIn={() => setHoveredIdx(seg.idx)}
              onHoverOut={() => setHoveredIdx(null)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                paddingVertical: 4, paddingHorizontal: 8,
                borderRadius: BorderRadius.sm,
                backgroundColor: isHov ? (seg.color || colors.primary) + '18' : 'transparent',
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color || colors.primary }} />
              <Text style={{ ...Typography.small, color: colors.textSecondary, flex: 1 }}>
                {seg[labelKey]}
              </Text>
              <Text style={{ ...Typography.captionMedium, color: seg.color || colors.primary, fontWeight: '700' }}>
                {seg[valueKey]}
              </Text>
              <Text style={{ ...Typography.tiny, color: colors.textTertiary, minWidth: 38, textAlign: 'right' }}>
                {(seg.pctVal * 100).toFixed(1)}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   LINE CHART (React Native — pixel-accurate, with Y-axis labels)
   ═══════════════════════════════════════════════════ */
const Y_AXIS_WIDTH = 38; // pixels reserved for Y-axis labels
const Y_TICKS = 5;       // number of horizontal grid lines / labels

function LineChart({ data, colors, barColor, labelKey = 'label', valueKey = 'value', height = 160, showValues = true }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const [hovered, setHovered] = useState(null);
  const [chartAreaWidth, setChartAreaWidth] = useState(0);

  const onChartLayout = (e) => setChartAreaWidth(e.nativeEvent.layout.width);

  // Compute dot positions in pixels once we have a real chart area width
  const points = chartAreaWidth > 0 && data.length > 0
    ? data.map((item, idx) => ({
        x: data.length > 1 ? (idx / (data.length - 1)) * chartAreaWidth : chartAreaWidth / 2,
        y: height - ((item[valueKey] || 0) / max) * (height - 12),
        item,
        idx,
      }))
    : [];

  // Y-axis tick values: 0, 25%, 50%, 75%, 100% of max
  const yTickVals = Array.from({ length: Y_TICKS }, (_, i) => {
    const raw = (max * i) / (Y_TICKS - 1);
    return raw >= 10 ? Math.round(raw) : parseFloat(raw.toFixed(1));
  });

  return (
    <View style={{ marginTop: Spacing.sm }}>
      {/* Chart body: Y-axis column + chart area */}
      <View style={{ flexDirection: 'row' }}>
        {/* ── Y-axis labels column ── */}
        <View style={{ width: Y_AXIS_WIDTH, height, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
          {[...yTickVals].reverse().map((val, i) => (
            <Text key={i} style={{ ...Typography.tiny, color: colors.textTertiary, fontSize: 9, lineHeight: 12 }}>
              {val}
            </Text>
          ))}
        </View>

        {/* ── Chart area ── */}
        <View
          style={{ flex: 1, height, position: 'relative' }}
          onLayout={onChartLayout}
        >
          {/* Horizontal grid lines */}
          {yTickVals.map((val, i) => {
            const yPos = height - (val / max) * (height - 12);
            return (
              <View key={i} style={{
                position: 'absolute', left: 0, right: 0,
                top: yPos,
                borderBottomWidth: 1,
                borderBottomColor: i === 0 ? colors.border : colors.borderLight,
                borderStyle: i === 0 ? 'solid' : 'dashed',
              }} />
            );
          })}

          {chartAreaWidth > 0 && (
            <>
              {/* Connecting line segments */}
              {points.slice(0, -1).map((pt, idx) => {
                const next = points[idx + 1];
                const dx = next.x - pt.x;
                const dy = next.y - pt.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const bg = pt.item.color || barColor || colors.primary;
                return (
                  <Animated.View
                    key={`seg-${idx}`}
                    entering={FadeIn.delay(300 + idx * 60).duration(280)}
                    style={{
                      position: 'absolute',
                      left: pt.x,
                      top: pt.y - 1,
                      width: len,
                      height: 2,
                      backgroundColor: bg,
                      opacity: 0.65,
                      transformOrigin: 'left center',
                      transform: [{ rotate: `${angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Dots + tooltips */}
              {points.map((pt, idx) => {
                const bg = pt.item.color || barColor || colors.primary;
                const isHov = hovered === idx;
                return (
                  <Pressable
                    key={idx}
                    onPressIn={() => setHovered(idx)}
                    onPressOut={() => setHovered(null)}
                    onHoverIn={() => setHovered(idx)}
                    onHoverOut={() => setHovered(null)}
                    style={{
                      position: 'absolute',
                      left: pt.x - 8,
                      top: pt.y - 8,
                      width: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                    }}
                  >
                    <Animated.View
                      entering={ZoomIn.delay(200 + idx * 60).duration(280)}
                      style={{
                        width: isHov ? 14 : 10,
                        height: isHov ? 14 : 10,
                        borderRadius: 7,
                        backgroundColor: bg,
                        borderWidth: 2,
                        borderColor: colors.card,
                        ...Shadows.sm,
                      }}
                    />
                    {/* Hover tooltip */}
                    {isHov && (
                      <View style={[
                        s.tooltip,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          top: -52,
                          left: -20,
                          minWidth: 80,
                        }
                      ]}>
                        <Text style={[s.tooltipTitle, { color: colors.text }]}>{pt.item[labelKey]}</Text>
                        <Text style={[s.tooltipVal, { color: bg }]}>{pt.item[valueKey]}</Text>
                        {pt.item.detail && <Text style={[s.tooltipDetail, { color: colors.textSecondary }]}>{pt.item.detail}</Text>}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* X-axis baseline */}
      <View style={{ flexDirection: 'row', marginLeft: Y_AXIS_WIDTH }}>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border }} />
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', marginTop: 4, marginLeft: Y_AXIS_WIDTH }}>
        {data.map((item, idx) => (
          <Text
            key={idx}
            style={{ ...Typography.tiny, color: colors.textTertiary, textAlign: 'center', flex: 1, fontSize: 9 }}
            numberOfLines={1}
          >
            {item[labelKey] || ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   CHART TYPE TOGGLE (Bar / Line / Donut)
   ═══════════════════════════════════════════════════ */
function ChartTypeToggle({ activeType, onChangeType, colors, types = ['bar', 'line', 'donut'] }) {
  const icons = { bar: 'bar-chart', line: 'trending-up', donut: 'pie-chart' };
  const tooltips = { bar: 'Bar', line: 'Line', donut: 'Pie' };
  return (
    <View style={{ flexDirection: 'row', gap: 2, flexShrink: 0 }}>
      {types.map(type => {
        const active = activeType === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChangeType(type)}
            accessibilityLabel={tooltips[type] + ' chart'}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: BorderRadius.full,
              backgroundColor: active ? colors.primary + '20' : 'transparent',
              borderWidth: 1,
              borderColor: active ? colors.primary + '50' : colors.borderLight,
            }}
          >
            <Ionicons name={icons[type]} size={12} color={active ? colors.primary : colors.textTertiary} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   HORIZONTAL PROGRESS BAR
   ═══════════════════════════════════════════════════ */
function ProgressBar({ label, value, maxValue = 100, color, colors, suffix = '%', delay = 0 }) {
  const pctW = Math.min((value / maxValue) * 100, 100);
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={s.progressRow}>
      <View style={s.progressLabelRow}>
        <Text style={[s.progressLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.progressValue, { color: colors.text }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}{suffix}
        </Text>
      </View>
      <View style={[s.progressTrack, { backgroundColor: colors.borderLight }]}>
        <Animated.View
          entering={FadeIn.delay(delay + 100)}
          style={[s.progressFill, { width: `${pctW}%`, backgroundColor: color }]}
        />
      </View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════
   CONFIDENCE METER (circular-ish gauge)
   ═══════════════════════════════════════════════════ */
function ConfidenceGauge({ label, value, colors, color, size = 80 }) {
  const angle = (value || 0) * 360;
  const displayVal = value != null ? `${(value * 100).toFixed(1)}%` : '—';
  return (
    <View style={[s.gaugeWrap, { width: size + 20 }]}>
      <View style={[s.gaugeOuter, { width: size, height: size, borderColor: colors.borderLight }]}>
        <View style={[s.gaugeInner, { backgroundColor: (color || colors.primary) + '15' }]}>
          <Text style={[s.gaugeVal, { color: color || colors.primary, fontSize: size * 0.18 }]}>{displayVal}</Text>
        </View>
        {/* Arc indicator */}
        <View style={[s.gaugeArc, {
          borderColor: color || colors.primary,
          borderTopColor: 'transparent',
          borderRightColor: angle > 90 ? (color || colors.primary) : 'transparent',
          borderBottomColor: angle > 180 ? (color || colors.primary) : 'transparent',
          borderLeftColor: angle > 270 ? (color || colors.primary) : 'transparent',
          transform: [{ rotate: '-45deg' }],
          width: size, height: size,
        }]} />
      </View>
      <Text style={[s.gaugeLbl, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   MINI STAT ROW
   ═══════════════════════════════════════════════════ */
function StatRow({ icon, label, value, color, colors, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.statRow, Platform.OS === 'web' && { cursor: onPress ? 'pointer' : 'default' }]}>
      <View style={[s.statRowIcon, { backgroundColor: (color || colors.primary) + '12' }]}>
        <Ionicons name={icon} size={14} color={color || colors.primary} />
      </View>
      <Text style={[s.statRowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.statRowValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════════ */
function SectionHeader({ icon, title, colors, delay = 0 }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════
   REPORTS TAB (Export CSV / PDF)
   ═══════════════════════════════════════════════════ */
const REPORT_TYPES = [
  { key: 'overall', label: 'Overall Report', icon: 'albums', desc: 'All categories combined — comprehensive system report', color: '#3b82f6' },
  { key: 'GREEN', label: 'Green / Immature', icon: 'leaf', desc: 'Analysis of Green (immature) Talisay fruit scans', color: '#22c55e' },
  { key: 'YELLOW', label: 'Yellow / Mature', icon: 'sunny', desc: 'Analysis of Yellow (mature) Talisay fruit scans', color: '#eab308' },
  { key: 'BROWN', label: 'Brown / Overripe', icon: 'cafe', desc: 'Analysis of Brown (overripe) Talisay fruit scans', color: '#a16207' },
];

function ReportsTab({ historyItems, analytics, users, colors, isMobile }) {
  const [selectedType, setSelectedType] = useState('overall');
  const [generating, setGenerating] = useState(false);

  const scanCount = (key) => {
    if (key === 'overall') return historyItems?.length || 0;
    return historyItems?.filter(h => h.category === key).length || 0;
  };

  const handleExport = async (format) => {
    if (!historyItems || !analytics) {
      Alert.alert('No Data', 'Analytics data has not loaded yet. Please refresh and try again.');
      return;
    }
    setGenerating(true);
    try {
      const ts = new Date().toISOString().slice(0, 10);
      if (selectedType === 'overall') {
        if (format === 'csv') {
          const csv = generateOverallCSV(historyItems, analytics, users || []);
          await downloadFile(csv, `Talisay_AI_Overall_Report_${ts}.csv`, 'text/csv;charset=utf-8;');
        } else {
          const doc = await generateOverallPDF(historyItems, analytics, users || []);
          await downloadPDF(doc, `Talisay_AI_Overall_Report_${ts}.pdf`);
        }
      } else {
        const catLabel = selectedType.charAt(0) + selectedType.slice(1).toLowerCase();
        if (format === 'csv') {
          const csv = generateCategoryCSV(selectedType, historyItems, analytics);
          await downloadFile(csv, `Talisay_AI_${catLabel}_Report_${ts}.csv`, 'text/csv;charset=utf-8;');
        } else {
          const doc = await generateCategoryPDF(selectedType, historyItems, analytics);
          await downloadPDF(doc, `Talisay_AI_${catLabel}_Report_${ts}.pdf`);
        }
      }
    } catch (err) {
      console.error('Report generation error:', err);
      Alert.alert('Export Error', `Failed to generate report: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const sel = REPORT_TYPES.find(r => r.key === selectedType);

  return (
    <View>
      <SectionHeader icon="document-text" title="Export Reports" colors={colors} />

      {/* ── Report Type Selector ── */}
      <Card colors={colors} delay={100}>
        <CardTitle icon="albums" title="Select Report Type" subtitle="Choose which data to include in your export" colors={colors} />
        <View style={rptStyles.typeGrid}>
          {REPORT_TYPES.map((rt, idx) => {
            const active = selectedType === rt.key;
            return (
              <AnimatedPressable
                key={rt.key}
                entering={FadeInUp.delay(150 + idx * 60).duration(280)}
                onPress={() => setSelectedType(rt.key)}
                style={[
                  rptStyles.typeCard,
                  {
                    backgroundColor: active ? rt.color + '15' : colors.card,
                    borderColor: active ? rt.color : colors.divider,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <View style={[rptStyles.typeIconWrap, { backgroundColor: rt.color + '20' }]}>
                  <Ionicons name={rt.icon} size={22} color={rt.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[rptStyles.typeLabel, { color: active ? rt.color : colors.text }]}>{rt.label}</Text>
                  <Text style={[rptStyles.typeDesc, { color: colors.textTertiary }]}>{rt.desc}</Text>
                </View>
                <View style={[rptStyles.scanBadge, { backgroundColor: rt.color + '15' }]}>
                  <Text style={[rptStyles.scanBadgeText, { color: rt.color }]}>{scanCount(rt.key)}</Text>
                  <Text style={[rptStyles.scanBadgeLabel, { color: rt.color }]}>scans</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={rt.color} style={{ marginLeft: 4 }} />
                )}
              </AnimatedPressable>
            );
          })}
        </View>
      </Card>

      {/* ── Report Preview & Export Buttons ── */}
      <Card colors={colors} delay={250}>
        <CardTitle icon="download" title="Generate & Download" subtitle={`${sel?.label} — ${scanCount(selectedType)} scan record(s)`} colors={colors} />

        {/* Preview summary */}
        <View style={[rptStyles.previewBox, { backgroundColor: colors.background, borderColor: colors.divider }]}>
          <Text style={[rptStyles.previewTitle, { color: colors.text }]}>Report Contents Preview</Text>
          <View style={{ gap: 6, marginTop: 8 }}>
            {(selectedType === 'overall'
              ? [
                  'Executive Summary',
                  'System Overview & User Statistics',
                  'Maturity Category Distribution',
                  'Oil Yield Analysis by Category',
                  'Model Confidence Metrics',
                  'Physical Dimension Statistics',
                  'Detection Quality Indicators',
                  'Kernel Nutritional Composition',
                  'Fatty Acid Profile',
                  'Seed-to-Oil Extraction Data',
                  'Registered Users List',
                  'Research References',
                ]
              : [
                  'Executive Summary',
                  'Oil Yield Statistics',
                  'Physical Dimension Statistics',
                  'Model Confidence Metrics',
                  'Quality Indicators (Spots & Coin Detection)',
                  'Detailed Scan Records',
                ]
            ).map((item, idx) => (
              <View key={idx} style={rptStyles.previewItem}>
                <Ionicons name="checkmark" size={14} color={sel?.color || colors.primary} />
                <Text style={[rptStyles.previewItemText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Header note */}
        <View style={[rptStyles.headerNote, { backgroundColor: (sel?.color || '#3b82f6') + '08', borderColor: (sel?.color || '#3b82f6') + '20' }]}>
          <Ionicons name="school" size={16} color={sel?.color || '#3b82f6'} />
          <Text style={[rptStyles.headerNoteText, { color: colors.textSecondary }]}>
            PDF reports include the official TUP Taguig institutional header and formal formatting.
          </Text>
        </View>

        {/* Export buttons */}
        <View style={[rptStyles.exportRow, isMobile && rptStyles.exportRowMobile]}>
          <Pressable
            onPress={() => handleExport('csv')}
            disabled={generating}
            style={({ pressed }) => [
              rptStyles.exportBtn,
              { backgroundColor: pressed ? '#059669' : '#10b981', opacity: generating ? 0.5 : 1 },
            ]}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="grid" size={18} color="#fff" />
            )}
            <View>
              <Text style={rptStyles.exportBtnTitle}>Export as CSV</Text>
              <Text style={rptStyles.exportBtnSub}>Spreadsheet-compatible format</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#fff" style={{ marginLeft: 'auto' }} />
          </Pressable>

          <Pressable
            onPress={() => handleExport('pdf')}
            disabled={generating}
            style={({ pressed }) => [
              rptStyles.exportBtn,
              { backgroundColor: pressed ? '#dc2626' : '#ef4444', opacity: generating ? 0.5 : 1 },
            ]}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="document" size={18} color="#fff" />
            )}
            <View>
              <Text style={rptStyles.exportBtnTitle}>Export as PDF</Text>
              <Text style={rptStyles.exportBtnSub}>Formal document with TUP header</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#fff" style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>
      </Card>

      {/* ── Format Info ── */}
      <Card colors={colors} delay={350}>
        <CardTitle icon="information-circle" title="Report Format Guide" subtitle="Choosing the right format" colors={colors} />
        <View style={rptStyles.formatGrid}>
          <View style={[rptStyles.formatCard, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '25' }]}>
            <View style={[rptStyles.formatIconWrap, { backgroundColor: '#10b981' + '20' }]}>
              <Ionicons name="grid" size={20} color="#10b981" />
            </View>
            <Text style={[rptStyles.formatName, { color: colors.text }]}>CSV Format</Text>
            <View style={{ gap: 3, marginTop: 4 }}>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Opens in Excel / Google Sheets</Text>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Ideal for data analysis & filtering</Text>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Raw tabular data with summaries</Text>
            </View>
          </View>
          <View style={[rptStyles.formatCard, { backgroundColor: '#ef4444' + '10', borderColor: '#ef4444' + '25' }]}>
            <View style={[rptStyles.formatIconWrap, { backgroundColor: '#ef4444' + '20' }]}>
              <Ionicons name="document" size={20} color="#ef4444" />
            </View>
            <Text style={[rptStyles.formatName, { color: colors.text }]}>PDF Format</Text>
            <View style={{ gap: 3, marginTop: 4 }}>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Formal institutional document</Text>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Includes TUP letterhead header</Text>
              <Text style={[rptStyles.formatDetail, { color: colors.textTertiary }]}>• Print-ready & presentable</Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );
}

const rptStyles = StyleSheet.create({
  typeGrid: { gap: Spacing.sm },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  typeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { ...Typography.captionMedium, fontWeight: '700' },
  typeDesc: { ...Typography.small },
  scanBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  scanBadgeText: { ...Typography.bodyMedium, fontWeight: '700' },
  scanBadgeLabel: { ...Typography.tiny },
  previewBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  previewTitle: { ...Typography.captionMedium, fontWeight: '700' },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewItemText: { ...Typography.small },
  headerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  headerNoteText: { ...Typography.small, flex: 1 },
  exportRow: { flexDirection: 'row', gap: Spacing.md },
  exportRowMobile: { flexDirection: 'column' },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.md,
  },
  exportBtnTitle: { ...Typography.captionMedium, color: '#fff', fontWeight: '700' },
  exportBtnSub: { ...Typography.tiny, color: 'rgba(255,255,255,0.8)' },
  formatGrid: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  formatCard: {
    flex: 1,
    minWidth: 200,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  formatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  formatName: { ...Typography.captionMedium, fontWeight: '700' },
  formatDetail: { ...Typography.small },
});

/* ═══════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════ */
export default function AdminPage() {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCard, setExpandedCard] = useState(null);

  // Users & History DataTable state
  const [users, setUsers] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'user'|'history', id, label, isActive }
  const [deactivateReason, setDeactivateReason] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'donut'
  // Per-card chart types for Analytics tab
  const [chartTypeMonthly, setChartTypeMonthly] = useState('bar');
  const [chartTypeColor, setChartTypeColor] = useState('donut');
  const [chartTypeConf, setChartTypeConf] = useState('bar');
  const [chartTypeDaily, setChartTypeDaily] = useState('line');
  const [chartTypeOilYield, setChartTypeOilYield] = useState('bar');
  const [selectedUser, setSelectedUser] = useState(null); // User Details modal on mobile
  const [mobileEditUserOpen, setMobileEditUserOpen] = useState(false); // Edit User modal on mobile
  const [selectedHistory, setSelectedHistory] = useState(null); // detail modal for history on mobile

  // Route protection: only admin users can access this page
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const loadData = useCallback(async (signal) => {
    try {
      const data = await fetchAnalyticsOverview({ signal });
      // Don't update state if the request was aborted (component unmounted)
      if (signal?.aborted) return;
      if (data) setAnalytics(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Failed to load analytics:', e);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [isAdmin, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(); // no signal needed for manual refresh — user expects it to complete
  }, [loadData]);

  // ─── Load users ───
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ─── Load history ───
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchAllHistory(200);
      setHistoryItems(data || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load users/history when those tabs are selected
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users' && users.length === 0) loadUsers();
    if (activeTab === 'history' && historyItems.length === 0) loadHistory();
    if (activeTab === 'reports') {
      if (users.length === 0) loadUsers();
      if (historyItems.length === 0) loadHistory();
    }
  }, [activeTab, isAdmin]);

  // ─── User CRUD handlers ───
  const handleUpdateUser = useCallback(async (overrideUser) => {
    const targetUser = overrideUser || editingUser;
    if (!targetUser) return;
    const result = await updateUser(targetUser.id, editForm);
    if (result.ok) {
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, ...editForm } : u));
      setEditingUser(null);
      setSelectedUser(null);
      setEditForm({});
    } else {
      if (Platform.OS === 'web') {
        window.alert(result.error === 'cannot_change_own_role' ? 'Cannot change your own role' : 'Failed to update user');
      } else {
        Alert.alert('Error', result.error === 'cannot_change_own_role' ? 'Cannot change your own role' : 'Failed to update user');
      }
    }
  }, [editingUser, editForm]);

  const handleToggleUserStatus = useCallback(async (userId, newActive, reason = '') => {
    const result = await toggleUserStatus(userId, newActive, reason);
    if (result.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...result.user } : u));
      setConfirmDelete(null);
      setDeactivateReason('');
    } else {
      const msg = result.error === 'cannot_deactivate_self' ? 'Cannot deactivate your own account' : 'Failed to update user status';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      setConfirmDelete(null);
      setDeactivateReason('');
    }
  }, []);

  const handleDeleteHistory = useCallback(async (historyId) => {
    const result = await deleteHistory(historyId);
    if (result.ok) {
      setHistoryItems(prev => prev.filter(h => h.id !== historyId));
      setConfirmDelete(null);
    } else {
      if (Platform.OS === 'web') window.alert('Failed to delete history record');
      else Alert.alert('Error', 'Failed to delete history record');
      setConfirmDelete(null);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && !loading) {
      router.replace('/');
    }
  }, [isAdmin, loading]);

  if (!isAdmin) {
    return (
      <View style={[s.loadingWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={48} color={colors.textTertiary} />
        <Text style={[s.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>Admin access required</Text>
      </View>
    );
  }

  // ─── Derived data from analytics ───
  const ov = analytics?.overview || {};
  const catDist = analytics?.categoryDistribution || {};
  const totalScans = ov.totalHistory || 0;
  const greenCount = catDist.GREEN || 0;
  const yellowCount = catDist.YELLOW || 0;
  const brownCount = catDist.BROWN || 0;
  const conf = analytics?.confidenceStats || {};
  const yieldData = analytics?.avgYieldByCategory || {};
  const yieldOverall = analytics?.avgYieldOverall || {};
  const dimStats = analytics?.dimensionStats || {};
  const coinDet = analytics?.coinDetection || {};
  const spots = analytics?.spotStats || {};
  const confDist = analytics?.confidenceDistribution || [];
  const colorProbs = analytics?.colorProbabilityAvgs || {};
  const wAccuracy = analytics?.weightedAccuracy || 0;
  const monthly = analytics?.monthlyTrend || [];
  const daily = analytics?.dailyActivity || [];
  const detection = analytics?.detectionTrend || [];
  const recent = analytics?.recentActivity || [];
  const userAct = analytics?.userActivity || [];

  const TABS = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
    { key: 'users', label: 'Users', icon: 'people' },
    { key: 'history', label: 'History', icon: 'time' },
    { key: 'model', label: 'AI Model', icon: 'hardware-chip' },
    { key: 'science', label: 'Science', icon: 'flask' },
    { key: 'reports', label: 'Reports', icon: 'document-text' },
  ];

  if (loading) {
    return (
      <View style={[s.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading analytics…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ═══ PAGE HEADER ═══ */}
      <LinearGradient
        colors={isDark ? ['#1a2b1f', '#0f1a12'] : ['#f0fdf4', '#ecfdf5']}
        style={s.pageHeader}
      >
        <Animated.View entering={FadeInUp.duration(280)} style={[s.headerContent, isDesktop && s.headerContentDesktop]}>
          <View style={[s.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="analytics" size={28} color={colors.primary} />
          </View>
          <Text style={[s.pageTitle, { color: colors.text }]}>Admin Dashboard & Analytics</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>
            Terminalia catappa analysis platform — real-time ML performance, fruit maturity,{'\n'}oil yield analytics, and scientific reference data
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[s.content, isDesktop && s.contentDesktop]}>

        {/* ═══ TAB BAR ═══ */}
        <TabBar tabs={TABS} selected={activeTab} onSelect={setActiveTab} colors={colors} />

        {/* ═══════════════════════════
            TAB: OVERVIEW
            ═══════════════════════════ */}
        {activeTab === 'overview' && (
          <View>
            {/* ── Top Stats Grid ── */}
            <View style={[s.statsGrid, isMobile && s.statsGridMobile]}>
              <StatsCard icon="scan" label="Total Scans" value={fmtCount(totalScans)} color="#3b82f6" delay={100} />
              <StatsCard icon="people" label="Total Users" value={fmtCount(ov.totalUsers)} color="#7c3aed" delay={180} />
              <StatsCard icon="today" label="Scans Today" value={fmtCount(ov.scansToday)} color="#22c55e" delay={260} />
              <StatsCard icon="calendar" label="This Week" value={fmtCount(ov.scansThisWeek)} color="#f97316" delay={340} />
            </View>

            {/* ── Maturity Distribution ── */}
            <Card colors={colors} delay={200}>
              <CardTitle icon="color-palette" title="Fruit Maturity Distribution" subtitle="Total detections by color stage" colors={colors} />
              <View style={s.maturityGrid}>
                {['GREEN', 'YELLOW', 'BROWN'].map((cat, idx) => {
                  const count = catDist[cat] || 0;
                  const pctVal = totalScans > 0 ? ((count / totalScans) * 100).toFixed(1) : '0';
                  return (
                    <Animated.View
                      key={cat}
                      entering={FadeInUp.delay(300 + idx * 80).duration(280)}
                      style={[s.maturityItem, { borderColor: CAT_COLORS[cat] + '30' }]}
                    >
                      <View style={[s.maturityDot, { backgroundColor: CAT_COLORS[cat] }]} />
                      <Text style={[s.maturityLabel, { color: colors.textSecondary }]}>{CAT_LABELS[cat]}</Text>
                      <Text style={[s.maturityCount, { color: colors.text }]}>{count}</Text>
                      <Text style={[s.maturityPct, { color: CAT_COLORS[cat] }]}>{pctVal}%</Text>
                      <View style={[s.maturityBar, { backgroundColor: colors.borderLight }]}>
                        <View style={[s.maturityBarFill, { width: `${pctVal}%`, backgroundColor: CAT_COLORS[cat] }]} />
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </Card>

            {/* ── High Yield vs Low Yield ── */}
            <View style={[s.splitRow, isMobile && s.splitRowMobile]}>
              <Card colors={colors} delay={350} style={{ flex: 1 }}>
                <CardTitle icon="trending-up" title="Yield Classification" colors={colors} />
                <View style={s.yieldClassRow}>
                  <View style={s.yieldClassItem}>
                    <View style={[s.yieldClassBadge, { backgroundColor: '#22c55e18' }]}>
                      <Ionicons name="arrow-up" size={20} color="#22c55e" />
                    </View>
                    <Text style={[s.yieldClassVal, { color: '#22c55e' }]}>{ov.highYieldCount || 0}</Text>
                    <Text style={[s.yieldClassLabel, { color: colors.textSecondary }]}>High Yield</Text>
                    <Text style={[s.yieldClassDetail, { color: colors.textTertiary }]}>Yellow + Brown</Text>
                  </View>
                  <View style={[s.yieldClassDivider, { backgroundColor: colors.divider }]} />
                  <View style={s.yieldClassItem}>
                    <View style={[s.yieldClassBadge, { backgroundColor: '#ef444418' }]}>
                      <Ionicons name="arrow-down" size={20} color="#ef4444" />
                    </View>
                    <Text style={[s.yieldClassVal, { color: '#ef4444' }]}>{ov.lowYieldCount || 0}</Text>
                    <Text style={[s.yieldClassLabel, { color: colors.textSecondary }]}>Low Yield</Text>
                    <Text style={[s.yieldClassDetail, { color: colors.textTertiary }]}>Green only</Text>
                  </View>
                </View>
              </Card>

              <Card colors={colors} delay={400} style={{ flex: 1 }}>
                <CardTitle icon="speedometer" title="Overall Weighted Accuracy" colors={colors} />
                <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
                  <ConfidenceGauge label="System Accuracy" value={wAccuracy} colors={colors} color="#7c3aed" size={90} />
                  <Text style={[s.accuracyNote, { color: colors.textTertiary }]}>
                    Weighted: Color 40% + Oil 30% + Fruit 30%
                  </Text>
                </View>
              </Card>
            </View>

            {/* ── Oil Yield by Category ── */}
            <Card colors={colors} delay={450}>
              <CardTitle icon="water" title="Oil Yield by Maturity Stage" subtitle="Average, min, and max oil yield percentage" colors={colors} />
              {['GREEN', 'YELLOW', 'BROWN'].map((cat, idx) => {
                const d = yieldData[cat] || {};
                return (
                  <Animated.View key={cat} entering={FadeInUp.delay(500 + idx * 60).duration(280)} style={s.yieldRow}>
                    <View style={[s.yieldDot, { backgroundColor: CAT_COLORS[cat] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.yieldRowLabel, { color: colors.text }]}>{CAT_LABELS[cat]}</Text>
                      <View style={s.yieldRowStats}>
                        <Text style={[s.yieldRowStat, { color: colors.textTertiary }]}>Avg: <Text style={{ color: colors.text, fontWeight: '600' }}>{num(d.avg)}%</Text></Text>
                        <Text style={[s.yieldRowStat, { color: colors.textTertiary }]}>Min: {num(d.min)}%</Text>
                        <Text style={[s.yieldRowStat, { color: colors.textTertiary }]}>Max: {num(d.max)}%</Text>
                        <Text style={[s.yieldRowStat, { color: colors.textTertiary }]}>n={d.count || 0}</Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
              {yieldOverall.avgYield != null && (
                <View style={[s.yieldOverallRow, { borderTopColor: colors.divider }]}>
                  <Ionicons name="stats-chart" size={14} color={colors.primary} />
                  <Text style={[s.yieldOverallLabel, { color: colors.textSecondary }]}>Overall Average:</Text>
                  <Text style={[s.yieldOverallVal, { color: colors.primary }]}>{num(yieldOverall.avgYield)}%</Text>
                </View>
              )}
            </Card>

            {/* ── Recent Activity ── */}
            <Card colors={colors} delay={500}>
              <CardTitle icon="time" title="Recent Scan Activity" subtitle="Latest fruit analysis results" colors={colors} />
              <View style={s.activityList}>
                {recent.slice(0, 10).map((item, idx) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInUp.delay(550 + idx * 40).duration(280)}
                    style={[s.activityItem, idx < 9 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                  >
                    <View style={[s.activityDot, { backgroundColor: CAT_COLORS[item.category] || colors.primary }]} />
                    <View style={s.activityContent}>
                      <Text style={[s.activityText, { color: colors.text }]}>
                        <Text style={{ fontWeight: '600' }}>{item.userName || item.userEmail}</Text>
                        {' scanned '}
                        <Text style={{ color: CAT_COLORS[item.category], fontWeight: '600' }}>{item.category}</Text>
                        {' fruit'}
                      </Text>
                      <View style={s.activityMeta}>
                        {item.confidence != null && (
                          <Text style={[s.activityTag, { color: colors.textTertiary }]}>
                            {pct(item.confidence)} conf
                          </Text>
                        )}
                        {item.oilYieldPercent != null && (
                          <Text style={[s.activityTag, { color: colors.textTertiary }]}>
                            {num(item.oilYieldPercent)}% oil
                          </Text>
                        )}
                        <Text style={[s.activityTag, { color: colors.textTertiary }]}>
                          {timeAgo(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}
                {recent.length === 0 && (
                  <Text style={[s.emptyText, { color: colors.textTertiary }]}>No scan activity yet</Text>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ═══════════════════════════
            TAB: ANALYTICS
            ═══════════════════════════ */}
        {activeTab === 'analytics' && (
          <View>
            <SectionHeader icon="bar-chart" title="Detection Trends & Confidence" colors={colors} />

            {/* ── Monthly Detection Trend ── */}
            <Card colors={colors} delay={100}>
              <CardTitle
                icon="trending-up"
                title="Monthly Detection Trend"
                subtitle="Scans per month by maturity stage"
                colors={colors}
                right={<ChartTypeToggle activeType={chartTypeMonthly} onChangeType={setChartTypeMonthly} colors={colors} />}
              />
              {monthly.length > 0 ? (
                chartTypeMonthly === 'donut' ? (
                  <DonutChart
                    data={monthly.map((m) => ({ label: m._id, value: m.count, color: colors.primary }))}
                    colors={colors}
                    height={160}
                  />
                ) : chartTypeMonthly === 'line' ? (
                  <LineChart
                    data={monthly.map((m) => ({ label: m._id, value: m.count, color: colors.primary }))}
                    colors={colors}
                    barColor={colors.primary}
                    height={180}
                  />
                ) : (
                  <BarChart
                    data={monthly.map((m) => ({
                      label: m._id,
                      value: m.count,
                      detail: `G:${m.greenCount || 0} Y:${m.yellowCount || 0} B:${m.brownCount || 0}`,
                      color: colors.primary,
                    }))}
                    colors={colors}
                    height={180}
                  />
                )
              ) : (
                <Text style={[s.emptyText, { color: colors.textTertiary }]}>No monthly data available</Text>
              )}
            </Card>

            {/* ── Daily Activity (last 7 days) ── */}
            <Card colors={colors} delay={150}>
              <CardTitle
                icon="calendar"
                title="Daily Activity (Last 7 Days)"
                subtitle="Scan count per day"
                colors={colors}
                right={<ChartTypeToggle activeType={chartTypeDaily} onChangeType={setChartTypeDaily} colors={colors} types={['line', 'bar']} />}
              />
              {daily.length > 0 ? (
                chartTypeDaily === 'bar' ? (
                  <BarChart
                    data={daily.slice(-7).map((d) => ({
                      label: d._id ? d._id.slice(5) : '',
                      value: d.count,
                      color: colors.primary,
                    }))}
                    colors={colors}
                    height={140}
                  />
                ) : (
                  <LineChart
                    data={daily.slice(-7).map((d) => ({
                      label: d._id ? d._id.slice(5) : '',
                      value: d.count,
                      color: colors.primary,
                    }))}
                    colors={colors}
                    barColor={colors.primary}
                    height={140}
                  />
                )
              ) : (
                <Text style={[s.emptyText, { color: colors.textTertiary }]}>No daily activity data</Text>
              )}
            </Card>

            {/* ── Total Detections by Color ── */}
            <Card colors={colors} delay={200}>
              <CardTitle
                icon="pie-chart"
                title="Total Detections by Color"
                subtitle="All-time maturity stage breakdown"
                colors={colors}
                right={<ChartTypeToggle activeType={chartTypeColor} onChangeType={setChartTypeColor} colors={colors} />}
              />
              {chartTypeColor === 'donut' ? (
                <DonutChart
                  data={['GREEN', 'YELLOW', 'BROWN'].map((cat) => ({
                    label: cat,
                    value: catDist[cat] || 0,
                    color: CAT_COLORS[cat],
                  }))}
                  colors={colors}
                  height={160}
                />
              ) : chartTypeColor === 'line' ? (
                <LineChart
                  data={['GREEN', 'YELLOW', 'BROWN'].map((cat) => ({
                    label: cat,
                    value: catDist[cat] || 0,
                    color: CAT_COLORS[cat],
                  }))}
                  colors={colors}
                  height={140}
                />
              ) : (
                <BarChart
                  data={['GREEN', 'YELLOW', 'BROWN'].map((cat) => ({
                    label: cat,
                    value: catDist[cat] || 0,
                    color: CAT_COLORS[cat],
                  }))}
                  colors={colors}
                  height={140}
                />
              )}
            </Card>

            {/* ── Oil Yield Comparison by Category ── */}
            <Card colors={colors} delay={250}>
              <CardTitle
                icon="water"
                title="Oil Yield Comparison"
                subtitle="Average oil yield % per maturity stage"
                colors={colors}
                right={<ChartTypeToggle activeType={chartTypeOilYield} onChangeType={setChartTypeOilYield} colors={colors} types={['bar', 'line']} />}
              />
              {['GREEN', 'YELLOW', 'BROWN'].some(c => (yieldData[c]?.avg || 0) > 0) ? (
                chartTypeOilYield === 'line' ? (
                  <LineChart
                    data={['GREEN', 'YELLOW', 'BROWN'].map((cat) => ({
                      label: CAT_LABELS[cat].split(' ')[0],
                      value: parseFloat((yieldData[cat]?.avg || 0).toFixed(2)),
                      detail: `Min:${(yieldData[cat]?.min || 0).toFixed(1)}% Max:${(yieldData[cat]?.max || 0).toFixed(1)}%`,
                      color: CAT_COLORS[cat],
                    }))}
                    colors={colors}
                    height={140}
                  />
                ) : (
                  <BarChart
                    data={['GREEN', 'YELLOW', 'BROWN'].map((cat) => ({
                      label: CAT_LABELS[cat].split(' ')[0],
                      value: parseFloat((yieldData[cat]?.avg || 0).toFixed(2)),
                      detail: `n=${yieldData[cat]?.count || 0}`,
                      color: CAT_COLORS[cat],
                    }))}
                    colors={colors}
                    height={140}
                  />
                )
              ) : (
                <Text style={[s.emptyText, { color: colors.textTertiary }]}>No yield data available</Text>
              )}
              {/* Research vs system comparison row */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' }}>
                {['GREEN', 'YELLOW', 'BROWN'].map((cat) => {
                  const sci = OIL_YIELD_DATA[cat];
                  const sys = yieldData[cat]?.avg;
                  if (!sys) return null;
                  const diff = (sys - sci.oilYieldMean).toFixed(1);
                  const isAbove = sys >= sci.oilYieldMean;
                  return (
                    <View key={cat} style={{ flex: 1, minWidth: 80, padding: 8, borderRadius: BorderRadius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: CAT_COLORS[cat] + '30' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CAT_COLORS[cat] }} />
                        <Text style={{ ...Typography.tiny, color: colors.textTertiary, fontWeight: '600' }}>{cat.slice(0, 1)}</Text>
                      </View>
                      <Text style={{ ...Typography.captionMedium, color: colors.text, fontWeight: '700', marginTop: 2 }}>{(sys || 0).toFixed(1)}%</Text>
                      <Text style={{ ...Typography.tiny, color: colors.textTertiary }}>sys avg</Text>
                      <Text style={{ ...Typography.tiny, color: isAbove ? '#22c55e' : '#ef4444', fontWeight: '600', marginTop: 2 }}>
                        {isAbove ? '▲' : '▼'} {Math.abs(diff)}% vs research
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* ── Confidence Distribution ── */}
            <Card colors={colors} delay={300}>
              <CardTitle
                icon="stats-chart"
                title="Confidence Distribution"
                subtitle="Histogram of model confidence scores"
                colors={colors}
                right={<ChartTypeToggle activeType={chartTypeConf} onChangeType={setChartTypeConf} colors={colors} />}
              />
              {confDist.length > 0 ? (
                chartTypeConf === 'donut' ? (
                  <DonutChart
                    data={confDist.map((b) => ({
                      label: b.range,
                      value: b.count,
                      color: (b.rangeMin != null && b.rangeMin >= 0.8) ? '#22c55e' : (b.rangeMin != null && b.rangeMin >= 0.5) ? '#eab308' : '#ef4444',
                    }))}
                    colors={colors}
                    height={160}
                  />
                ) : chartTypeConf === 'line' ? (
                  <LineChart
                    data={confDist.map((b) => ({
                      label: b.range,
                      value: b.count,
                      color: (b.rangeMin != null && b.rangeMin >= 0.8) ? '#22c55e' : (b.rangeMin != null && b.rangeMin >= 0.5) ? '#eab308' : '#ef4444',
                    }))}
                    colors={colors}
                    height={140}
                  />
                ) : (
                  <BarChart
                    data={confDist.map((b) => ({
                      label: b.range,
                      value: b.count,
                      color: (b.rangeMin != null && b.rangeMin >= 0.8) ? '#22c55e' : (b.rangeMin != null && b.rangeMin >= 0.5) ? '#eab308' : '#ef4444',
                    }))}
                    colors={colors}
                    height={140}
                  />
                )
              ) : (
                <Text style={[s.emptyText, { color: colors.textTertiary }]}>No confidence data</Text>
              )}
              <View style={[s.confSummary, { borderTopColor: colors.divider }]}>
                <StatRow icon="checkmark-circle" label="High Confidence (≥80%)" value={conf.highConfidenceCount || 0} color="#22c55e" colors={colors} />
                <StatRow icon="alert-circle" label="Low Confidence (<50%)" value={conf.lowConfidenceCount || 0} color="#ef4444" colors={colors} />
              </View>
            </Card>

            {/* ── Confidence Metrics by Model ── */}
            <View style={[s.splitRow, isMobile && s.splitRowMobile]}>
              <Card colors={colors} delay={350} style={{ flex: 1 }}>
                <CardTitle icon="hardware-chip" title="Model Confidence Metrics" colors={colors} />
                <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
                  <View style={s.gaugeRow}>
                    <ConfidenceGauge label="Overall" value={conf.avgConfidence} colors={colors} color="#3b82f6" />
                    <ConfidenceGauge label="Color Clf." value={conf.avgColorConfidence} colors={colors} color="#22c55e" />
                    <ConfidenceGauge label="Oil Pred." value={conf.avgOilConfidence} colors={colors} color="#f97316" />
                    <ConfidenceGauge label="Fruit Det." value={conf.avgFruitConfidence} colors={colors} color="#7c3aed" />
                  </View>
                </View>
                <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
                  <StatRow icon="arrow-up" label="Highest Confidence" value={pct(conf.maxConfidence)} color="#22c55e" colors={colors} />
                  <StatRow icon="arrow-down" label="Lowest Confidence" value={pct(conf.minConfidence)} color="#ef4444" colors={colors} />
                  <StatRow icon="analytics" label="Average Confidence" value={pct(conf.avgConfidence)} color="#3b82f6" colors={colors} />
                </View>
              </Card>

              <Card colors={colors} delay={400} style={{ flex: 1 }}>
                <CardTitle icon="eye" title="Color Classifier Output" subtitle="Average color probability distribution" colors={colors} />
                <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <ProgressBar label="Green Probability" value={(colorProbs.avgGreenProb || 0) * 100} color="#22c55e" colors={colors} delay={450} />
                  <ProgressBar label="Yellow Probability" value={(colorProbs.avgYellowProb || 0) * 100} color="#eab308" colors={colors} delay={500} />
                  <ProgressBar label="Brown Probability" value={(colorProbs.avgBrownProb || 0) * 100} color="#a16207" colors={colors} delay={550} />
                </View>
              </Card>
            </View>

            {/* ── Severity / Quality Breakdown ── */}
            <Card colors={colors} delay={450}>
              <CardTitle icon="shield-checkmark" title="Quality & Severity Breakdown" subtitle="Spot detection and reference coin usage" colors={colors} />
              <View style={[s.splitRow, isMobile && s.splitRowMobile, { marginTop: Spacing.sm }]}>
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <StatRow icon="scan" label="Total Scans" value={spots.totalScans || 0} color="#3b82f6" colors={colors} />
                  <StatRow icon="ellipse" label="With Spots Detected" value={spots.withSpots || 0} color="#f97316" colors={colors} />
                  <StatRow icon="cellular" label="Avg Spot Coverage" value={spots.avgSpotCoverage != null ? `${(spots.avgSpotCoverage * 100).toFixed(1)}%` : '—'} color="#ef4444" colors={colors} />
                </View>
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <StatRow icon="disc" label="Coin Detected" value={coinDet.withCoin || 0} color="#22c55e" colors={colors} />
                  <StatRow icon="close-circle" label="No Coin" value={(coinDet.totalScans || 0) - (coinDet.withCoin || 0)} color="#ef4444" colors={colors} />
                  <StatRow icon="checkmark-circle" label="Coin Rate" value={coinDet.totalScans > 0 ? `${((coinDet.withCoin / coinDet.totalScans) * 100).toFixed(1)}%` : '—'} color="#3b82f6" colors={colors} />
                </View>
              </View>
            </Card>

            {/* ── Size Estimator Stats ── */}
            <Card colors={colors} delay={500}>
              <CardTitle icon="resize" title="Size Estimator by Category" subtitle="Average dimensions from coin-referenced measurements" colors={colors} />
              {['GREEN', 'YELLOW', 'BROWN'].map((cat, idx) => {
                const d = dimStats[cat];
                if (!d) return null;
                return (
                  <Animated.View key={cat} entering={FadeInUp.delay(550 + idx * 60).duration(280)} style={[s.dimRow, { borderColor: CAT_COLORS[cat] + '20' }]}>
                    <View style={[s.dimDot, { backgroundColor: CAT_COLORS[cat] }]} />
                    <Text style={[s.dimLabel, { color: colors.text }]}>{CAT_LABELS[cat]}</Text>
                    <View style={s.dimStats}>
                      <Text style={[s.dimStat, { color: colors.textSecondary }]}>L: {num(d.avgLength)} cm</Text>
                      <Text style={[s.dimStat, { color: colors.textSecondary }]}>W: {num(d.avgWidth)} cm</Text>
                      <Text style={[s.dimStat, { color: colors.textSecondary }]}>Wt: {num(d.avgWeight)} g</Text>
                      {d.avgKernelWeight > 0 && <Text style={[s.dimStat, { color: colors.textSecondary }]}>Kern: {num(d.avgKernelWeight)} g</Text>}
                      <Text style={[s.dimStat, { color: colors.textTertiary }]}>n={d.count}</Text>
                    </View>
                  </Animated.View>
                );
              })}
            </Card>

            {/* ── Top Users by Scan Count ── */}
            <Card colors={colors} delay={550}>
              <CardTitle icon="podium" title="Top Users by Scan Count" subtitle="Most active users ranked by total scans" colors={colors} />
              {userAct.length > 0 ? (
                <>
                  <BarChart
                    data={userAct.slice(0, 8).map((u, idx) => ({
                      label: (u.name || u.email || '').split('@')[0].slice(0, 10),
                      value: u.scanCount,
                      color: idx < 3 ? '#f97316' : colors.primary,
                      detail: u.email,
                    }))}
                    colors={colors}
                    height={140}
                    labelKey="label"
                    valueKey="value"
                  />
                  <View style={{ gap: 0 }}>
                    {userAct.slice(0, 5).map((u, idx) => (
                      <Animated.View key={u.userId} entering={FadeInUp.delay(600 + idx * 40).duration(280)} style={[s.userRow, idx < Math.min(userAct.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                        <View style={[s.userRank, { backgroundColor: idx < 3 ? '#f97316' + '20' : colors.borderLight }]}>
                          <Text style={[s.userRankText, { color: idx < 3 ? '#f97316' : colors.textTertiary }]}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.userEmail, { color: colors.text }]}>{u.name || u.email}</Text>
                          {u.name && <Text style={[s.userSub, { color: colors.textTertiary }]}>{u.email}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[s.userScans, { color: colors.primary }]}>{u.scanCount} scans</Text>
                          <Text style={[s.userSub, { color: colors.textTertiary }]}>{timeAgo(u.lastScan)}</Text>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={[s.emptyText, { color: colors.textTertiary }]}>No user scan data</Text>
              )}
            </Card>
          </View>
        )}

        {/* ═══════════════════════════
            TAB: USERS
            ═══════════════════════════ */}
        {activeTab === 'users' && (
          <View>
            <SectionHeader icon="people" title="User Management" colors={colors} />

            {/* Search */}
            <Card colors={colors} delay={100}>
              <View style={s.dataTableTopBar}>
                <View style={[s.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="search" size={16} color={colors.textTertiary} />
                  <TextInput
                    value={userSearch}
                    onChangeText={setUserSearch}
                    placeholder="Search users..."
                    placeholderTextColor={colors.textTertiary}
                    style={[s.searchInput, { color: colors.text }]}
                  />
                  {userSearch.length > 0 && (
                    <Pressable onPress={() => setUserSearch('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={loadUsers} style={[s.refreshBtn, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={[s.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
                </Pressable>
              </View>

              {usersLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: Spacing.xl }} />
              ) : isMobile ? (
                /* ── Mobile: Compact user list (Name + Email only, tap to open detail+edit modal) ── */
                <>
                  {users
                    .filter(u => {
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return (u.email || '').toLowerCase().includes(q) ||
                        (u.firstName || '').toLowerCase().includes(q) ||
                        (u.lastName || '').toLowerCase().includes(q) ||
                        (u.role || '').toLowerCase().includes(q);
                    })
                    .map((u, idx) => (
                      <Animated.View key={u.id} entering={FadeInUp.delay(60 + idx * 25).duration(280)}>
                        <Pressable
                          onPress={() => { setSelectedUser(u); setEditForm({ role: u.role, firstName: u.firstName, lastName: u.lastName }); }}
                          style={({ pressed }) => [
                            {
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                              paddingVertical: 12, paddingHorizontal: 14,
                              borderBottomWidth: 1, borderBottomColor: colors.divider,
                              backgroundColor: pressed ? colors.primary + '08' : (idx % 2 === 0 ? colors.background + '60' : 'transparent'),
                            },
                          ]}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: u.role === 'admin' ? '#7c3aed18' : colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name={u.role === 'admin' ? 'shield' : 'person'} size={15} color={u.role === 'admin' ? '#7c3aed' : colors.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ ...Typography.captionMedium, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                                </Text>
                                <Text style={{ ...Typography.tiny, color: colors.textTertiary, marginTop: 1 }} numberOfLines={1}>
                                  {u.email}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </Pressable>
                      </Animated.View>
                    ))}

                  {users.length === 0 && (
                    <Text style={[s.emptyText, { color: colors.textTertiary }]}>No users found</Text>
                  )}

                  <View style={[s.dtFooter, { borderTopColor: colors.divider }]}>
                    <Text style={[s.dtFooterText, { color: colors.textTertiary }]}>
                      {users.filter(u => !userSearch || (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.firstName || '').toLowerCase().includes(userSearch.toLowerCase())).length} of {users.length} users
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Header Row */}
                  <View style={[s.dtHeaderRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[s.dtHeaderCell, s.dtCellName, { color: colors.textTertiary }]}>Name</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellEmail, { color: colors.textTertiary }]}>Email</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellRole, { color: colors.textTertiary }]}>Role</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellStatus, { color: colors.textTertiary }]}>Status</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellDate, { color: colors.textTertiary }]}>Joined</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellActions, { color: colors.textTertiary }]}>Actions</Text>
                  </View>

                  {/* Data Rows */}
                  {users
                    .filter(u => {
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return (u.email || '').toLowerCase().includes(q) ||
                        (u.firstName || '').toLowerCase().includes(q) ||
                        (u.lastName || '').toLowerCase().includes(q) ||
                        (u.role || '').toLowerCase().includes(q);
                    })
                    .map((u, idx) => (
                      <Pressable
                        key={u.id}
                        onPress={() => setSelectedUser(u)}
                        style={({ pressed }) => [
                          s.dtRow,
                          { borderBottomColor: colors.divider },
                          idx % 2 === 0 && { backgroundColor: colors.background + '60' },
                          pressed && { backgroundColor: colors.primary + '10' },
                        ]}
                      >
                        <Text style={[s.dtCell, s.dtCellName, { color: colors.text }]} numberOfLines={1}>
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                        </Text>
                        <Text style={[s.dtCell, s.dtCellEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                          {u.email}
                        </Text>
                        <View style={s.dtCellRole}>
                          <View style={[s.roleBadge, { backgroundColor: u.role === 'admin' ? '#7c3aed18' : '#22c55e18' }]}>
                            <Text style={[s.roleBadgeText, { color: u.role === 'admin' ? '#7c3aed' : '#22c55e' }]}>
                              {u.role}
                            </Text>
                          </View>
                        </View>
                        <View style={s.dtCellStatus}>
                          <View style={[s.statusDot, { backgroundColor: u.isActive !== false ? '#22c55e' : '#ef4444' }]} />
                          <Text style={[s.dtCellStatusText, { color: colors.textTertiary }]}>
                            {u.isActive !== false ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                        <Text style={[s.dtCell, s.dtCellDate, { color: colors.textTertiary }]} numberOfLines={1}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </Text>
                        <View style={[s.dtCellActions, s.dtActionsRow]}>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </View>
                      </Pressable>
                    ))}

                  {users.length === 0 && (
                    <Text style={[s.emptyText, { color: colors.textTertiary }]}>No users found</Text>
                  )}

                  <View style={[s.dtFooter, { borderTopColor: colors.divider }]}>
                    <Text style={[s.dtFooterText, { color: colors.textTertiary }]}>
                      {users.filter(u => !userSearch || (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.firstName || '').toLowerCase().includes(userSearch.toLowerCase())).length} of {users.length} users
                    </Text>
                  </View>
                </>
              )}
            </Card>

            {/* ─── Modal 1: User Details ─── */}
            {selectedUser && (
              <Modal transparent animationType="slide" visible={!!selectedUser} onRequestClose={() => setSelectedUser(null)}>
                <Pressable style={s.modalOverlay} onPress={() => setSelectedUser(null)}>
                  <Pressable style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={e => e.stopPropagation()}>
                    {/* X Close button */}
                    <Pressable
                      onPress={() => setSelectedUser(null)}
                      hitSlop={12}
                      style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </Pressable>

                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.xs }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: selectedUser.role === 'admin' ? '#7c3aed18' : colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Ionicons name={selectedUser.role === 'admin' ? 'shield' : 'person'} size={26} color={selectedUser.role === 'admin' ? '#7c3aed' : colors.primary} />
                      </View>
                      <Text style={[s.modalTitle, { color: colors.text, textAlign: 'center' }]}>User Details</Text>
                      <Text style={[s.modalSubtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: 0 }]}>{selectedUser.email}</Text>
                    </View>

                    {/* Details */}
                    <View style={{ backgroundColor: colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm }}>
                      {[
                        { label: 'First Name', value: selectedUser.firstName || '—' },
                        { label: 'Last Name',  value: selectedUser.lastName  || '—' },
                        { label: 'Phone',      value: selectedUser.phone     || '—' },
                        { label: 'Address',    value: selectedUser.address   || '—' },
                        { label: 'Role',       value: (selectedUser.role || '—').charAt(0).toUpperCase() + (selectedUser.role || '').slice(1) },
                        { label: 'Status',     value: selectedUser.isVerified ? 'Verified' : 'Pending' },
                      ].map(({ label, value }) => (
                        <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 2 }}>
                          <Text style={{ ...Typography.small, color: colors.textTertiary, width: 90 }}>{label}</Text>
                          <Text style={{ ...Typography.small, color: colors.text, flex: 1, textAlign: 'right', fontWeight: '500' }}>{value}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Buttons */}
                    <View style={{ gap: Spacing.sm }}>
                      <Pressable
                        onPress={() => {
                          setEditForm({ role: selectedUser.role, firstName: selectedUser.firstName, lastName: selectedUser.lastName });
                          setEditingUser(selectedUser);
                          setMobileEditUserOpen(true);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingVertical: 13 }}
                      >
                        <Ionicons name="create-outline" size={17} color="#fff" />
                        <Text style={{ ...Typography.captionMedium, color: '#fff', fontWeight: '700' }}>Edit User</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (selectedUser.isActive !== false) {
                            setConfirmDelete({ type: 'user', id: selectedUser.id, label: selectedUser.email, isActive: true });
                            setSelectedUser(null);
                          } else {
                            handleToggleUserStatus(selectedUser.id, true);
                            setSelectedUser(null);
                          }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: selectedUser.isActive !== false ? '#ef444412' : '#22c55e12', borderRadius: BorderRadius.md, paddingVertical: 13, borderWidth: 1, borderColor: selectedUser.isActive !== false ? '#ef444430' : '#22c55e30' }}
                      >
                        <Ionicons name={selectedUser.isActive !== false ? 'ban-outline' : 'checkmark-circle-outline'} size={17} color={selectedUser.isActive !== false ? '#ef4444' : '#22c55e'} />
                        <Text style={{ ...Typography.captionMedium, color: selectedUser.isActive !== false ? '#ef4444' : '#22c55e', fontWeight: '700' }}>{selectedUser.isActive !== false ? 'Deactivate User' : 'Activate User'}</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>
            )}

            {/* ─── Modal 2: Edit User ─── */}
            {mobileEditUserOpen && editingUser && (
              <Modal transparent animationType="slide" visible={mobileEditUserOpen} onRequestClose={() => setMobileEditUserOpen(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setMobileEditUserOpen(false)}>
                  <Pressable style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={e => e.stopPropagation()}>
                    {/* X Close button */}
                    <Pressable
                      onPress={() => setMobileEditUserOpen(false)}
                      hitSlop={12}
                      style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </Pressable>

                    {/* Header */}
                    <View style={{ marginBottom: Spacing.lg, marginTop: Spacing.xs }}>
                      <Text style={[s.modalTitle, { color: colors.text }]}>Edit User</Text>
                      <Text style={[s.modalSubtitle, { color: colors.textSecondary, marginBottom: 0 }]}>{editingUser.email}</Text>
                    </View>

                    {/* Role selector */}
                    <View style={s.modalField}>
                      <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Role</Text>
                      <View style={s.roleToggleRow}>
                        {['user', 'admin'].map(r => (
                          <Pressable
                            key={r}
                            onPress={() => setEditForm(f => ({ ...f, role: r }))}
                            style={[
                              s.roleToggleBtn,
                              { borderColor: colors.border },
                              editForm.role === r && { backgroundColor: r === 'admin' ? '#7c3aed18' : '#22c55e18', borderColor: r === 'admin' ? '#7c3aed' : '#22c55e' },
                            ]}
                          >
                            <Ionicons name={r === 'admin' ? 'shield' : 'person'} size={15} color={editForm.role === r ? (r === 'admin' ? '#7c3aed' : '#22c55e') : colors.textTertiary} />
                            <Text style={[s.roleToggleText, { color: editForm.role === r ? (r === 'admin' ? '#7c3aed' : '#22c55e') : colors.textSecondary }]}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Save button */}
                    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                      <Pressable
                        onPress={async () => {
                          await handleUpdateUser(editingUser);
                          setMobileEditUserOpen(false);
                          setSelectedUser(null);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingVertical: 13 }}
                      >
                        <Ionicons name="save-outline" size={17} color="#fff" />
                        <Text style={{ ...Typography.captionMedium, color: '#fff', fontWeight: '700' }}>Save Changes</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>
            )}
          </View>
        )}

        {/* ═══════════════════════════
            TAB: HISTORY SCANS
            ═══════════════════════════ */}
        {activeTab === 'history' && (
          <View>
            <SectionHeader icon="time" title="Scan History" colors={colors} />

            <Card colors={colors} delay={100}>
              <View style={s.dataTableTopBar}>
                <View style={[s.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="search" size={16} color={colors.textTertiary} />
                  <TextInput
                    value={historySearch}
                    onChangeText={setHistorySearch}
                    placeholder="Search scans..."
                    placeholderTextColor={colors.textTertiary}
                    style={[s.searchInput, { color: colors.text }]}
                  />
                  {historySearch.length > 0 && (
                    <Pressable onPress={() => setHistorySearch('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={loadHistory} style={[s.refreshBtn, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={[s.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
                </Pressable>
              </View>

              {historyLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: Spacing.xl }} />
              ) : isMobile ? (
                /* ── Mobile: Compact history list (User + Category, tap for details) ── */
                <>
                  {historyItems
                    .filter(h => {
                      if (!historySearch) return true;
                      const q = historySearch.toLowerCase();
                      return (h.userEmail || '').toLowerCase().includes(q) ||
                        (h.userName || '').toLowerCase().includes(q) ||
                        (h.category || '').toLowerCase().includes(q) ||
                        (h.yieldCategory || '').toLowerCase().includes(q);
                    })
                    .map((h, idx) => (
                      <Animated.View key={h.id} entering={FadeInUp.delay(60 + idx * 20).duration(280)}>
                        <Pressable
                          onPress={() => setSelectedHistory(h)}
                          style={({ pressed }) => [
                            {
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                              paddingVertical: 12, paddingHorizontal: 14,
                              borderBottomWidth: 1, borderBottomColor: colors.divider,
                              backgroundColor: pressed ? colors.primary + '08' : (idx % 2 === 0 ? colors.background + '60' : 'transparent'),
                            },
                          ]}
                        >
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[s.categoryBadge, { backgroundColor: (CAT_COLORS[h.category] || colors.primary) + '18', paddingHorizontal: 8, paddingVertical: 4 }]}>
                              <View style={[s.categoryDot, { backgroundColor: CAT_COLORS[h.category] || colors.primary }]} />
                              <Text style={[s.categoryBadgeText, { color: CAT_COLORS[h.category] || colors.primary }]}>
                                {h.category || '—'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ ...Typography.captionMedium, color: colors.text, fontWeight: '500' }} numberOfLines={1}>
                                {h.userName || h.userEmail || '—'}
                              </Text>
                              <Text style={{ ...Typography.tiny, color: colors.textTertiary, marginTop: 1 }}>
                                {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '—'}
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </Pressable>
                      </Animated.View>
                    ))}

                  {historyItems.length === 0 && (
                    <Text style={[s.emptyText, { color: colors.textTertiary }]}>No scan history found</Text>
                  )}

                  <View style={[s.dtFooter, { borderTopColor: colors.divider }]}>
                    <Text style={[s.dtFooterText, { color: colors.textTertiary }]}>
                      {historyItems.filter(h => !historySearch || (h.userEmail || '').toLowerCase().includes(historySearch.toLowerCase()) || (h.category || '').toLowerCase().includes(historySearch.toLowerCase())).length} of {historyItems.length} records
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Header Row */}
                  <View style={[s.dtHeaderRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[s.dtHeaderCell, s.dtCellUser, { color: colors.textTertiary }]}>User</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellCategory, { color: colors.textTertiary }]}>Category</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellConf, { color: colors.textTertiary }]}>Confidence</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellYield, { color: colors.textTertiary }]}>Oil Yield</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellDate, { color: colors.textTertiary }]}>Date</Text>
                    <Text style={[s.dtHeaderCell, s.dtCellDel, { color: colors.textTertiary }]}>Delete</Text>
                  </View>

                  {/* Data Rows */}
                  {historyItems
                    .filter(h => {
                      if (!historySearch) return true;
                      const q = historySearch.toLowerCase();
                      return (h.userEmail || '').toLowerCase().includes(q) ||
                        (h.userName || '').toLowerCase().includes(q) ||
                        (h.category || '').toLowerCase().includes(q) ||
                        (h.yieldCategory || '').toLowerCase().includes(q);
                    })
                    .map((h, idx) => (
                      <Animated.View
                        key={h.id}
                        entering={FadeInUp.delay(80 + idx * 20).duration(280)}
                        style={[s.dtRow, { borderBottomColor: colors.divider }, idx % 2 === 0 && { backgroundColor: colors.background + '60' }]}
                      >
                        <View style={s.dtCellUser}>
                          <Text style={[s.dtCell, { color: colors.text }]} numberOfLines={1}>
                            {h.userName || h.userEmail || '—'}
                          </Text>
                        </View>
                        <View style={s.dtCellCategory}>
                          <View style={[s.categoryBadge, { backgroundColor: (CAT_COLORS[h.category] || colors.primary) + '18' }]}>
                            <View style={[s.categoryDot, { backgroundColor: CAT_COLORS[h.category] || colors.primary }]} />
                            <Text style={[s.categoryBadgeText, { color: CAT_COLORS[h.category] || colors.primary }]}>
                              {h.category || '—'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.dtCell, s.dtCellConf, { color: colors.text }]} numberOfLines={1}>
                          {h.confidence != null ? `${(h.confidence * 100).toFixed(1)}%` : '—'}
                        </Text>
                        <Text style={[s.dtCell, s.dtCellYield, { color: colors.text }]} numberOfLines={1}>
                          {h.oilYieldPercent != null ? `${Number(h.oilYieldPercent).toFixed(1)}%` : '—'}
                        </Text>
                        <Text style={[s.dtCell, s.dtCellDate, { color: colors.textTertiary }]} numberOfLines={1}>
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '—'}
                        </Text>
                        <View style={s.dtCellDel}>
                          <Pressable
                            onPress={() => setConfirmDelete({ type: 'history', id: h.id, label: `${h.category} scan by ${h.userEmail || 'unknown'}` })}
                            style={[s.dtActionBtn, { backgroundColor: '#ef444415' }]}
                          >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </Pressable>
                        </View>
                      </Animated.View>
                    ))}

                  {historyItems.length === 0 && (
                    <Text style={[s.emptyText, { color: colors.textTertiary }]}>No scan history found</Text>
                  )}

                  <View style={[s.dtFooter, { borderTopColor: colors.divider }]}>
                    <Text style={[s.dtFooterText, { color: colors.textTertiary }]}>
                      {historyItems.filter(h => !historySearch || (h.userEmail || '').toLowerCase().includes(historySearch.toLowerCase()) || (h.category || '').toLowerCase().includes(historySearch.toLowerCase())).length} of {historyItems.length} records
                    </Text>
                  </View>
                </>
              )}
            </Card>

            {/* Mobile: History Detail Modal */}
            {selectedHistory && isMobile && (
              <Modal transparent animationType="slide" visible={!!selectedHistory} onRequestClose={() => setSelectedHistory(null)}>
                <Pressable style={s.modalOverlay} onPress={() => setSelectedHistory(null)}>
                  <Pressable style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.borderLight, maxHeight: '80%' }]} onPress={e => e.stopPropagation()}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {/* Header */}
                      <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
                        <View style={[s.categoryBadge, { backgroundColor: (CAT_COLORS[selectedHistory.category] || colors.primary) + '18', paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 }]}>
                          <View style={[s.categoryDot, { backgroundColor: CAT_COLORS[selectedHistory.category] || colors.primary, width: 8, height: 8, borderRadius: 4 }]} />
                          <Text style={{ ...Typography.captionMedium, color: CAT_COLORS[selectedHistory.category] || colors.primary, fontWeight: '700' }}>
                            {selectedHistory.category || '—'}
                          </Text>
                        </View>
                        <Text style={[s.modalTitle, { color: colors.text }]}>Scan Details</Text>
                        <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
                          {selectedHistory.userName || selectedHistory.userEmail || 'Unknown User'}
                        </Text>
                      </View>

                      {/* Details */}
                      <View style={{ backgroundColor: colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ ...Typography.small, color: colors.textSecondary }}>User</Text>
                          <Text style={{ ...Typography.small, color: colors.text, fontWeight: '500' }} numberOfLines={1}>{selectedHistory.userName || selectedHistory.userEmail || '—'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ ...Typography.small, color: colors.textSecondary }}>Category</Text>
                          <Text style={{ ...Typography.small, color: CAT_COLORS[selectedHistory.category] || colors.text, fontWeight: '600' }}>{selectedHistory.category || '—'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ ...Typography.small, color: colors.textSecondary }}>Confidence</Text>
                          <Text style={{ ...Typography.small, color: colors.text, fontWeight: '500' }}>
                            {selectedHistory.confidence != null ? `${(selectedHistory.confidence * 100).toFixed(1)}%` : '—'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ ...Typography.small, color: colors.textSecondary }}>Oil Yield</Text>
                          <Text style={{ ...Typography.small, color: colors.text, fontWeight: '500' }}>
                            {selectedHistory.oilYieldPercent != null ? `${Number(selectedHistory.oilYieldPercent).toFixed(1)}%` : '—'}
                          </Text>
                        </View>
                        {selectedHistory.yieldCategory && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ ...Typography.small, color: colors.textSecondary }}>Yield Category</Text>
                            <Text style={{ ...Typography.small, color: colors.text, fontWeight: '500' }}>{selectedHistory.yieldCategory}</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ ...Typography.small, color: colors.textSecondary }}>Date</Text>
                          <Text style={{ ...Typography.small, color: colors.text }}>
                            {selectedHistory.createdAt ? new Date(selectedHistory.createdAt).toLocaleString() : '—'}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={{ gap: Spacing.sm }}>
                        <Pressable
                          onPress={() => { setConfirmDelete({ type: 'history', id: selectedHistory.id, label: `${selectedHistory.category} scan by ${selectedHistory.userEmail || 'unknown'}` }); setSelectedHistory(null); }}
                          style={[s.modalBtn, { borderColor: '#ef444440', backgroundColor: '#ef444408', paddingVertical: 12 }]}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                          <Text style={[s.modalBtnText, { color: '#ef4444', fontWeight: '600' }]}>Delete Record</Text>
                        </Pressable>

                        <Pressable onPress={() => setSelectedHistory(null)} style={[s.modalBtn, { borderColor: colors.border, paddingVertical: 12 }]}>
                          <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Close</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </Pressable>
                </Pressable>
              </Modal>
            )}
          </View>
        )}

        {/* Confirm Action Modal (Deactivate User / Delete History) */}
        {confirmDelete && (
          <Modal transparent animationType="fade" visible={!!confirmDelete} onRequestClose={() => { setConfirmDelete(null); setDeactivateReason(''); }}>
            <Pressable style={s.modalOverlay} onPress={() => { setConfirmDelete(null); setDeactivateReason(''); }}>
              <Pressable style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={e => e.stopPropagation()}>
                <View style={[s.modalDeleteIcon, { backgroundColor: confirmDelete.type === 'user' ? '#f97316' + '18' : '#ef444418' }]}>
                  <Ionicons name={confirmDelete.type === 'user' ? 'ban' : 'warning'} size={28} color={confirmDelete.type === 'user' ? '#f97316' : '#ef4444'} />
                </View>
                <Text style={[s.modalTitle, { color: colors.text, textAlign: 'center' }]}>
                  {confirmDelete.type === 'user' ? 'Deactivate User' : 'Confirm Delete'}
                </Text>
                <Text style={[s.modalSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {confirmDelete.type === 'user' ? (
                    <>Are you sure you want to deactivate{'\n'}<Text style={{ fontWeight: '600', color: colors.text }}>{confirmDelete.label}</Text>?{'\n'}They will receive an email notification.</>
                  ) : (
                    <>Are you sure you want to delete scan record{'\n'}<Text style={{ fontWeight: '600', color: colors.text }}>{confirmDelete.label}</Text>?</>
                  )}
                </Text>

                {/* Preset deactivation reasons (only for user deactivation) */}
                {confirmDelete.type === 'user' && (
                  <View style={{ gap: 6, marginTop: 10, width: '100%' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 }}>Select a reason:</Text>
                    {[
                      'Violation of terms of service',
                      'Inappropriate behavior or content',
                      'Spam or fraudulent activity',
                      'Inactive account',
                      'User requested deactivation',
                      'Other',
                    ].map(reason => (
                      <Pressable
                        key={reason}
                        onPress={() => setDeactivateReason(reason)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          paddingVertical: 8, paddingHorizontal: 12,
                          borderRadius: 10, borderWidth: 1,
                          borderColor: deactivateReason === reason ? '#f97316' : colors.borderLight,
                          backgroundColor: deactivateReason === reason ? '#f9731610' : 'transparent',
                        }}
                      >
                        <Ionicons
                          name={deactivateReason === reason ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={deactivateReason === reason ? '#f97316' : colors.textTertiary}
                        />
                        <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{reason}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={s.modalBtnRow}>
                  <Pressable onPress={() => { setConfirmDelete(null); setDeactivateReason(''); }} style={[s.modalBtn, { borderColor: colors.border }]}>
                    <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (confirmDelete.type === 'user') {
                        handleToggleUserStatus(confirmDelete.id, false, deactivateReason || 'Deactivated by admin');
                      } else {
                        handleDeleteHistory(confirmDelete.id);
                      }
                    }}
                    disabled={confirmDelete.type === 'user' && !deactivateReason}
                    style={[s.modalBtn, s.modalBtnPrimary, {
                      backgroundColor: confirmDelete.type === 'user'
                        ? (deactivateReason ? '#f97316' : '#f9731640')
                        : '#ef4444',
                    }]}
                  >
                    <Text style={[s.modalBtnText, { color: '#fff' }]}>
                      {confirmDelete.type === 'user' ? 'Deactivate' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* ═══════════════════════════
            TAB: AI MODEL
            ═══════════════════════════ */}
        {activeTab === 'model' && (
          <View>
            <SectionHeader icon="hardware-chip" title="ML Pipeline Architecture" colors={colors} />

            {/* ── Model Cards ── */}
            {MODEL_ARCHITECTURE.map((model, idx) => (
              <Card key={model.name} colors={colors} delay={100 + idx * 80}>
                <Pressable
                  onPress={() => setExpandedCard(expandedCard === model.name ? null : model.name)}
                  style={[s.modelCardHeader, Platform.OS === 'web' && { cursor: 'pointer' }]}
                >
                  <View style={[s.modelIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={model.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modelName, { color: colors.text }]}>{model.name}</Text>
                    <Text style={[s.modelType, { color: colors.primary }]}>{model.model}</Text>
                  </View>
                  <Ionicons name={expandedCard === model.name ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </Pressable>
                {expandedCard === model.name && (
                  <Animated.View entering={FadeInUp.duration(280)} style={s.modelDetails}>
                    <StatRow icon="cog" label="Task" value={model.task} color={colors.primary} colors={colors} />
                    <Text style={[s.modelDesc, { color: colors.textSecondary }]}>{model.description}</Text>
                    {model.classes && (
                      <View style={s.modelChips}>
                        {model.classes.map((c) => (
                          <View key={c} style={[s.chip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                            <Text style={[s.chipText, { color: colors.primary }]}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {model.inputSize && <StatRow icon="image" label="Input Size" value={model.inputSize} color="#3b82f6" colors={colors} />}
                    {model.outputs && model.outputs.map((o) => (
                      <StatRow key={o} icon="exit" label="Output" value={o} color="#22c55e" colors={colors} />
                    ))}
                    {model.inputs && model.inputs.map((i) => (
                      <StatRow key={i} icon="enter" label="Input" value={i} color="#f97316" colors={colors} />
                    ))}
                  </Animated.View>
                )}
              </Card>
            ))}

            {/* ── Correlation Factors ── */}
            <SectionHeader icon="git-branch" title="Dimension → Oil Yield Correlations" colors={colors} delay={500} />
            <Card colors={colors} delay={550}>
              {CORRELATION_FACTORS.map((f, idx) => (
                <ProgressBar
                  key={f.factor}
                  label={`${f.factor} (r=${f.correlation})`}
                  value={f.correlation * 100}
                  color={f.correlation >= 0.8 ? '#22c55e' : f.correlation >= 0.6 ? '#3b82f6' : '#eab308'}
                  colors={colors}
                  delay={600 + idx * 60}
                />
              ))}
            </Card>
          </View>
        )}

        {/* ═══════════════════════════
            TAB: SCIENCE
            ═══════════════════════════ */}
        {activeTab === 'science' && (
          <View>
            <SectionHeader icon="flask" title="Terminalia catappa — Scientific Data" colors={colors} />

            {/* ── Botanical Info ── */}
            <Card colors={colors} delay={100}>
              <CardTitle icon="leaf" title="Botanical Information" subtitle={BOTANICAL_INFO.scientificName} colors={colors} />
              <View style={{ gap: Spacing.xs }}>
                <StatRow icon="globe" label="Family" value={BOTANICAL_INFO.family} color="#22c55e" colors={colors} />
                <StatRow icon="earth" label="Origin" value={BOTANICAL_INFO.origin} color="#3b82f6" colors={colors} />
                <StatRow icon="resize" label="Tree Height" value={BOTANICAL_INFO.treeHeight} color="#7c3aed" colors={colors} />
                <StatRow icon="ellipse" label="Fruit Type" value={BOTANICAL_INFO.fruitType} color="#f97316" colors={colors} />
                <StatRow icon="calendar" label="Harvest Season" value={BOTANICAL_INFO.harvestSeason} color="#eab308" colors={colors} />
              </View>
              <View style={[s.commonNamesWrap, { borderTopColor: colors.divider }]}>
                <Text style={[s.commonNamesLabel, { color: colors.textSecondary }]}>Common Names:</Text>
                <View style={s.modelChips}>
                  {BOTANICAL_INFO.commonNames.map((n) => (
                    <View key={n} style={[s.chip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
                      <Text style={[s.chipText, { color: colors.primary }]}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>

            {/* ── Key Science Stats ── */}
            <View style={[s.statsGrid, isMobile && s.statsGridMobile]}>
              {SCIENCE_SUMMARY.map((st, idx) => (
                <StatsCard key={st.label} icon={st.icon} label={st.label} value={st.value} color={st.color} delay={200 + idx * 80} />
              ))}
            </View>

            {/* ── Seed-to-Oil Ratio ── */}
            <Card colors={colors} delay={350}>
              <CardTitle icon="水" title="Seed-to-Oil Ratio" subtitle="From fruit to oil — extraction chain" colors={colors}
                right={<View style={[s.chip, { backgroundColor: '#22c55e15', borderColor: '#22c55e30' }]}><Text style={[s.chipText, { color: '#22c55e' }]}>{SEED_TO_OIL.overallKernelOilContent}% oil</Text></View>}
              />
              <View style={{ gap: Spacing.sm }}>
                <StatRow icon="leaf" label="Kernel Oil Content" value={`${SEED_TO_OIL.overallKernelOilContent}%`} color="#22c55e" colors={colors} />
                <StatRow icon="cut" label="Kernel-to-Fruit Ratio" value={`${(SEED_TO_OIL.kernelToFruitRatio * 100).toFixed(0)}%`} color="#3b82f6" colors={colors} />
                <StatRow icon="flask" label="Recovery Efficiency" value={`${(SEED_TO_OIL.oilRecoveryEfficiency * 100).toFixed(0)}%`} color="#f97316" colors={colors} />
                <StatRow icon="leaf" label="Fruit/Tree/Year" value={`${SEED_TO_OIL.typicalYieldPerTree.kgFruitPerYear} kg`} color="#7c3aed" colors={colors} />
                <StatRow icon="water" label="Oil/Tree/Year" value={`~${SEED_TO_OIL.typicalYieldPerTree.litersOilPerYear} L`} color="#14b8a6" colors={colors} />
              </View>
              <View style={[s.extractionTable, { borderTopColor: colors.divider }]}>
                <Text style={[s.extractTableTitle, { color: colors.text }]}>Extraction Methods</Text>
                {SEED_TO_OIL.extractionMethods.map((m, idx) => (
                  <Animated.View key={m.method} entering={FadeInUp.delay(400 + idx * 50).duration(280)} style={[s.extractRow, idx < SEED_TO_OIL.extractionMethods.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                    <Text style={[s.extractMethod, { color: colors.text }]}>{m.method}</Text>
                    <Text style={[s.extractYield, { color: colors.primary }]}>{m.yield}</Text>
                    <Text style={[s.extractQuality, { color: colors.textTertiary }]}>{m.quality}</Text>
                  </Animated.View>
                ))}
              </View>
            </Card>

            {/* ── Nutritional + Fatty Acid ── */}
            <View style={[s.splitRow, isMobile && s.splitRowMobile]}>
              <Card colors={colors} delay={450} style={{ flex: 1 }}>
                <CardTitle icon="nutrition" title="Nutritional Composition" subtitle="Per 100g kernel" colors={colors} />
                {Object.values(NUTRITIONAL_DATA).map((n, idx) => (
                  <ProgressBar
                    key={n.label}
                    label={n.label}
                    value={n.value}
                    maxValue={n.unit === 'kcal' ? 800 : 100}
                    suffix={n.unit === 'kcal' ? ' kcal' : '%'}
                    color={idx === 0 ? '#3b82f6' : idx === 1 ? '#22c55e' : idx === 2 ? '#f97316' : '#7c3aed'}
                    colors={colors}
                    delay={500 + idx * 40}
                  />
                ))}
              </Card>

              <Card colors={colors} delay={500} style={{ flex: 1 }}>
                <CardTitle icon="flask" title="Fatty Acid Profile" subtitle="Major fatty acids in kernel oil" colors={colors} />
                {FATTY_ACID_PROFILE.map((fa, idx) => (
                  <ProgressBar
                    key={fa.name}
                    label={fa.name}
                    value={fa.percentage}
                    maxValue={40}
                    suffix="%"
                    color={fa.type === 'Saturated' ? '#ef4444' : fa.type === 'Monounsaturated' ? '#22c55e' : fa.type === 'Polyunsaturated' ? '#3b82f6' : '#9ca3af'}
                    colors={colors}
                    delay={550 + idx * 40}
                  />
                ))}
                <View style={[s.faLegend, { borderTopColor: colors.divider }]}>
                  {['Saturated', 'Monounsaturated', 'Polyunsaturated'].map((t) => (
                    <View key={t} style={s.faLegendItem}>
                      <View style={[s.faLegendDot, { backgroundColor: t === 'Saturated' ? '#ef4444' : t === 'Monounsaturated' ? '#22c55e' : '#3b82f6' }]} />
                      <Text style={[s.faLegendText, { color: colors.textTertiary }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>

            {/* ── Oil Yield by Stage (Expanded with research ranges) ── */}
            <Card colors={colors} delay={600}>
              <CardTitle icon="bar-chart" title="Oil Yield by Maturity Stage" subtitle="Research ranges vs system measurements" colors={colors} />
              {['GREEN', 'YELLOW', 'BROWN'].map((cat, idx) => {
                const sci = OIL_YIELD_DATA[cat];
                const sys = yieldData[cat] || {};
                return (
                  <Animated.View key={cat} entering={FadeInUp.delay(650 + idx * 60).duration(280)} style={[s.oilYieldCompare, { borderColor: sci.colorHex + '20' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <View style={[s.oilDot, { backgroundColor: sci.colorHex }]} />
                      <Text style={[s.oilLabel, { color: colors.text }]}>{sci.label}</Text>
                    </View>
                    <View style={s.oilCompareRow}>
                      <View style={s.oilCompareCol}>
                        <Text style={[s.oilCompareHeader, { color: colors.textTertiary }]}>Research Range</Text>
                        <Text style={[s.oilCompareVal, { color: sci.colorHex }]}>{sci.oilYieldRange[0]}–{sci.oilYieldRange[1]}%</Text>
                      </View>
                      <View style={s.oilCompareCol}>
                        <Text style={[s.oilCompareHeader, { color: colors.textTertiary }]}>System Avg</Text>
                        <Text style={[s.oilCompareVal, { color: colors.primary }]}>{sys.avg != null ? `${num(sys.avg)}%` : '—'}</Text>
                      </View>
                      <View style={s.oilCompareCol}>
                        <Text style={[s.oilCompareHeader, { color: colors.textTertiary }]}>System Range</Text>
                        <Text style={[s.oilCompareVal, { color: colors.text }]}>{sys.min != null ? `${num(sys.min)}–${num(sys.max)}%` : '—'}</Text>
                      </View>
                    </View>
                    <Text style={[s.oilDesc, { color: colors.textTertiary }]}>{sci.description}</Text>
                  </Animated.View>
                );
              })}
            </Card>

            {/* ── Uses of Talisay Oil ── */}
            <Card colors={colors} delay={700}>
              <CardTitle icon="list" title="Uses of Talisay Oil" colors={colors} />
              {BOTANICAL_INFO.usesOfOil.map((use, idx) => (
                <Animated.View key={use} entering={FadeInUp.delay(750 + idx * 40).duration(280)} style={s.useItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={[s.useText, { color: colors.textSecondary }]}>{use}</Text>
                </Animated.View>
              ))}
            </Card>

            {/* ── Dimension Ranges ── */}
            <Card colors={colors} delay={750}>
              <CardTitle icon="resize" title="Physical Dimension Ranges" subtitle="Expected ranges from research literature" colors={colors} />
              {Object.values(DIMENSION_RANGES).map((d, idx) => (
                <ProgressBar
                  key={d.label}
                  label={`${d.label} (${d.min}–${d.max} ${d.unit})`}
                  value={d.max}
                  maxValue={d.unit === 'g' && d.max > 10 ? 70 : d.unit === 'g' ? 1 : 10}
                  suffix={` ${d.unit}`}
                  color={['#3b82f6', '#22c55e', '#f97316', '#7c3aed'][idx]}
                  colors={colors}
                  delay={800 + idx * 50}
                />
              ))}
            </Card>
          </View>
        )}

        {/* ═══════════════════════════
            TAB: REPORTS
            ═══════════════════════════ */}
        {activeTab === 'reports' && (
          <ReportsTab
            historyItems={historyItems}
            analytics={analytics}
            users={users}
            colors={colors}
            isMobile={isMobile}
          />
        )}
      </View>

      <View style={{ height: Spacing.xxxl * 2 }} />
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 200 },
  loadingText: { ...Typography.caption, marginTop: Spacing.md },

  /* Page header */
  pageHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xxl, paddingTop: Spacing.xl },
  headerContent: { gap: Spacing.sm },
  headerContentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' },
  headerIcon: { width: 52, height: 52, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 600 },
  content: { padding: Spacing.lg },
  contentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: Spacing.xxl },

  /* Tabs */
  tabBar: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabLabel: { ...Typography.small, fontWeight: '600' },

  /* Stats grid */
  statsGrid: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', marginBottom: Spacing.md },
  statsGridMobile: { gap: Spacing.sm },

  /* Card */
  card: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.xs, flexWrap: 'wrap' },
  cardTitleIcon: { width: 28, height: 28, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...Typography.h4 },
  cardSubtitle: { ...Typography.small, marginTop: 2, marginLeft: 40 },

  /* Split row */
  splitRow: { flexDirection: 'row', gap: Spacing.md },
  splitRowMobile: { flexDirection: 'column' },

  /* Maturity distribution */
  maturityGrid: { gap: Spacing.sm },
  maturityItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  maturityDot: { width: 12, height: 12, borderRadius: 6 },
  maturityLabel: { ...Typography.caption, flex: 1 },
  maturityCount: { ...Typography.bodyMedium, minWidth: 40, textAlign: 'right' },
  maturityPct: { ...Typography.captionMedium, minWidth: 50, textAlign: 'right' },
  maturityBar: { width: 60, height: 6, borderRadius: 3, overflow: 'hidden' },
  maturityBarFill: { height: '100%', borderRadius: 3 },

  /* Yield classification */
  yieldClassRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  yieldClassItem: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  yieldClassBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  yieldClassVal: { ...Typography.h2, letterSpacing: -0.5 },
  yieldClassLabel: { ...Typography.captionMedium },
  yieldClassDetail: { ...Typography.small },
  yieldClassDivider: { width: 1, height: 80 },

  /* Oil yield rows */
  yieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0 },
  yieldDot: { width: 10, height: 10, borderRadius: 5 },
  yieldRowLabel: { ...Typography.captionMedium, marginBottom: 2 },
  yieldRowStats: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  yieldRowStat: { ...Typography.small },
  yieldOverallRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md, marginTop: Spacing.sm, borderTopWidth: 1 },
  yieldOverallLabel: { ...Typography.caption },
  yieldOverallVal: { ...Typography.bodyMedium, fontWeight: '700' },

  /* Accuracy note */
  accuracyNote: { ...Typography.small, textAlign: 'center', marginTop: Spacing.sm },

  /* Activity */
  activityList: { gap: 0 },
  activityItem: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'flex-start' },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityContent: { flex: 1, gap: 2 },
  activityText: { ...Typography.caption, lineHeight: 19 },
  activityMeta: { flexDirection: 'row', gap: Spacing.md },
  activityTag: { ...Typography.small },

  /* Bar chart */
  barChartWrap: { marginTop: Spacing.sm },
  barChartInner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 6, paddingHorizontal: 4 },
  barCol: { alignItems: 'center', gap: 0, minWidth: 24, maxWidth: 48, flex: 1 },
  barVal: { ...Typography.tiny, textAlign: 'center', marginBottom: 5 },
  barTrack: { width: 22, maxWidth: 22, borderRadius: BorderRadius.xs, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: BorderRadius.xs },
  barLbl: { ...Typography.tiny, textAlign: 'center', marginTop: 4 },
  tooltip: { position: 'absolute', bottom: '100%', left: -20, width: 100, padding: Spacing.xs, borderRadius: BorderRadius.sm, borderWidth: 1, ...Shadows.lg, zIndex: 10 },
  tooltipTitle: { ...Typography.tiny, fontWeight: '600' },
  tooltipVal: { ...Typography.small, fontWeight: '700' },
  tooltipDetail: { ...Typography.tiny },

  /* Progress bar */
  progressRow: { gap: 4, marginBottom: Spacing.sm },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { ...Typography.small, flex: 1 },
  progressValue: { ...Typography.smallMedium },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  /* Gauge */
  gaugeWrap: { alignItems: 'center', gap: Spacing.xs },
  gaugeOuter: { borderRadius: 999, borderWidth: 3, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  gaugeInner: { width: '70%', height: '70%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  gaugeVal: { fontWeight: '700' },
  gaugeArc: { position: 'absolute', borderWidth: 3, borderRadius: 999, top: -3, left: -3 },
  gaugeLbl: { ...Typography.tiny, textAlign: 'center' },
  gaugeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },

  /* Stat row */
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, flexWrap: 'wrap' },
  statRowIcon: { width: 26, height: 26, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  statRowLabel: { ...Typography.small, flex: 1, minWidth: 80 },
  statRowValue: { ...Typography.smallMedium, flexShrink: 1, textAlign: 'right', maxWidth: '50%' },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, marginTop: Spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...Typography.h3 },

  /* Confidence summary */
  confSummary: { borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.md, gap: Spacing.xs },

  /* Dimension row */
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.xs, flexWrap: 'wrap' },
  dimDot: { width: 10, height: 10, borderRadius: 5 },
  dimLabel: { ...Typography.captionMedium, minWidth: 80, flexShrink: 0 },
  dimStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, minWidth: 140 },
  dimStat: { ...Typography.small },

  /* User row */
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  userRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  userRankText: { ...Typography.smallMedium },
  userEmail: { ...Typography.captionMedium },
  userSub: { ...Typography.small },
  userScans: { ...Typography.captionMedium },

  /* Model card */
  modelCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modelIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  modelName: { ...Typography.bodyMedium },
  modelType: { ...Typography.small, fontWeight: '600' },
  modelDetails: { marginTop: Spacing.md, gap: Spacing.sm, paddingTop: Spacing.sm },
  modelDesc: { ...Typography.caption, lineHeight: 20 },
  modelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  chipText: { ...Typography.small, fontWeight: '500' },

  /* Science - common names */
  commonNamesWrap: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.md },
  commonNamesLabel: { ...Typography.caption, marginBottom: Spacing.sm },

  /* Oil yield compare */
  oilYieldCompare: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm, gap: Spacing.sm },
  oilDot: { width: 12, height: 12, borderRadius: 6 },
  oilLabel: { ...Typography.bodyMedium },
  oilCompareRow: { flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' },
  oilCompareCol: { gap: 2 },
  oilCompareHeader: { ...Typography.tiny },
  oilCompareVal: { ...Typography.captionMedium, fontWeight: '700' },
  oilDesc: { ...Typography.small },

  /* Extraction table */
  extractionTable: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.md },
  extractTableTitle: { ...Typography.captionMedium, marginBottom: Spacing.sm },
  extractRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, flexWrap: 'wrap' },
  extractMethod: { ...Typography.captionMedium, minWidth: 90, flexShrink: 0 },
  extractYield: { ...Typography.captionMedium, minWidth: 60, flexShrink: 0 },
  extractQuality: { ...Typography.small, flex: 1, minWidth: 80 },

  /* Fatty acid legend */
  faLegend: { flexDirection: 'row', gap: Spacing.md, borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  faLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  faLegendDot: { width: 8, height: 8, borderRadius: 4 },
  faLegendText: { ...Typography.tiny },

  /* Use list */
  useItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  useText: { ...Typography.caption },

  /* Empty */
  emptyText: { ...Typography.caption, textAlign: 'center', paddingVertical: Spacing.lg },

  /* DataTable */
  dataTableTopBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  searchInput: { flex: 1, ...Typography.caption, padding: 0, outlineStyle: 'none' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md },
  refreshBtnText: { ...Typography.small, fontWeight: '600' },

  dtHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, gap: Spacing.xs },
  dtHeaderCell: { ...Typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dtRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, gap: Spacing.xs, minHeight: 44 },
  dtCell: { ...Typography.small },
  dtFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1, marginTop: Spacing.xs },
  dtFooterText: { ...Typography.small },

  /* User DataTable columns */
  dtCellName: { flex: 1.2, minWidth: 80 },
  dtCellEmail: { flex: 2, minWidth: 120 },
  dtCellRole: { width: 70, alignItems: 'center' },
  dtCellStatus: { width: 80, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dtCellStatusText: { ...Typography.tiny },
  dtCellDate: { width: 80 },
  dtCellActions: { width: 70, alignItems: 'center' },
  dtActionsRow: { flexDirection: 'row', gap: 6 },

  /* History DataTable columns */
  dtCellUser: { flex: 1.5, minWidth: 100 },
  dtCellCategory: { width: 90 },
  dtCellConf: { width: 75, textAlign: 'right' },
  dtCellYield: { width: 75, textAlign: 'right' },
  dtCellDel: { width: 50, alignItems: 'center' },

  /* Badges */
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  roleBadgeText: { ...Typography.tiny, fontWeight: '600' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryBadgeText: { ...Typography.tiny, fontWeight: '600' },

  /* Action buttons */
  dtActionBtn: { width: 28, height: 28, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalContent: { width: '100%', maxWidth: 420, padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1, ...Shadows.lg },
  modalTitle: { ...Typography.h3, marginBottom: 4 },
  modalSubtitle: { ...Typography.caption, marginBottom: Spacing.lg },
  modalField: { marginBottom: Spacing.md },
  modalLabel: { ...Typography.small, fontWeight: '600', marginBottom: 6 },
  modalInput: { padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, ...Typography.caption },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { ...Typography.captionMedium },
  modalDeleteIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  roleToggleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  roleToggleText: { ...Typography.captionMedium },
});
