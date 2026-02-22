/**
 * Talisay AI — Scan Page (ML-Powered)
 * Full image analysis with single & side-by-side comparison modes.
 * Optimized for Mobile Phone Expo Go first.
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
  Modal,
  TextInput,
  Alert,
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

const getMaturityLabel = (cat) => {
  switch (cat?.toUpperCase()) {
    case 'GREEN': return 'Immature';
    case 'YELLOW': return 'Semi-ripe (Optimal)';
    case 'BROWN': return 'Fully Ripe';
    default: return 'Unknown';
  }
};

const getRecommendation = (cat) => {
  switch (cat?.toUpperCase()) {
    case 'GREEN': return 'Wait for maturity to increase oil yield.';
    case 'YELLOW': return 'Best time to harvest for maximum oil!';
    case 'BROWN': return 'Still extractable, but yellow stage is optimal.';
    default: return 'Upload a clearer image for better results.';
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

// ─── ML Status Badge + Ngrok Config Modal ───
function MLStatusBadge({ available, onRefresh, colors, isDark }) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [ngrokInput, setNgrokInput] = React.useState('');
  const [currentUrl, setCurrentUrl] = React.useState('');
  const scale = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleOpen = () => {
    setCurrentUrl(mlService.getNgrokUrl() || '');
    setNgrokInput(mlService.getNgrokUrl() || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = ngrokInput.trim().replace(/\/$/, '');
    if (trimmed && !trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    await mlService.setNgrokUrl(trimmed);
    setCurrentUrl(trimmed);
    setModalVisible(false);
    onRefresh();
  };

  const handleClear = async () => {
    await mlService.clearNgrokUrl();
    setNgrokInput('');
    setCurrentUrl('');
    setModalVisible(false);
    onRefresh();
  };

  const activeUrl = mlService.getCurrentMLApiUrl();
  const isNgrok = activeUrl && !activeUrl.includes('localhost') && !activeUrl.includes('127.0.0.1');

  return (
    <>
      <AnimatedPressable
        onPress={handleOpen}
        onPressIn={() => { scale.value = withSpring(0.92); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[badgeStyle, styles.mlBadge, { backgroundColor: available ? '#22c55e' : isNgrok ? '#f59e0b' : '#ef4444' }]}
      >
        <Ionicons name={available ? 'cloud-done' : isNgrok ? 'cloud-outline' : 'cloud-offline'} size={14} color="#fff" />
        <Text style={styles.mlBadgeText}>{available ? (isNgrok ? 'ML NGROK' : 'ML Online') : (isNgrok ? 'Ngrok ↻' : 'Offline')}</Text>
      </AnimatedPressable>

      {/* Ngrok Config Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.ngrokModalBg} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.ngrokModal, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            <View style={styles.ngrokModalHeader}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text style={[styles.ngrokModalTitle, { color: colors.text }]}>ML API Connection</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </Pressable>
            </View>

            <View style={[styles.ngrokCurrentUrl, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              <Text style={[styles.ngrokLabel, { color: colors.textSecondary }]}>Active URL</Text>
              <Text style={[styles.ngrokActiveUrl, { color: available ? '#22c55e' : '#ef4444' }]} numberOfLines={1}>
                {activeUrl}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: available ? '#22c55e' : '#ef4444' }} />
                <Text style={[styles.ngrokStatusText, { color: available ? '#22c55e' : '#ef4444' }]}>
                  {available ? 'Connected' : 'Unreachable'}
                </Text>
              </View>
            </View>

            <Text style={[styles.ngrokLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Ngrok Public URL  <Text style={{ color: colors.textTertiary }}>(from start-ngrok.ps1)</Text>
            </Text>
            <TextInput
              value={ngrokInput}
              onChangeText={setNgrokInput}
              placeholder="https://xxxx.ngrok-free.app"
              placeholderTextColor={colors.textTertiary}
              style={[styles.ngrokInput, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={[styles.ngrokHint, { color: colors.textTertiary }]}>
              Run start-ngrok.ps1 on your laptop, then paste the URL above. Leave empty to use localhost.
            </Text>

            <View style={styles.ngrokBtnRow}>
              {currentUrl ? (
                <Pressable onPress={handleClear} style={[styles.ngrokBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={handleSave} style={[styles.ngrokBtn, styles.ngrokSaveBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save & Reconnect</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Mode Toggle ───
function ModeToggle({ mode, setMode, reset, colors }) {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(280)} style={[styles.modeRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
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
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={[cardStyle, styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.pickerHeader}>
        <View style={[styles.pickerIconWrap, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="image" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.pickerSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
        </View>
      </View>

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
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.pickerHeader}>
        <View style={[styles.pickerIconWrap, { backgroundColor: '#3b82f6' + '15' }]}>
          <Ionicons name="server" size={18} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Averaged Baseline</Text>
          <Text style={[styles.pickerSubtitle, { color: colors.textTertiary }]}>Statistical average from training dataset</Text>
        </View>
      </View>

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
            <Text style={styles.datasetInfoText} numberOfLines={1}>{imageName || 'Averaged baseline'}</Text>
            {totalImages > 0 && <Text style={styles.datasetCountText}>{totalImages} images</Text>}
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

// ─── Detail Card (section wrapper) ───
function DetailCard({ icon, iconColor, title, children, delay = 0, colors }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(280)}
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

// ─── Full Details View (shown in expanded single + always in comparison) ───
function FullDetailsView({ result, colors, isDark, compact = false }) {
  if (!result) return null;
  const delayBase = compact ? 0 : 50;

  return (
    <View style={styles.detailsWrap}>
      {/* ── Multi-fruit detailed breakdown ── */}
      {result.multiFruit && result.fruits?.length > 0 && (
        <DetailCard icon="apps" iconColor="#7c3aed" title={`${result.fruitCount} Fruits — Details`} colors={colors}>
          {/* Per-fruit rows */}
          {result.fruits.map((f, i) => (
            <View key={i} style={[styles.fruitRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.fruitRowTop}>
                <View style={[styles.catBadgeSm, { backgroundColor: getCategoryColor(f.color?.toUpperCase()) }]}>
                  <Text style={styles.catBadgeSmText}>#{f.fruit_index ?? (i + 1)} {f.color?.toUpperCase()}</Text>
                </View>
                <Text style={styles.fruitOilText}>{f.oil_yield_percent?.toFixed(1)}% oil</Text>
              </View>
              {f.dimensions && (
                <Text style={[styles.fruitDimText, { color: colors.textTertiary }]}>
                  L {f.dimensions.length_cm?.toFixed(1)} cm · W {f.dimensions.width_cm?.toFixed(1)} cm · {f.dimensions_source || 'estimated'}
                </Text>
              )}
              {f.confidence != null && (
                <Text style={[styles.fruitDimText, { color: colors.textTertiary }]}>
                  Conf: {Math.round((f.confidence || 0) * 100)}%
                </Text>
              )}
            </View>
          ))}
        </DetailCard>
      )}

      {/* ── Single fruit: Color, Maturity, Recommendation ── */}
      {!result.multiFruit && (
        <DetailCard icon="color-palette" iconColor={colors.primary} title="Color Classification" delay={delayBase} colors={colors}>
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
            <Text style={[styles.detailValue, { color: colors.text }]}>{result.maturityStage || getMaturityLabel(result.category)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recommendation</Text>
            <Text style={[styles.detailValue, { color: colors.text, fontSize: 12, maxWidth: '60%', textAlign: 'right' }]}>{getRecommendation(result.category)}</Text>
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
      )}

      {/* ── Dimensions (single fruit only) ── */}
      {!result.multiFruit && result.dimensions && Object.keys(result.dimensions).length > 0 && (
        <DetailCard icon="resize" iconColor="#3b82f6" title="Dimensions" delay={delayBase + 50} colors={colors}>
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
          {result.dimensionsSource && (
            <Text style={[styles.dimSourceText, { color: colors.textTertiary }]}>
              Source: {result.dimensionsSource === 'coin_reference' ? '5-Peso Coin Reference' : 'Smart Estimation'}
            </Text>
          )}
        </DetailCard>
      )}

      {/* ── Oil Yield ── */}
      <DetailCard icon="water" iconColor="#22c55e" title={result.multiFruit ? 'Average Oil Yield' : 'Oil Yield Prediction'} delay={delayBase + 100} colors={colors}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{result.multiFruit ? 'Average' : 'Predicted'}</Text>
          <Text style={[styles.oilYieldBig, { color: colors.text }]}>
            {(result.oilYieldPercent || result.averageOilYield || 0).toFixed(1)}%
          </Text>
        </View>
        {result.multiFruit && result.oilYieldRange && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Range</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {result.oilYieldRange[0].toFixed(1)}% – {result.oilYieldRange[1].toFixed(1)}%
            </Text>
          </View>
        )}
        {!result.multiFruit && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{result.yieldCategory || 'Unknown'}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Confidence</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{Math.round((result.oilConfidence || result.overallConfidence || 0) * 100)}%</Text>
        </View>
      </DetailCard>

      {/* ── Interpretation ── */}
      {result.interpretation && (
        <DetailCard icon="bulb" iconColor="#f59e0b" title="Interpretation" delay={delayBase + 150} colors={colors}>
          <Text style={[styles.interpText, { color: colors.textSecondary }]}>{result.interpretation}</Text>
        </DetailCard>
      )}
    </View>
  );
}

