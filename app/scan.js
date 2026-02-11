/**
 * Talisay AI — Scan Page (ML-Powered)
 * Full image analysis with single & side-by-side comparison modes.
 * Comparison mode: left = existing dataset baseline, right = user's own image.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { TALISAY_TYPES } from '../data/talisayTypes';
import * as mlService from '../services/mlService';
import { historyService } from '../services/historyService';
import { uploadImageToCloudinary } from '../services/uploadService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Carousel data derived from talisayTypes ───
const CAROUSEL_SLIDES = TALISAY_TYPES.map((t) => ({
  name: t.name,
  image: t.carousel[0]?.image,
  placeholderColor: t.carousel[0]?.placeholderColor ?? '#1e3a5f',
}));
const CAROUSEL_INTERVAL_MS = 4000;

// ─── Helpers ───
const getCategoryColor = (cat) => {
  switch (cat?.toUpperCase()) {
    case 'GREEN': return '#22c55e';
    case 'YELLOW': return '#eab308';
    case 'BROWN': return '#92400e';
    default: return '#6b7280';
  }
};

// ─── Floating Orb ───
function FloatingOrb({ delay = 0, size = 60, color, top, left, right }) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -12]) },
      { scale: interpolate(float.value, [0, 1], [1, 1.06]) },
    ],
    opacity: interpolate(float.value, [0, 0.5, 1], [0.12, 0.22, 0.12]),
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, top, left, right },
        animStyle,
      ]}
    />
  );
}

// ─── ML Status Badge ───
function MLStatusBadge({ available, onRefresh, colors }) {
  const scale = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onRefresh}
      onPressIn={() => { scale.value = withSpring(0.92); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[badgeStyle, styles.mlBadge, { backgroundColor: available ? '#22c55e' : '#ef4444' }]}
    >
      <Ionicons name={available ? 'cloud-done' : 'cloud-offline'} size={14} color="#fff" />
      <Text style={styles.mlBadgeText}>{available ? 'ML Online' : 'Offline'}</Text>
    </AnimatedPressable>
  );
}

// ─── Mode Toggle ───
function ModeToggle({ mode, setMode, reset, colors }) {
  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.modeRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
      {[
        { key: 'single', icon: 'image', label: 'Single Analysis' },
        { key: 'comparison', icon: 'git-compare', label: 'Side-by-Side' },
      ].map((item) => {
        const active = mode === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => { setMode(item.key); reset(); }}
            style={[styles.modeBtn, active && { backgroundColor: colors.primary, ...Shadows.sm }]}
          >
            <Ionicons name={item.icon} size={15} color={active ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, { color: active ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

// ─── Image Picker Card (for user's own images) ───
function ImagePickerCard({ title, subtitle, imageUri, onPickImage, onTakePhoto, onClear, loading, progressMessage, delay = 0, colors, isDark }) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(14)} style={[cardStyle, styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      {/* Header */}
      <View style={styles.pickerHeader}>
        <View style={[styles.pickerIconWrap, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="image" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.pickerSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.pickerBtnRow}>
        <Pressable onPress={onPickImage} style={[styles.pickerBtn, { borderColor: colors.borderLight }]}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
          <Text style={[styles.pickerBtnText, { color: colors.text }]}>Gallery</Text>
        </Pressable>
        <Pressable onPress={onTakePhoto} style={[styles.pickerBtn, { borderColor: colors.borderLight }]}>
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
          <Text style={[styles.pickerBtnText, { color: colors.text }]}>Camera</Text>
        </Pressable>
      </View>

      {/* Preview */}
      {imageUri ? (
        <View style={styles.previewArea}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          {loading && (
            <View style={styles.previewOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.overlayText}>{progressMessage || 'Analyzing...'}</Text>
            </View>
          )}
          <Pressable onPress={onClear} style={[styles.clearBtn, { borderColor: colors.borderLight }]}>
            <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.emptyPreview, { borderColor: colors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <Ionicons name="leaf-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Select or capture a fruit image</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Existing Dataset Card (read-only, left side of comparison) ───
function ExistingDatasetCard({ imageUri, imageName, totalImages, loading, selectedColor, onColorChange, delay = 0, colors, isDark, error }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(14)} style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      {/* Header */}
      <View style={styles.pickerHeader}>
        <View style={[styles.pickerIconWrap, { backgroundColor: '#3b82f6' + '15' }]}>
          <Ionicons name="server" size={18} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Averaged Baseline</Text>
          <Text style={[styles.pickerSubtitle, { color: colors.textTertiary }]}>
            Statistical average from training dataset
          </Text>
        </View>
      </View>

      {/* Color selector */}
      <View style={styles.colorSelectorRow}>
        {['green', 'yellow', 'brown'].map((c) => {
          const active = selectedColor === c;
          return (
            <Pressable
              key={c}
              onPress={() => onColorChange(c)}
              style={[
                styles.colorSelectorBtn,
                { borderColor: active ? getCategoryColor(c.toUpperCase()) : colors.borderLight },
                active && { backgroundColor: getCategoryColor(c.toUpperCase()) + '18' },
              ]}
            >
              <View style={[styles.colorDot, { backgroundColor: getCategoryColor(c.toUpperCase()) }]} />
              <Text style={[styles.colorSelectorText, { color: active ? getCategoryColor(c.toUpperCase()) : colors.textSecondary }]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Preview */}
      {error ? (
        <View style={[styles.emptyPreview, { borderColor: '#ef4444', backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)' }]}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text style={[styles.emptyText, { color: '#ef4444', marginTop: 8 }]}>Failed to load baseline</Text>
          <Text style={[styles.emptyText, { color: colors.textTertiary, fontSize: 12, marginTop: 4 }]}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.emptyPreview, { borderColor: colors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Computing averaged baseline...</Text>
        </View>
      ) : imageUri ? (
        <View style={styles.previewArea}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={[styles.datasetInfoBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.55)' }]}>
            <Ionicons name="stats-chart" size={12} color="#fff" />
            <Text style={styles.datasetInfoText} numberOfLines={1}>
              {imageName || 'Averaged baseline'}
            </Text>
            {totalImages > 0 && (
              <Text style={styles.datasetCountText}>{totalImages} images</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyPreview, { borderColor: colors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <Ionicons name="analytics-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Click "Compare" to compute averaged baseline</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Detail Card (expandable result section) ───
function DetailCard({ icon, iconColor, title, children, delay = 0, colors }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      style={[styles.detailCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}
    >
      <View style={styles.detailCardHeader}>
        <View style={[styles.detailIconWrap, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.detailCardTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

// ─── Single Result Display ───
function ResultDisplay({ result, imageUri, imageName, showDetails, setShowDetails, colors, isDark, isDesktop, label }) {
  if (!result) return null;

  return (
    <Animated.View entering={FadeInUp.springify().damping(14)} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      {/* Label badge (for comparison) */}
      {label && (
        <View style={[styles.resultLabelBadge, { backgroundColor: colors.primary + '12' }]}>
          <Text style={[styles.resultLabelText, { color: colors.primary }]}>{label}</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.resultHeader, isDesktop && styles.resultHeaderDesktop]}>
        {/* Image Column */}
        <View style={styles.resultImageCol}>
          <Image source={{ uri: imageUri }} style={styles.resultImg} resizeMode="contain" />
          <Text style={[styles.fileName, { color: colors.textTertiary }]} numberOfLines={1}>{imageName || 'Image'}</Text>
        </View>

        {/* Main Info Column */}
        <View style={styles.resultInfoCol}>
          {/* Oil Yield */}
          <View style={styles.yieldDisplay}>
            <Text style={[styles.yieldPercent, { color: colors.text }]}>
              {Math.round(result.oilYieldPercent || 0)}%
            </Text>
            <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Oil Yield</Text>
          </View>

          {/* Category Badge */}
          <View style={[styles.catBadge, { backgroundColor: getCategoryColor(result.category) }]}>
            <Text style={styles.catBadgeText}>{result.category || 'Unknown'}</Text>
            <Text style={styles.catBadgeConf}>
              {result.colorConfidence ? Math.round(result.colorConfidence * 100) : 0}%
            </Text>
          </View>
        </View>
      </View>

      {/* Toggle Details */}
      <Pressable onPress={() => setShowDetails(!showDetails)} style={[styles.expandBtn, { borderColor: colors.borderLight }]}>
        <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        <Text style={[styles.expandBtnText, { color: colors.primary }]}>{showDetails ? 'Hide Details' : 'Show Details'}</Text>
      </Pressable>

      {showDetails ? (
        <View style={styles.detailsWrap}>
          {/* Color Classification */}
          <DetailCard icon="color-palette" iconColor={colors.primary} title="Color Classification" colors={colors}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Detected</Text>
              <Text style={[styles.detailValue, { color: getCategoryColor(result.category) }]}>{result.category}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Confidence</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{result.colorConfidence ? Math.round(result.colorConfidence * 100) : 0}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Maturity</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{result.maturityStage || 'Unknown'}</Text>
            </View>
            {result.hasSpots && (
              <View style={[styles.spotBadge, { backgroundColor: '#f97316' + '15' }]}>
                <Ionicons name="alert-circle" size={14} color="#f97316" />
                <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600' }}>
                  Spots detected ({result.spotCoverage?.toFixed(1) || 0}% coverage)
                </Text>
              </View>
            )}
          </DetailCard>

          {/* Dimensions */}
          {result.dimensions && Object.keys(result.dimensions).length > 0 && (
            <DetailCard icon="resize" iconColor="#3b82f6" title="Dimensions" delay={100} colors={colors}>
              <View style={styles.dimGrid}>
                {result.dimensions.length_cm != null && (
                  <View style={[styles.dimCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.dimCellLabel, { color: colors.textTertiary }]}>Length</Text>
                    <Text style={[styles.dimCellValue, { color: colors.text }]}>{result.dimensions.length_cm.toFixed(2)} cm</Text>
                  </View>
                )}
                {result.dimensions.width_cm != null && (
                  <View style={[styles.dimCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.dimCellLabel, { color: colors.textTertiary }]}>Width</Text>
                    <Text style={[styles.dimCellValue, { color: colors.text }]}>{result.dimensions.width_cm.toFixed(2)} cm</Text>
                  </View>
                )}
                {result.dimensions.kernel_mass_g != null && (
                  <View style={[styles.dimCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.dimCellLabel, { color: colors.textTertiary }]}>Kernel Mass</Text>
                    <Text style={[styles.dimCellValue, { color: colors.text }]}>{result.dimensions.kernel_mass_g.toFixed(3)} g</Text>
                  </View>
                )}
                {result.dimensions.whole_fruit_weight_g != null && (
                  <View style={[styles.dimCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                    <Text style={[styles.dimCellLabel, { color: colors.textTertiary }]}>Fruit Weight</Text>
                    <Text style={[styles.dimCellValue, { color: colors.text }]}>{result.dimensions.whole_fruit_weight_g.toFixed(1)} g</Text>
                  </View>
                )}
              </View>
            </DetailCard>
          )}

          {/* Oil Yield */}
          <DetailCard icon="water" iconColor="#22c55e" title="Oil Yield Prediction" delay={150} colors={colors}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Predicted</Text>
              <Text style={[styles.detailValue, { color: colors.text, fontSize: 18, fontWeight: '800' }]}>{result.oilYieldPercent?.toFixed(1) || 0}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{result.yieldCategory || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Confidence</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{Math.round((result.oilConfidence || result.overallConfidence || 0) * 100)}%</Text>
            </View>
          </DetailCard>

          {/* Interpretation */}
          {result.interpretation && (
            <DetailCard icon="bulb" iconColor="#f59e0b" title="Interpretation" delay={200} colors={colors}>
              <Text style={[styles.interpText, { color: colors.textSecondary }]}>{result.interpretation}</Text>
            </DetailCard>
          )}
        </View>
      ) : (
        /* Compact view */
        <View style={styles.compactView}>
          {result.dimensions && (
            <View style={styles.compactDims}>
              <View style={[styles.compactDimItem, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.compactDimVal, { color: colors.text }]}>{result.dimensions.length_cm?.toFixed(1) || '—'}</Text>
                <Text style={[styles.compactDimLbl, { color: colors.textTertiary }]}>L(cm)</Text>
              </View>
              <View style={[styles.compactDimItem, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.compactDimVal, { color: colors.text }]}>{result.dimensions.width_cm?.toFixed(1) || '—'}</Text>
                <Text style={[styles.compactDimLbl, { color: colors.textTertiary }]}>W(cm)</Text>
              </View>
              <View style={[styles.compactDimItem, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.compactDimVal, { color: colors.text }]}>{result.dimensions.whole_fruit_weight_g?.toFixed(0) || '—'}</Text>
                <Text style={[styles.compactDimLbl, { color: colors.textTertiary }]}>Wt(g)</Text>
              </View>
            </View>
          )}
          {result.interpretation && (
            <Text style={[styles.compactInterp, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]} numberOfLines={3}>{result.interpretation}</Text>
          )}
        </View>
      )}

      {/* Timing */}
      {result.timing && (
        <Text style={[styles.timingText, { color: colors.textTertiary }]}>
          Completed in {result.timing.totalSeconds}s
        </Text>
      )}
    </Animated.View>
  );
}

// ─── Comparison Summary Card ───
function ComparisonSummary({ result1, result2, colors }) {
  if (!result1 || !result2) return null;
  const yieldDiff = (result2.oilYieldPercent || 0) - (result1.oilYieldPercent || 0);
  const catMatch = result1.category === result2.category;
  const avgConf = Math.round(((result1.colorConfidence || 0) + (result2.colorConfidence || 0)) * 50);

  return (
    <Animated.View
      entering={FadeInUp.delay(300).springify()}
      style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.primary + '25' }]}
    >
      <View style={styles.summaryHeader}>
        <Ionicons name="analytics" size={20} color={colors.primary} />
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Comparison Summary</Text>
      </View>
      {[
        { label: 'Oil Yield Difference', value: `${yieldDiff > 0 ? '+' : ''}${yieldDiff.toFixed(1)}%`, color: Math.abs(yieldDiff) > 5 ? '#ef4444' : '#22c55e' },
        { label: 'Category Match', value: catMatch ? '✅ Same' : '❌ Different', color: colors.text },
        { label: 'Avg Confidence', value: `${avgConf}%`, color: colors.text },
        { label: 'Baseline (Averaged)', value: `${(result1.oilYieldPercent || 0).toFixed(1)}% oil`, color: '#3b82f6' },
        { label: 'Your Image', value: `${(result2.oilYieldPercent || 0).toFixed(1)}% oil`, color: colors.primary },
      ].map((row, i) => (
        <View key={i} style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{row.label}</Text>
          <Text style={[styles.summaryValue, { color: row.color }]}>{row.value}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Carousel Card ───
function CarouselCard({ slides, index, setIndex, colors, isDark }) {
  const slide = slides[index];
  return (
    <Animated.View
      entering={FadeInUp.delay(300).springify()}
      style={[styles.carouselCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      <Text style={[styles.carouselTitle, { color: colors.text }]}>Talisay Fruit / Seed Colors</Text>
      <Text style={[styles.carouselDesc, { color: colors.textSecondary }]}>Reference images for the types we analyze.</Text>
      <View style={styles.carouselImageWrap}>
        {slide.image ? (
          <Image source={slide.image} style={styles.carouselImage} resizeMode="cover" />
        ) : (
          <View style={[styles.carouselImage, { backgroundColor: slide.placeholderColor }]} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.carouselOverlay}>
          <Text style={styles.carouselName}>{slide.name}</Text>
        </LinearGradient>
      </View>
      <View style={styles.carouselDots}>
        {slides.map((_, i) => (
          <Pressable key={i} onPress={() => setIndex(i)}>
            <View style={[styles.dot, i === index && { backgroundColor: colors.primary, transform: [{ scale: 1.3 }] }, i !== index && { backgroundColor: colors.textTertiary + '50' }]} />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════
// ─── MAIN SCAN PAGE ───
// ════════════════════════════════════════════════
export default function ScanPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isMobile, isDesktop } = useResponsive();

  // ─── State ───
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [capturedImageName, setCapturedImageName] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [mlBackendAvailable, setMlBackendAvailable] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Mode
  const [mode, setMode] = useState('single');

  // Comparison state
  const [existingColor, setExistingColor] = useState('green');
  const [existingImageUri, setExistingImageUri] = useState(null);
  const [existingImageName, setExistingImageName] = useState(null);
  const [existingTotalImages, setExistingTotalImages] = useState(0);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState(null);
  const [image2Uri, setImage2Uri] = useState(null);
  const [image2Name, setImage2Name] = useState(null);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [showDetails1, setShowDetails1] = useState(false);
  const [showDetails2, setShowDetails2] = useState(false);
  const [progressMessage2, setProgressMessage2] = useState('');
  
  // Cloudinary URLs for uploaded images
  const [capturedCloudinaryUrl, setCapturedCloudinaryUrl] = useState(null);
  const [image2CloudinaryUrl, setImage2CloudinaryUrl] = useState(null);

  // ─── Effects ───
  useEffect(() => {
    checkMLBackend();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length), CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  async function checkMLBackend() {
    const available = await mlService.isMLBackendAvailable();
    setMlBackendAvailable(available);
  }

  const reset = () => {
    setCapturedImageUri(null); setCapturedImageName(null); setCapturedCloudinaryUrl(null);
    setAnalysisResult(null); setError(null); setShowDetails(false); setProgressMessage('');
    setExistingImageUri(null); setExistingImageName(null); setExistingTotalImages(0);
    setImage2Uri(null); setImage2Name(null); setImage2CloudinaryUrl(null);
    setResult1(null); setResult2(null);
    setShowDetails1(false); setShowDetails2(false);
  };

  // ─── Image Picking (only for single mode and comparison right side) ───
  const pickImage = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop().split('?')[0] || 'image.jpg';
      if (mode === 'comparison') {
        setImage2Uri(asset.uri); setImage2Name(fileName);
        setImage2CloudinaryUrl(null); // Reset cloudinary URL
      } else {
        setCapturedImageUri(asset.uri); setCapturedImageName(fileName);
        setCapturedCloudinaryUrl(null); // Reset cloudinary URL
      }
    }
  };

  const takePhoto = async () => {
    setError(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setError('Camera permission is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || 'photo.jpg';
      if (mode === 'comparison') {
        setImage2Uri(asset.uri); setImage2Name(fileName);
        setImage2CloudinaryUrl(null); // Reset cloudinary URL
      } else {
        setCapturedImageUri(asset.uri); setCapturedImageName(fileName);
        setCapturedCloudinaryUrl(null); // Reset cloudinary URL
      }
    }
  };

  // ─── Analysis ───
  const handleAnalyze = async () => {
    if (mode === 'single' && !capturedImageUri) return;
    if (mode === 'comparison' && !image2Uri) { setError('Please select your own image to compare.'); return; }

    setLoading(true); setError(null);
    setAnalysisResult(null); setResult1(null); setResult2(null);
    setProgressMessage('Starting analysis...');

    try {
      // Upload images to Cloudinary if authenticated and not already uploaded
      // Use local variables to avoid React state timing issues
      let resolvedCloudinaryUrl = capturedCloudinaryUrl;
      let resolvedImage2CloudinaryUrl = image2CloudinaryUrl;

      if (isAuthenticated) {
        if (mode === 'single' && capturedImageUri && !resolvedCloudinaryUrl) {
          setProgressMessage('Uploading image...');
          const uploadResult = await uploadImageToCloudinary(capturedImageUri);
          if (uploadResult.success) {
            resolvedCloudinaryUrl = uploadResult.imageUrl;
            setCapturedCloudinaryUrl(uploadResult.imageUrl);
          }
        } else if (mode === 'comparison' && image2Uri && !resolvedImage2CloudinaryUrl) {
          setProgressMessage('Uploading image...');
          const uploadResult = await uploadImageToCloudinary(image2Uri);
          if (uploadResult.success) {
            resolvedImage2CloudinaryUrl = uploadResult.imageUrl;
            setImage2CloudinaryUrl(uploadResult.imageUrl);
          }
        }
      }

      if (mode === 'single') {
        const res = await mlService.analyzeImage(capturedImageUri, {
          onProgress: (_, msg) => setProgressMessage(msg),
        });
        if (res.success) {
          // Check if the image was rejected as "not a Talisay fruit"
          if (res.isTalisay === false) {
            setError('Not a Talisay fruit. Please upload an image with a Talisay fruit in it.');
            setAnalysisResult(null);
          } else {
            setAnalysisResult(res); setProgressMessage('');
            if (isAuthenticated) {
              historyService.saveHistoryItem({
                analysisType: 'single', imageName: capturedImageName || 'image.jpg',
                imageUri: resolvedCloudinaryUrl || capturedImageUri, category: res.category || 'BROWN',
                maturityStage: res.maturityStage, confidence: res.overallConfidence ?? res.colorConfidence,
                colorConfidence: res.colorConfidence, fruitConfidence: res.fruitConfidence,
                oilConfidence: res.oilConfidence, oilYieldPercent: res.oilYieldPercent,
                yieldCategory: res.yieldCategory, dimensions: res.dimensions,
                dimensionsSource: res.dimensionsSource, referenceDetected: res.referenceDetected,
                coinInfo: res.coinInfo, interpretation: res.interpretation,
                hasSpots: res.hasSpots, spotCoverage: res.spotCoverage,
                colorProbabilities: res.raw?.color_probabilities,
              }).catch(() => {});
            }
          }
        } else {
          setError(res.error || 'Analysis failed. Is the ML backend running on port 5001?');
        }
      } else {
        // Comparison: Load existing dataset + analyze user's image in parallel
        setExistingLoading(true);
        setProgressMessage2('Starting...');

        const [existingRes, userRes] = await Promise.allSettled([
          mlService.getExistingDatasetAnalysis(existingColor),
          mlService.analyzeImage(image2Uri, { onProgress: (_, m) => setProgressMessage2(m) }),
        ]);

        const res1 = existingRes.status === 'fulfilled' ? existingRes.value : { success: false, error: existingRes.reason?.message || 'Failed' };
        const res2 = userRes.status === 'fulfilled' ? userRes.value : { success: false, error: userRes.reason?.message || 'Failed' };

        if (res1.success) {
          setResult1(res1);
          setExistingImageUri(res1.imageUri);
          setExistingImageName(res1.imageName);
          setExistingTotalImages(res1.totalImages || 0);
          setExistingError(null);
        } else {
          setExistingError(res1.error || 'Failed to load baseline');
        }
        
        // Check if user's image was rejected as "not a Talisay fruit"
        if (res2.success) {
          if (res2.isTalisay === false) {
            // Don't set result2, and add the rejection message to errors
            setResult2(null);
            const errors = [];
            if (!res1.success) errors.push(`Existing Dataset: ${res1.error}`);
            errors.push('Your Image: Not a Talisay fruit. Please upload an image with a Talisay fruit in it.');
            setError(errors.join(' • '));
          } else {
            setResult2(res2);
          }
        }

        setExistingLoading(false);

        if (isAuthenticated) {
          // Save comparison items to history (only if valid Talisay)
          if (res1.success) {
            historyService.saveHistoryItem({
              analysisType: 'comparison', comparisonLabel: `Baseline (${existingColor})`,
              imageName: res1.imageName || 'existing_dataset.jpg', imageUri: res1.cloudinaryUrl || res1.imageUri,
              category: res1.category || 'GREEN', maturityStage: res1.maturityStage,
              confidence: res1.overallConfidence ?? res1.colorConfidence,
              colorConfidence: res1.colorConfidence, oilYieldPercent: res1.oilYieldPercent,
              yieldCategory: res1.yieldCategory, dimensions: res1.dimensions,
              referenceDetected: res1.referenceDetected, coinInfo: res1.coinInfo,
              interpretation: res1.interpretation,
            }).catch(() => {});
          }
          if (res2.success && res2.isTalisay !== false) {
            historyService.saveHistoryItem({
              analysisType: 'comparison', comparisonLabel: 'Own Dataset',
              imageName: image2Name || 'image.jpg', imageUri: resolvedImage2CloudinaryUrl || image2Uri,
              category: res2.category || 'BROWN', maturityStage: res2.maturityStage,
              confidence: res2.overallConfidence ?? res2.colorConfidence,
              colorConfidence: res2.colorConfidence, oilYieldPercent: res2.oilYieldPercent,
              yieldCategory: res2.yieldCategory, dimensions: res2.dimensions,
              referenceDetected: res2.referenceDetected, coinInfo: res2.coinInfo,
              interpretation: res2.interpretation,
            }).catch(() => {});
          }
        }

        // Collect errors (if comparison didn't already set error for rejected image)
        if (!error) {
          const errors = [];
          if (!res1.success) errors.push(`Existing Dataset: ${res1.error}`);
          if (!res2.success) errors.push(`Your Image: ${res2.error}`);
          if (errors.length > 0) setError(errors.join(' • '));
        }
        if (res1.success || (res2.success && res2.isTalisay !== false)) setProgressMessage('');
      }
    } catch (err) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false); setProgressMessage(''); setProgressMessage2('');
    }
  };

  // ─── Render helpers ───
  const hasResults = mode === 'single' ? !!analysisResult : !!(result1 || result2);
  const hasBothComparisonResults = !!(result1 && result2);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* ─── Page Hero Header ─── */}
      <LinearGradient
        colors={isDark ? ['#1a2b1f', '#0f1a12'] : ['#f0fdf4', '#dcfce7']}
        style={styles.pageHeader}
      >
        <FloatingOrb delay={0} size={90} color={colors.primary} top={10} right={-15} />
        <FloatingOrb delay={600} size={60} color="#52b788" top={60} left={20} />

        <Animated.View entering={FadeInUp.springify()} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="scan" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Talisay Fruit Scanner</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Upload or capture a fruit image, then analyze with our ML model
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* Toolbar */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.toolbar}>
          <Pressable onPress={() => router.push('/history')} style={[styles.historyBtn, { borderColor: colors.borderLight, backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.historyBtnText, { color: colors.text }]}>History</Text>
          </Pressable>
          <MLStatusBadge available={mlBackendAvailable} onRefresh={checkMLBackend} colors={colors} />
        </Animated.View>

        {/* Mode Toggle */}
        <ModeToggle mode={mode} setMode={setMode} reset={reset} colors={colors} />

        {/* Error */}
        {error && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.errorBox, { backgroundColor: '#ef444412', borderColor: '#ef444440' }]}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
          </Animated.View>
        )}

        {/* ═══ RESULTS VIEW ═══ */}
        {hasResults ? (
          <>
            {mode === 'single' && analysisResult && (
              <>
                <ResultDisplay
                  result={analysisResult}
                  imageUri={capturedImageUri}
                  imageName={capturedImageName}
                  showDetails={showDetails}
                  setShowDetails={setShowDetails}
                  colors={colors}
                  isDark={isDark}
                  isDesktop={isDesktop}
                />
                <AnimatedButton label="Scan Another" icon="refresh" onPress={reset} delay={200} colors={colors} />
              </>
            )}

            {mode === 'comparison' && (
              <>
                <View style={[styles.comparisonGrid, isDesktop && styles.comparisonGridRow]}>
                  <View style={isDesktop ? styles.comparisonCol : undefined}>
                    {result1 ? (
                      <ResultDisplay
                        result={result1}
                        imageUri={existingImageUri}
                        imageName={existingImageName || 'Existing Dataset'}
                        showDetails={showDetails1}
                        setShowDetails={setShowDetails1}
                        colors={colors}
                        isDark={isDark}
                        isDesktop={false}
                        label="Existing Dataset (Baseline)"
                      />
                    ) : (
                      <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl }]}>
                        <View style={[styles.resultLabelBadge, { backgroundColor: '#3b82f6' + '12' }]}>
                          <Text style={[styles.resultLabelText, { color: '#3b82f6' }]}>Existing Dataset (Baseline)</Text>
                        </View>
                        {existingError ? (
                          <>
                            <Ionicons name="alert-circle" size={36} color="#ef4444" />
                            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>Failed to load baseline</Text>
                            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{existingError}</Text>
                          </>
                        ) : (
                          <>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 8 }}>Loading baseline...</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={isDesktop ? styles.comparisonCol : undefined}>
                    {result2 ? (
                      <ResultDisplay
                        result={result2}
                        imageUri={image2Uri}
                        imageName={image2Name || 'Your Image'}
                        showDetails={showDetails2}
                        setShowDetails={setShowDetails2}
                        colors={colors}
                        isDark={isDark}
                        isDesktop={false}
                        label="Your Own Dataset"
                      />
                    ) : (
                      <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl }]}>
                        <View style={[styles.resultLabelBadge, { backgroundColor: colors.primary + '12' }]}>
                          <Text style={[styles.resultLabelText, { color: colors.primary }]}>Your Own Dataset</Text>
                        </View>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 8 }}>Analyzing your image...</Text>
                      </View>
                    )}
                  </View>
                </View>
                {hasBothComparisonResults && <ComparisonSummary result1={result1} result2={result2} colors={colors} />}
                <AnimatedButton label="New Comparison" icon="refresh" onPress={reset} delay={200} colors={colors} />
              </>
            )}
          </>
        ) : (
          /* ═══ INPUT VIEW ═══ */
          <>
            {mode === 'single' ? (
              <View style={[styles.inputGrid, isDesktop && styles.inputGridRow]}>
                {/* Left: Image picker */}
                <View style={styles.inputCol}>
                  <ImagePickerCard
                    title="Select Image"
                    subtitle="Choose or capture a Talisay fruit photo"
                    imageUri={capturedImageUri}
                    onPickImage={pickImage}
                    onTakePhoto={takePhoto}
                    onClear={() => { setCapturedImageUri(null); setCapturedImageName(null); }}
                    loading={loading}
                    progressMessage={progressMessage}
                    colors={colors}
                    isDark={isDark}
                  />

                  {capturedImageUri && (
                    <AnimatedButton
                      label={loading ? (progressMessage || 'Analyzing…') : 'Analyze Image'}
                      icon="scan"
                      onPress={handleAnalyze}
                      loading={loading}
                      delay={100}
                      colors={colors}
                    />
                  )}

                  {/* Tips */}
                  <Animated.View entering={FadeInUp.delay(250).springify()} style={[styles.tipsCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <View style={styles.tipsHeader}>
                      <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                      <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for a Clear Photo</Text>
                    </View>
                    {[
                      'Use good lighting (avoid shadows)',
                      'Place fruit on a plain, contrasting background',
                      'Capture the whole fruit/seed in frame',
                    ].map((tip, i) => (
                      <Text key={i} style={[styles.tipItem, { color: colors.textSecondary }]}>
                        • {tip}
                      </Text>
                    ))}
                  </Animated.View>
                </View>

                {/* Right: Carousel */}
                <View style={styles.inputCol}>
                  <CarouselCard slides={CAROUSEL_SLIDES} index={carouselIndex} setIndex={setCarouselIndex} colors={colors} isDark={isDark} />
                </View>
              </View>
            ) : (
              /* Comparison Mode Input */
              <>
                <View style={[styles.inputGrid, isDesktop && styles.inputGridRow]}>
                  {/* LEFT: Existing Dataset (read-only) */}
                  <View style={styles.inputCol}>
                    <ExistingDatasetCard
                      imageUri={existingImageUri}
                      imageName={existingImageName}
                      totalImages={existingTotalImages}
                      loading={existingLoading}
                      selectedColor={existingColor}
                      onColorChange={(c) => { setExistingColor(c); setExistingImageUri(null); setExistingImageName(null); setResult1(null); setExistingError(null); }}
                      delay={0}
                      colors={colors}
                      isDark={isDark}
                      error={existingError}
                    />
                  </View>

                  {/* RIGHT: User Image (interactive) */}
                  <View style={styles.inputCol}>
                    <ImagePickerCard
                      title="Your Image (Own Dataset)"
                      subtitle="Select or capture your Talisay fruit photo"
                      imageUri={image2Uri}
                      onPickImage={pickImage}
                      onTakePhoto={takePhoto}
                      onClear={() => { setImage2Uri(null); setImage2Name(null); }}
                      loading={loading}
                      progressMessage={progressMessage2}
                      delay={100}
                      colors={colors}
                      isDark={isDark}
                    />
                  </View>
                </View>

                {image2Uri && (
                  <AnimatedButton
                    label={loading ? (progressMessage || 'Analyzing both…') : 'Compare Images'}
                    icon="git-compare"
                    onPress={handleAnalyze}
                    loading={loading}
                    delay={200}
                    colors={colors}
                  />
                )}

                <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.tipsCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                  <View style={styles.tipsHeader}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <Text style={[styles.tipsTitle, { color: colors.text }]}>Comparison Info</Text>
                  </View>
                  {[
                    'Left side shows averaged baseline computed from multiple training images',
                    'Right side is your own image to compare against the statistical average',
                    'Use the color selector to pick which baseline category to compare',
                    'Baseline provides more reliable comparison than a single image',
                  ].map((tip, i) => (
                    <Text key={i} style={[styles.tipItem, { color: colors.textSecondary }]}>• {tip}</Text>
                  ))}
                </Animated.View>
              </>
            )}
          </>
        )}
      </View>

      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Animated Button (inline) ───
function AnimatedButton({ label, icon, onPress, loading, delay = 0, colors }) {
  const scale = useSharedValue(1);
  const btnAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={loading ? undefined : onPress}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[btnAnim, styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name={icon} size={18} color="#fff" />
        )}
        <Text style={styles.primaryBtnText}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
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
    overflow: 'hidden',
    position: 'relative',
  },
  headerContent: { gap: Spacing.sm, zIndex: 1 },
  headerContentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' },
  headerIcon: { width: 52, height: 52, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 500 },

  content: { padding: Spacing.lg, gap: Spacing.md },
  contentDesktop: { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: Spacing.xxl },

  /* Toolbar */
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  historyBtnText: { ...Typography.small, fontWeight: '600' },

  /* ML Badge */
  mlBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  mlBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Mode Toggle */
  modeRow: {
    flexDirection: 'row', gap: 4, padding: 4,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  modeBtnText: { fontSize: 13, fontWeight: '600' },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },

  /* Input Grid */
  inputGrid: { gap: Spacing.md },
  inputGridRow: { flexDirection: 'row', gap: Spacing.md },
  inputCol: { flex: 1, gap: Spacing.md },

  /* Picker Card */
  pickerCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg,
    gap: Spacing.md, ...Shadows.sm,
  },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pickerIconWrap: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { ...Typography.bodyMedium },
  pickerSubtitle: { ...Typography.small },
  pickerBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  pickerBtnText: { fontSize: 13, fontWeight: '600' },
  previewArea: { gap: Spacing.sm, position: 'relative' },
  previewImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: BorderRadius.md },
  previewOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center', gap: Spacing.sm,
  },
  overlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  clearBtnText: { fontSize: 12, fontWeight: '600' },
  emptyPreview: {
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xxl, borderRadius: BorderRadius.md,
    borderWidth: 1, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13 },

  /* Color selector (for existing dataset) */
  colorSelectorRow: { flexDirection: 'row', gap: Spacing.sm },
  colorSelectorBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1.5,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorSelectorText: { fontSize: 12, fontWeight: '600' },

  /* Dataset info badge */
  datasetInfoBadge: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm,
  },
  datasetInfoText: { color: '#fff', fontSize: 11, fontWeight: '600', flex: 1 },
  datasetCountText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' },

  /* Tips Card */
  tipsCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 4 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  tipsTitle: { ...Typography.captionMedium },
  tipItem: { fontSize: 13, lineHeight: 20 },

  /* Carousel */
  carouselCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm, ...Shadows.sm },
  carouselTitle: { ...Typography.bodyMedium },
  carouselDesc: { ...Typography.small },
  carouselImageWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  carouselImage: { width: '100%', height: '100%' },
  carouselOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  carouselName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  carouselDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  /* Primary Button */
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.md,
    ...Shadows.md, ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Result Card */
  resultCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg,
    gap: Spacing.md, ...Shadows.md,
  },
  resultLabelBadge: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.md, marginBottom: Spacing.xs,
  },
  resultLabelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultHeader: { gap: Spacing.md },
  resultHeaderDesktop: { flexDirection: 'row' },
  resultImageCol: { flex: 1, gap: Spacing.xs },
  resultImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md },
  fileName: { ...Typography.small, textAlign: 'center' },
  resultInfoCol: { flex: 1, gap: Spacing.md, justifyContent: 'center' },

  /* Yield Display */
  yieldDisplay: { alignItems: 'center', paddingVertical: Spacing.md },
  yieldPercent: { fontSize: 52, fontWeight: '800', lineHeight: 60 },
  yieldLabel: { fontSize: 15, fontWeight: '600', marginTop: 2 },

  /* Category Badge */
  catBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  catBadgeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  catBadgeConf: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

  /* Expand */
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderBottomWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  expandBtnText: { fontSize: 13, fontWeight: '600' },

  /* Details */
  detailsWrap: { gap: Spacing.sm },
  detailCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.xs },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  detailIconWrap: { width: 28, height: 28, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  detailCardTitle: { ...Typography.captionMedium },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700' },
  spotBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: BorderRadius.sm, marginTop: 4 },
  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dimCell: { flex: 1, minWidth: '40%', padding: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center', gap: 2 },
  dimCellLabel: { fontSize: 11, fontWeight: '500' },
  dimCellValue: { fontSize: 15, fontWeight: '700' },
  interpText: { fontSize: 13, lineHeight: 20 },

  /* Compact */
  compactView: { gap: Spacing.sm },
  compactDims: { flexDirection: 'row', gap: Spacing.sm },
  compactDimItem: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center', gap: 2 },
  compactDimVal: { fontSize: 16, fontWeight: '700' },
  compactDimLbl: { fontSize: 10, fontWeight: '500' },
  compactInterp: { fontSize: 12, lineHeight: 18, padding: Spacing.sm, borderRadius: BorderRadius.sm },
  timingText: { textAlign: 'center', fontSize: 12, marginTop: Spacing.xs },

  /* Comparison */
  comparisonGrid: { gap: Spacing.md },
  comparisonGridRow: { flexDirection: 'row', gap: Spacing.md },
  comparisonCol: { flex: 1 },

  /* Summary */
  summaryCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm, ...Shadows.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  summaryTitle: { ...Typography.bodyMedium },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryValue: { fontSize: 15, fontWeight: '700' },
});