// ─── Single Result Display (2-column: image left, stats right, details below) ───
function ResultDisplay({ result, imageUri, imageName, showDetails, setShowDetails, colors, isDark, isDesktop, label, isComparison = false }) {
  if (!result) return null;

  const oilYield = (result.oilYieldPercent || result.averageOilYield || 0).toFixed(1);
  const confidence = Math.round((result.overallConfidence || result.colorConfidence || 0) * 100);
  const catColor = getCategoryColor(result.category);

  return (
    <Animated.View entering={FadeInUp.duration(280)} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      {/* Label badge */}
      {label && (
        <View style={[styles.resultLabelBadge, { backgroundColor: colors.primary + '12' }]}>
          <Text style={[styles.resultLabelText, { color: colors.primary }]}>{label}</Text>
        </View>
      )}

      {/* ── 2-Column: Image (left) | Stats (right) ── */}
      <View style={styles.resultTwoCol}>
        {/* LEFT — image */}
        <View style={styles.resultImgWrap}>
          <Image source={{ uri: imageUri }} style={styles.resultImg} resizeMode="cover" />
          <Text style={[styles.resultImgName, { color: colors.textTertiary }]} numberOfLines={2}>
            {imageName || 'Image'}
          </Text>
        </View>

        {/* RIGHT — key stats */}
        <View style={styles.resultStatsCol}>
          {result.multiFruit ? (
            <>
              {/* ── Multi-fruit stats ── */}
              <View style={styles.resultStatMain}>
                <Text style={[styles.resultStatYield, { color: colors.text }]}>{oilYield}%</Text>
                <Text style={[styles.resultStatYieldLabel, { color: colors.textSecondary }]}>Avg. Oil Yield</Text>
              </View>
              <View style={[styles.resultStatBadge, { backgroundColor: '#7c3aed' }]}>
                <Ionicons name="apps" size={14} color="#fff" />
                <Text style={styles.resultStatBadgeText}>{result.fruitCount} Fruits</Text>
              </View>
              {result.oilYieldRange && (
                <View style={[styles.resultStatRow, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.resultStatRowLabel, { color: colors.textSecondary }]}>Range</Text>
                  <Text style={[styles.resultStatRowVal, { color: colors.text }]}>
                    {result.oilYieldRange[0].toFixed(1)}–{result.oilYieldRange[1].toFixed(1)}%
                  </Text>
                </View>
              )}
              <View style={[styles.resultStatRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.resultStatRowLabel, { color: colors.textSecondary }]}>Confidence</Text>
                <Text style={[styles.resultStatRowVal, { color: colors.text }]}>{confidence}%</Text>
              </View>
            </>
          ) : (
            <>
              {/* ── Single-fruit stats ── */}
              <View style={styles.resultStatMain}>
                <Text style={[styles.resultStatYield, { color: colors.text }]}>{oilYield}%</Text>
                <Text style={[styles.resultStatYieldLabel, { color: colors.textSecondary }]}>Oil Yield</Text>
              </View>
              <View style={[styles.resultStatBadge, { backgroundColor: catColor }]}>
                <Text style={styles.resultStatBadgeText}>{result.category || 'Unknown'}</Text>
                <Text style={styles.resultStatBadgeConf}>
                  {result.colorConfidence ? Math.round(result.colorConfidence * 100) : 0}%
                </Text>
              </View>
              <View style={[styles.resultStatRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.resultStatRowLabel, { color: colors.textSecondary }]}>Maturity</Text>
                <Text style={[styles.resultStatRowVal, { color: colors.text }]} numberOfLines={2}>
                  {result.maturityStage || getMaturityLabel(result.category)}
                </Text>
              </View>
              <View style={[styles.resultStatRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.resultStatRowLabel, { color: colors.textSecondary }]}>Confidence</Text>
                <Text style={[styles.resultStatRowVal, { color: colors.text }]}>{confidence}%</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Color distribution (multi-fruit, full width) ── */}
      {result.multiFruit && result.colorDistribution && Object.keys(result.colorDistribution).length > 0 && (
        <View style={[styles.resultColorDist, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Ionicons name="color-palette" size={13} color={colors.primary} />
            <Text style={[styles.resultInfoCellLabel, { color: colors.textSecondary }]}>Color Distribution</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(result.colorDistribution).map(([c, n]) => (
              <View key={c} style={styles.colorDistItem}>
                <View style={[styles.colorDistDot, { backgroundColor: getCategoryColor(c.toUpperCase()) }]} />
                <Text style={[styles.colorDistText, { color: colors.text }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}: {n}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Recommendation (single, full width) ── */}
      {!result.multiFruit && (
        <View style={[styles.resultRecBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f0fdf4', borderColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={[styles.resultInfoCellLabel, { color: colors.textSecondary, fontWeight: '600' }]}>Recommendation</Text>
          </View>
          <Text style={[styles.resultRecText, { color: colors.text }]}>{getRecommendation(result.category)}</Text>
        </View>
      )}

      {/* ── Comparison: always show expanded details ── */}
      {isComparison ? (
        <FullDetailsView result={result} colors={colors} isDark={isDark} compact />
      ) : (
        <>
          <Pressable onPress={() => setShowDetails(!showDetails)} style={[styles.expandBtn, { borderColor: colors.borderLight }]}>
            <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            <Text style={[styles.expandBtnText, { color: colors.primary }]}>
              {showDetails ? 'Hide Full Details' : 'Show Full Details'}
            </Text>
          </Pressable>
          {showDetails && <FullDetailsView result={result} colors={colors} isDark={isDark} />}
        </>
      )}

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
      entering={FadeInUp.delay(300).duration(280)}
      style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.primary + '25' }]}
    >
      <View style={styles.summaryHeader}>
        <Ionicons name="analytics" size={20} color={colors.primary} />
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Comparison Summary</Text>
      </View>
      {[
        { label: 'Oil Yield Difference', value: `${yieldDiff > 0 ? '+' : ''}${yieldDiff.toFixed(1)}%`, color: Math.abs(yieldDiff) > 5 ? '#ef4444' : '#22c55e' },
        { label: 'Category Match', value: catMatch ? 'Same' : 'Different', color: colors.text },
        { label: 'Avg Confidence', value: `${avgConf}%`, color: colors.text },
        { label: 'Baseline (Avg)', value: `${(result1.oilYieldPercent || 0).toFixed(1)}% oil`, color: '#3b82f6' },
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
      entering={FadeInUp.delay(300).duration(280)}
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

// ─── Animated Button ───
function AnimatedButton({ label, icon, onPress, loading, delay = 0, colors }) {
  const scale = useSharedValue(1);
  const btnAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)}>
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
    if (!isAuthenticated) {
      router.replace('/account');
    }
  }, [isAuthenticated]);

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

  // ─── Image Picking ───
  const pickImage = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop().split('?')[0] || 'image.jpg';
      if (mode === 'comparison') {
        setImage2Uri(asset.uri); setImage2Name(fileName);
        setImage2CloudinaryUrl(null);
      } else {
        setCapturedImageUri(asset.uri); setCapturedImageName(fileName);
        setCapturedCloudinaryUrl(null);
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
        setImage2CloudinaryUrl(null);
      } else {
        setCapturedImageUri(asset.uri); setCapturedImageName(fileName);
        setCapturedCloudinaryUrl(null);
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
          if (res.isTalisay === false) {
            setError('Not a Talisay fruit. Please upload an image with a Talisay fruit in it.');
            setAnalysisResult(null);
          } else {
            setAnalysisResult(res); setProgressMessage('');
            if (isAuthenticated) {
              historyService.saveHistoryItem({
                analysisType: res.multiFruit ? 'multi_fruit' : 'single',
                imageName: capturedImageName || 'image.jpg',
                imageUri: resolvedCloudinaryUrl || capturedImageUri,
                category: res.category || 'BROWN',
                maturityStage: res.maturityStage,
                confidence: res.overallConfidence ?? res.colorConfidence,
                colorConfidence: res.colorConfidence,
                fruitConfidence: res.fruitConfidence,
                oilConfidence: res.oilConfidence,
                oilYieldPercent: res.oilYieldPercent || res.averageOilYield,
                yieldCategory: res.yieldCategory,
                dimensions: res.dimensions,
                dimensionsSource: res.dimensionsSource,
                referenceDetected: res.referenceDetected,
                coinInfo: res.coinInfo,
                interpretation: res.interpretation,
                hasSpots: res.hasSpots,
                spotCoverage: res.spotCoverage,
                colorProbabilities: res.raw?.color_probabilities,
                multiFruit: res.multiFruit || false,
                fruitCount: res.fruitCount,
                colorDistribution: res.colorDistribution,
                averageOilYield: res.averageOilYield,
                oilYieldRange: res.oilYieldRange,
                fruits: res.fruits,
              }).catch(() => {});
            }
          }
        } else {
          setError(res.error || 'Analysis failed. Is the ML backend running on port 5001?');
        }
      } else {
        // Comparison mode
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

        if (res2.success) {
          if (res2.isTalisay === false) {
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
          const comparisonId = `comp_${Date.now()}`;

          if (res1.success) {
            historyService.saveHistoryItem({
              analysisType: 'comparison', comparisonLabel: `Baseline (${existingColor})`,
              comparisonId,
              imageName: res1.imageName || 'existing_dataset.jpg', imageUri: res1.cloudinaryUrl || res1.imageUri,
              category: res1.category || 'GREEN', maturityStage: res1.maturityStage,
              confidence: res1.overallConfidence ?? res1.colorConfidence,
              colorConfidence: res1.colorConfidence, oilYieldPercent: res1.oilYieldPercent,
              yieldCategory: res1.yieldCategory, dimensions: res1.dimensions,
              referenceDetected: res1.referenceDetected, coinInfo: res1.coinInfo,
              interpretation: res1.interpretation,
              totalImages: res1.totalImages || res1.analyzedImages || 0,
            }).catch(() => {});
          }
          if (res2.success && res2.isTalisay !== false) {
            historyService.saveHistoryItem({
              analysisType: 'comparison', comparisonLabel: 'Own Dataset',
              comparisonId,
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

  // ─── Render ───
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

        <Animated.View entering={FadeInUp.duration(280)} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
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
        <Animated.View entering={FadeInUp.delay(100).duration(280)} style={styles.toolbar}>
          <Pressable onPress={() => router.push('/history')} style={[styles.historyBtn, { borderColor: colors.borderLight, backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.historyBtnText, { color: colors.text }]}>History</Text>
          </Pressable>
          <MLStatusBadge available={mlBackendAvailable} onRefresh={checkMLBackend} colors={colors} isDark={isDark} />
        </Animated.View>

        {/* Mode Toggle */}
        <ModeToggle mode={mode} setMode={setMode} reset={reset} colors={colors} />

        {/* Error */}
        {error && (
          <Animated.View entering={FadeInDown.duration(280)} style={[styles.errorBox, { backgroundColor: '#ef444412', borderColor: '#ef444440' }]}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
          </Animated.View>
        )}

        {/* ═══ RESULTS ═══ */}
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
                {/* Side-by-side cards, each with FULL details shown directly */}
                <View style={[styles.comparisonGrid, isDesktop && styles.comparisonGridDesktop]}>
                  <View style={{ flex: 1 }}>
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
                        isComparison
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
                  <View style={{ flex: 1 }}>
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
                        isComparison
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

                  <Animated.View entering={FadeInUp.delay(250).duration(280)} style={[styles.tipsCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <View style={styles.tipsHeader}>
                      <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                      <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for a Clear Photo</Text>
                    </View>
                    {[
                      'Use good lighting (avoid shadows)',
                      'Place fruit on a plain, contrasting background',
                      'Capture the whole fruit/seed in frame',
                      'Multiple fruits in one image are supported!',
                    ].map((tip, i) => (
                      <Text key={i} style={[styles.tipItem, { color: colors.textSecondary }]}>• {tip}</Text>
                    ))}
                  </Animated.View>
                </View>

                <View style={styles.inputCol}>
                  <CarouselCard slides={CAROUSEL_SLIDES} index={carouselIndex} setIndex={setCarouselIndex} colors={colors} isDark={isDark} />
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.inputGrid, isDesktop && styles.inputGridRow]}>
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

                <Animated.View entering={FadeInUp.delay(300).duration(280)} style={[styles.tipsCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                  <View style={styles.tipsHeader}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <Text style={[styles.tipsTitle, { color: colors.text }]}>Comparison Info</Text>
                  </View>
                  {[
                    'Left side shows averaged baseline from training images',
                    'Right side is your own image to compare',
                    'Use the color selector to pick which baseline',
                    'All details shown directly — no dropdowns!',
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
  headerIcon: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs, ...Shadows.sm },
  pageTitle: { ...Typography.h1, letterSpacing: -0.5 },
  pageSubtitle: { ...Typography.body, maxWidth: 500, lineHeight: 22 },

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

  /* Ngrok Config Modal */
  ngrokModalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  ngrokModal: {
    width: '100%', maxWidth: 440, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, gap: Spacing.sm, ...Shadows.lg,
  },
  ngrokModalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  ngrokModalTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  ngrokCurrentUrl: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: 2 },
  ngrokLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ngrokActiveUrl: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  ngrokStatusText: { fontSize: 11, fontWeight: '600' },
  ngrokInput: {
    borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ngrokHint: { fontSize: 12, lineHeight: 18 },
  ngrokBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4, justifyContent: 'flex-end' },
  ngrokBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  ngrokSaveBtn: { borderWidth: 0 },

  /* Mode Toggle */
  modeRow: {
    flexDirection: 'row', gap: 4, padding: 5,
    borderRadius: BorderRadius.xl, borderWidth: 1,
    ...Shadows.sm,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: BorderRadius.lg,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s ease' } }),
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
    borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg,
    gap: Spacing.md, ...Shadows.md,
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

  /* Color selector */
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
    gap: Spacing.sm, paddingVertical: 15, borderRadius: BorderRadius.lg,
    ...Shadows.lg, ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s ease' } }),
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  /* Result Card */
  resultCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md,
    gap: Spacing.sm, ...Shadows.md,
  },
  resultLabelBadge: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.md, marginBottom: Spacing.xs,
  },
  resultLabelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Result: 2-column layout (image left | stats right) */
  resultTwoCol: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  resultImgWrap: {
    width: 130,
    flexShrink: 0,
  },
  resultImg: {
    width: 130,
    height: 165,
    borderRadius: BorderRadius.md,
    backgroundColor: '#000',
  },
  resultImgName: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
  },
  resultStatsCol: {
    flex: 1,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  resultStatMain: {
    marginBottom: 4,
  },
  resultStatYield: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -1,
  },
  resultStatYieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
  },
  resultStatBadgeText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resultStatBadgeConf: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  resultStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  resultStatRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  resultStatRowVal: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  resultColorDist: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  /* shared small label used in dist header + rec header */
  resultInfoCellLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  resultInfoCellValue: { fontSize: 15, fontWeight: '700' },

  /* Recommendation box */
  resultRecBox: { padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  resultRecText: { fontSize: 14, lineHeight: 21, fontWeight: '500' },

  /* File name */
  fileName: { ...Typography.small, textAlign: 'center' },

  /* Color distribution items */
  colorDistItem: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 10, marginBottom: 3 },
  colorDistDot: { width: 10, height: 10, borderRadius: 5 },
  colorDistText: { fontSize: 13, fontWeight: '600' },

  /* Category Badge */
  catBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: BorderRadius.md,
  },
  catBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  catBadgeConf: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  catBadgeSm: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm,
  },
  catBadgeSmText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* Quick recommendation */
  /* (moved to resultRecBox above) */

  /* Expand btn */
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
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  detailLabel: { fontSize: 12, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '700' },
  oilYieldBig: { fontSize: 18, fontWeight: '800' },
  spotBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: BorderRadius.sm, marginTop: 4 },
  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dimCell: { flex: 1, minWidth: '40%', padding: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center', gap: 2 },
  dimCellLabel: { fontSize: 11, fontWeight: '500' },
  dimCellValue: { fontSize: 14, fontWeight: '700' },
  dimSourceText: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  interpText: { fontSize: 13, lineHeight: 20 },

  /* Multi-fruit per-fruit row */
  fruitRow: { borderRadius: 8, marginTop: 6, padding: 8 },
  fruitRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  fruitOilText: { color: '#22c55e', fontWeight: '700', fontSize: 14 },
  fruitDimText: { fontSize: 11 },

  timingText: { textAlign: 'center', fontSize: 11, marginTop: Spacing.xs },

  /* Comparison */
  comparisonGrid: { gap: Spacing.md },
  comparisonGridDesktop: { flexDirection: 'row', gap: Spacing.md },

  /* Comparison Summary */
  summaryCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm, ...Shadows.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  summaryTitle: { ...Typography.bodyMedium },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700' },
});
