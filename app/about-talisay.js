/**
 * Talisay AI — About Talisay Page
 * Comprehensive Terminalia Catappa information: classification, nutrition,
 * medicinal uses, cultural significance, image gallery.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import {
  OIL_YIELD_DATA,
  SEED_TO_OIL,
  NUTRITIONAL_DATA,
  FATTY_ACID_PROFILE,
  DIMENSION_RANGES,
  BOTANICAL_INFO,
  RESEARCH_REFERENCES,
  SCIENCE_SUMMARY,
} from '../data/talisayScience';

const CLASSIFICATION = [
  { label: 'Kingdom', value: 'Plantae' },
  { label: 'Order', value: 'Myrtales' },
  { label: 'Family', value: 'Combretaceae' },
  { label: 'Genus', value: 'Terminalia' },
  { label: 'Species', value: 'T. catappa' },
  { label: 'Common Names', value: 'Talisay, Indian Almond, Sea Almond, Tropical Almond' },
];

const NUTRITIONAL = [
  { nutrient: 'Protein', amount: '25.6 g', percent: 51, color: '#3b82f6' },
  { nutrient: 'Fat', amount: '54.2 g', percent: 83, color: '#f97316' },
  { nutrient: 'Fiber', amount: '11.2 g', percent: 40, color: '#22c55e' },
  { nutrient: 'Calcium', amount: '455 mg', percent: 45, color: '#8b5cf6' },
  { nutrient: 'Iron', amount: '5.2 mg', percent: 29, color: '#ef4444' },
  { nutrient: 'Phosphorus', amount: '490 mg', percent: 70, color: '#14b8a6' },
];

const MEDICINAL_USES = [
  {
    title: 'Anti-inflammatory',
    icon: 'medkit',
    color: '#ef4444',
    description: 'Leaf extracts possess significant anti-inflammatory properties, traditionally used to treat joint pain and swelling.',
  },
  {
    title: 'Antioxidant',
    icon: 'shield-checkmark',
    color: '#7c3aed',
    description: 'Rich in polyphenols and flavonoids that combat oxidative stress and free radical damage in the body.',
  },
  {
    title: 'Antimicrobial',
    icon: 'bug',
    color: '#3b82f6',
    description: 'Bark and leaf extracts show potent antimicrobial activity against several pathogenic bacteria and fungi.',
  },
  {
    title: 'Hepatoprotective',
    icon: 'heart',
    color: '#22c55e',
    description: 'Studies demonstrate protective effects on liver cells, potentially useful in treating liver-related diseases.',
  },
  {
    title: 'Wound Healing',
    icon: 'bandage',
    color: '#f97316',
    description: 'Traditional poultice from crushed leaves accelerates wound healing and reduces infection risk.',
  },
  {
    title: 'Diabetes Management',
    icon: 'nutrition',
    color: '#14b8a6',
    description: 'Aqueous leaf extracts have shown hypoglycemic effects in laboratory studies, aiding blood sugar regulation.',
  },
];

const CULTURAL_FACTS = [
  { icon: 'fish', title: 'Aquarium Use', description: 'Dried leaves are widely used in aquariums to lower pH and release tannins that benefit tropical fish.' },
  { icon: 'color-palette', title: 'Natural Dye', description: 'The fruit and bark produce a rich black dye traditionally used for textile coloring across Southeast Asia.' },
  { icon: 'home', title: 'Shade Tree', description: 'Planted extensively as an ornamental shade tree along coastal roads and in parks throughout the tropics.' },
  { icon: 'leaf', title: 'Ecosystem Role', description: 'Provides crucial habitat and food source for fruit bats, birds, and other tropical wildlife species.' },
];

const GALLERY = [
  { uri: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600', caption: 'Talisay tree canopy' },
  { uri: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600', caption: 'Tropical coastal grove' },
  { uri: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600', caption: 'Sunlight through leaves' },
  { uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600', caption: 'Forest environment' },
];

function ClassificationTable() {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify()}
      style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
    >
      <View style={styles.tableHeader}>
        <Ionicons name="list" size={22} color="#2d6a4f" />
        <Text style={[styles.tableTitle, { color: colors.text }]}>Scientific Classification</Text>
      </View>
      {CLASSIFICATION.map((item, idx) => (
        <Animated.View
          key={item.label}
          entering={FadeInLeft.delay(250 + idx * 50).springify()}
          style={[styles.tableRow, {
            backgroundColor: idx % 2 === 0 ? colors.background : 'transparent',
            borderBottomColor: colors.borderLight,
          }]}
        >
          <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          <Text style={[styles.tableValue, { color: colors.text }]}>{item.value}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function NutritionSection() {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(300).springify()}
      style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
    >
      <View style={styles.tableHeader}>
        <Ionicons name="nutrition" size={22} color="#f97316" />
        <Text style={[styles.tableTitle, { color: colors.text }]}>Nutritional Value</Text>
        <Text style={[styles.tableMeta, { color: colors.textTertiary }]}>per 100 g kernel</Text>
      </View>
      {NUTRITIONAL.map((item, idx) => (
        <Animated.View
          key={item.nutrient}
          entering={FadeInRight.delay(350 + idx * 60).springify()}
          style={styles.nutrientRow}
        >
          <View style={styles.nutrientInfo}>
            <Text style={[styles.nutrientName, { color: colors.text }]}>{item.nutrient}</Text>
            <Text style={[styles.nutrientAmount, { color: colors.textSecondary }]}>{item.amount}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.progressFill, {
              backgroundColor: item.color,
              width: `${item.percent}%`,
            }]} />
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function MedicinalGrid({ isMobile }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.medicinalGrid, isMobile && styles.medicinalGridMobile]}>
      {MEDICINAL_USES.map((use, idx) => (
        <Animated.View
          key={use.title}
          entering={ZoomIn.delay(250 + idx * 80).springify().damping(12)}
          style={[styles.medicinalCard, {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            ...Shadows.sm,
          }]}
        >
          <View style={[styles.medicinalIcon, { backgroundColor: use.color + '15' }]}>
            <Ionicons name={use.icon} size={22} color={use.color} />
          </View>
          <Text style={[styles.medicinalTitle, { color: colors.text }]}>{use.title}</Text>
          <Text style={[styles.medicinalDesc, { color: colors.textSecondary }]}>{use.description}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function GallerySection({ isMobile }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.galleryGrid, isMobile && styles.galleryGridMobile]}>
      {GALLERY.map((img, idx) => (
        <Animated.View
          key={idx}
          entering={ZoomIn.delay(200 + idx * 100).springify()}
          style={[styles.galleryItem, { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.sm }]}
        >
          <Image source={{ uri: img.uri }} style={styles.galleryImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.galleryOverlay}
          >
            <Text style={styles.galleryCaption}>{img.caption}</Text>
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );
}

export default function AboutTalisayPage() {
  const { colors, isDark } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const [expandedFact, setExpandedFact] = useState(null);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <LinearGradient
        colors={isDark ? ['#1b2e1f', '#0f1a12'] : ['#ecfdf5', '#d1fae5']}
        style={styles.pageHeader}
      >
        <Animated.View entering={FadeInUp.springify()} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: '#2d6a4f' + '20' }]}>
            <Ionicons name="leaf" size={28} color="#2d6a4f" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>About Talisay</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Discover Terminalia catappa — the tropical almond tree prized across the world for its ecological, nutritional, and medicinal value
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* Hero description */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.md }]}
        >
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Terminalia catappa</Text>, commonly known as
            Talisay in the Philippines, is a large tropical tree in the leadwood family (Combretaceae).
            Indigenous to tropical regions of Asia, Australia, and the Pacific, it has been naturalized
            across the tropics for its edible nuts, ornamental beauty, and wide-ranging medicinal applications.
            The tree can reach heights of 35 meters and is easily recognized by its distinctive horizontal
            branching pattern and large, leathery leaves that turn vivid red and orange before falling.
          </Text>
        </Animated.View>

        {/* Classification & Nutrition side by side on desktop */}
        <View style={[styles.twoCol, isMobile && styles.twoColMobile]}>
          <View style={{ flex: 1 }}>
            <ClassificationTable />
          </View>
          <View style={{ flex: 1 }}>
            <NutritionSection />
          </View>
        </View>

        {/* Medicinal Uses */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
          Medicinal Uses
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Traditional and research-backed health benefits
        </Text>
        <MedicinalGrid isMobile={isMobile} />

        {/* Cultural Significance */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
          Cultural Significance
        </Text>
        <View style={styles.culturalList}>
          {CULTURAL_FACTS.map((fact, idx) => (
            <Animated.View
              key={fact.title}
              entering={FadeInLeft.delay(200 + idx * 80).springify()}
            >
              <Pressable
                onPress={() => setExpandedFact(expandedFact === idx ? null : idx)}
                style={[styles.culturalCard, {
                  backgroundColor: colors.card,
                  borderColor: expandedFact === idx ? colors.primary : colors.borderLight,
                  ...Shadows.sm,
                }]}
              >
                <View style={styles.culturalTop}>
                  <View style={[styles.culturalIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={fact.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.culturalTitle, { color: colors.text, flex: 1 }]}>{fact.title}</Text>
                  <Ionicons
                    name={expandedFact === idx ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>
                {expandedFact === idx && (
                  <Text style={[styles.culturalDesc, { color: colors.textSecondary }]}>{fact.description}</Text>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Gallery */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
          Gallery
        </Text>
        <GallerySection isMobile={isMobile} />

        {/* ═══ SCIENTIFIC RESEARCH DATA ═══ */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xxl }]}>
          Scientific Research Data
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Peer-reviewed research on Terminalia catappa oil yield, composition, and dimensions
        </Text>

        {/* Science Summary Cards */}
        <View style={[styles.sciCards, isMobile && styles.sciCardsMobile]}>
          {SCIENCE_SUMMARY.map((st, idx) => (
            <Animated.View
              key={st.label}
              entering={ZoomIn.delay(200 + idx * 80).springify().damping(12)}
              style={[styles.sciCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
            >
              <View style={[styles.sciCardIcon, { backgroundColor: st.color + '15' }]}>
                <Ionicons name={st.icon} size={22} color={st.color} />
              </View>
              <Text style={[styles.sciCardValue, { color: st.color }]}>{st.value}</Text>
              <Text style={[styles.sciCardLabel, { color: colors.text }]}>{st.label}</Text>
              <Text style={[styles.sciCardDetail, { color: colors.textTertiary }]}>{st.detail}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Botanical Details */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="leaf" size={22} color="#22c55e" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Botanical Details</Text>
          </View>
          {[
            { label: 'Scientific Name', value: BOTANICAL_INFO.scientificName, icon: 'flask' },
            { label: 'Family', value: BOTANICAL_INFO.family, icon: 'globe' },
            { label: 'Origin', value: BOTANICAL_INFO.origin, icon: 'earth' },
            { label: 'Distribution', value: BOTANICAL_INFO.distribution, icon: 'map' },
            { label: 'Tree Height', value: BOTANICAL_INFO.treeHeight, icon: 'resize' },
            { label: 'Fruit Type', value: BOTANICAL_INFO.fruitType, icon: 'ellipse' },
            { label: 'Harvest Season', value: BOTANICAL_INFO.harvestSeason, icon: 'calendar' },
          ].map((item, idx) => (
            <Animated.View
              key={item.label}
              entering={FadeInLeft.delay(350 + idx * 40).springify()}
              style={[styles.tableRow, {
                backgroundColor: idx % 2 === 0 ? colors.background : 'transparent',
                borderBottomColor: colors.borderLight,
              }]}
            >
              <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.tableValue, { color: colors.text }]}>{item.value}</Text>
            </Animated.View>
          ))}

          {/* Common Names */}
          <View style={[styles.sciChipSection, { borderTopColor: colors.divider }]}>
            <Text style={[styles.sciChipLabel, { color: colors.textSecondary }]}>Common Names:</Text>
            <View style={styles.sciChipRow}>
              {BOTANICAL_INFO.commonNames.map(n => (
                <View key={n} style={[styles.sciChip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
                  <Text style={[styles.sciChipText, { color: colors.primary }]}>{n}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Oil Yield by Maturity Stage */}
        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="bar-chart" size={22} color="#f97316" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Oil Yield by Maturity Stage</Text>
          </View>
          {['GREEN', 'YELLOW', 'BROWN'].map((cat, idx) => {
            const sci = OIL_YIELD_DATA[cat];
            return (
              <Animated.View
                key={cat}
                entering={FadeInLeft.delay(450 + idx * 60).springify()}
                style={[styles.oilYieldCard, { borderColor: sci.colorHex + '20' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={[styles.oilDot, { backgroundColor: sci.colorHex }]} />
                  <Text style={[styles.oilLabel, { color: colors.text }]}>{sci.label}</Text>
                </View>
                <View style={styles.oilCompareRow}>
                  <View style={styles.oilCompareCol}>
                    <Text style={[styles.oilCompareHeader, { color: colors.textTertiary }]}>Oil Yield Range</Text>
                    <Text style={[styles.oilCompareVal, { color: sci.colorHex }]}>{sci.oilYieldRange[0]}–{sci.oilYieldRange[1]}%</Text>
                  </View>
                  <View style={styles.oilCompareCol}>
                    <Text style={[styles.oilCompareHeader, { color: colors.textTertiary }]}>Maturity</Text>
                    <Text style={[styles.oilCompareVal, { color: colors.text }]}>{sci.maturityStage || cat}</Text>
                  </View>
                </View>
                <Text style={[styles.oilDesc, { color: colors.textTertiary }]}>{sci.description}</Text>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Seed-to-Oil Ratio */}
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="water" size={22} color="#3b82f6" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Seed-to-Oil Extraction</Text>
          </View>
          {[
            { label: 'Kernel Oil Content', value: `${SEED_TO_OIL.overallKernelOilContent}%` },
            { label: 'Kernel-to-Fruit Ratio', value: `${(SEED_TO_OIL.kernelToFruitRatio * 100).toFixed(0)}%` },
            { label: 'Oil Recovery Efficiency', value: `${(SEED_TO_OIL.oilRecoveryEfficiency * 100).toFixed(0)}%` },
            { label: 'Fruit per Tree/Year', value: `${SEED_TO_OIL.typicalYieldPerTree.kgFruitPerYear} kg` },
            { label: 'Oil per Tree/Year', value: `~${SEED_TO_OIL.typicalYieldPerTree.litersOilPerYear} L` },
          ].map((item, idx) => (
            <Animated.View
              key={item.label}
              entering={FadeInLeft.delay(550 + idx * 40).springify()}
              style={[styles.tableRow, {
                backgroundColor: idx % 2 === 0 ? colors.background : 'transparent',
                borderBottomColor: colors.borderLight,
              }]}
            >
              <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.tableValue, { color: colors.primary, fontWeight: '600' }]}>{item.value}</Text>
            </Animated.View>
          ))}

          {/* Extraction Methods */}
          <View style={[styles.sciChipSection, { borderTopColor: colors.divider }]}>
            <Text style={[styles.sciChipLabel, { color: colors.text, fontWeight: '600', marginBottom: Spacing.sm }]}>Extraction Methods</Text>
            {SEED_TO_OIL.extractionMethods.map((m, idx) => (
              <Animated.View
                key={m.method}
                entering={FadeInLeft.delay(600 + idx * 50).springify()}
                style={[styles.extractRow, { borderBottomColor: colors.divider }]}
              >
                <Text style={[styles.extractMethod, { color: colors.text }]}>{m.method}</Text>
                <Text style={[styles.extractYield, { color: colors.primary }]}>{m.yield}</Text>
                <Text style={[styles.extractQuality, { color: colors.textTertiary }]}>{m.quality}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Fatty Acid Profile + Nutritional Composition side by side */}
        <View style={[styles.twoCol, isMobile && styles.twoColMobile]}>
          {/* Fatty Acid Profile */}
          <Animated.View
            entering={FadeInUp.delay(600).springify()}
            style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm, flex: 1 }]}
          >
            <View style={styles.tableHeader}>
              <Ionicons name="flask" size={22} color="#7c3aed" />
              <Text style={[styles.tableTitle, { color: colors.text }]}>Fatty Acid Profile</Text>
            </View>
            {FATTY_ACID_PROFILE.map((fa, idx) => (
              <Animated.View key={fa.name} entering={FadeInRight.delay(650 + idx * 40).springify()} style={styles.nutrientRow}>
                <View style={styles.nutrientInfo}>
                  <Text style={[styles.nutrientName, { color: colors.text }]}>{fa.name}</Text>
                  <Text style={[styles.nutrientAmount, { color: colors.textSecondary }]}>{fa.percentage}%</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                  <View style={[styles.progressFill, {
                    backgroundColor: fa.type === 'Saturated' ? '#ef4444' : fa.type === 'Monounsaturated' ? '#22c55e' : '#3b82f6',
                    width: `${(fa.percentage / 40) * 100}%`,
                  }]} />
                </View>
              </Animated.View>
            ))}
            <View style={[styles.faLegend, { borderTopColor: colors.divider }]}>
              {['Saturated', 'Monounsaturated', 'Polyunsaturated'].map(t => (
                <View key={t} style={styles.faLegendItem}>
                  <View style={[styles.faLegendDot, { backgroundColor: t === 'Saturated' ? '#ef4444' : t === 'Monounsaturated' ? '#22c55e' : '#3b82f6' }]} />
                  <Text style={[styles.faLegendText, { color: colors.textTertiary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Kernel Nutritional Composition */}
          <Animated.View
            entering={FadeInUp.delay(650).springify()}
            style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm, flex: 1 }]}
          >
            <View style={styles.tableHeader}>
              <Ionicons name="nutrition" size={22} color="#22c55e" />
              <Text style={[styles.tableTitle, { color: colors.text }]}>Kernel Composition</Text>
              <Text style={[styles.tableMeta, { color: colors.textTertiary }]}>per 100g</Text>
            </View>
            {Object.values(NUTRITIONAL_DATA).map((n, idx) => (
              <Animated.View key={n.label} entering={FadeInRight.delay(700 + idx * 40).springify()} style={styles.nutrientRow}>
                <View style={styles.nutrientInfo}>
                  <Text style={[styles.nutrientName, { color: colors.text }]}>{n.label}</Text>
                  <Text style={[styles.nutrientAmount, { color: colors.textSecondary }]}>{n.value}{n.unit}</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                  <View style={[styles.progressFill, {
                    backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#7c3aed'][idx] || '#3b82f6',
                    width: `${(n.value / (n.unit === 'kcal' ? 800 : 100)) * 100}%`,
                  }]} />
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        </View>

        {/* Physical Dimension Ranges */}
        <Animated.View
          entering={FadeInUp.delay(700).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="resize" size={22} color="#3b82f6" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Physical Dimension Ranges</Text>
          </View>
          {Object.values(DIMENSION_RANGES).map((d, idx) => (
            <Animated.View
              key={d.label}
              entering={FadeInLeft.delay(750 + idx * 50).springify()}
              style={[styles.tableRow, {
                backgroundColor: idx % 2 === 0 ? colors.background : 'transparent',
                borderBottomColor: colors.borderLight,
              }]}
            >
              <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>{d.label}</Text>
              <Text style={[styles.tableValue, { color: colors.text }]}>{d.min}–{d.max} {d.unit}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Uses of Talisay Oil */}
        <Animated.View
          entering={FadeInUp.delay(750).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="list" size={22} color="#14b8a6" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Uses of Talisay Oil</Text>
          </View>
          {BOTANICAL_INFO.usesOfOil.map((use, idx) => (
            <Animated.View key={use} entering={FadeInLeft.delay(800 + idx * 40).springify()} style={styles.oilUseItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={[styles.oilUseText, { color: colors.textSecondary }]}>{use}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Research References */}
        <Animated.View
          entering={FadeInUp.delay(800).springify()}
          style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.borderLight, ...Shadows.sm }]}
        >
          <View style={styles.tableHeader}>
            <Ionicons name="book" size={22} color="#7c3aed" />
            <Text style={[styles.tableTitle, { color: colors.text }]}>Key Research References</Text>
          </View>
          {RESEARCH_REFERENCES.map((ref, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInLeft.delay(850 + idx * 30).springify()}
              style={[styles.refRow, {
                borderBottomWidth: idx < RESEARCH_REFERENCES.length - 1 ? 1 : 0,
                borderBottomColor: colors.divider,
              }]}
            >
              <Text style={[styles.refAuthor, { color: colors.text }]}>
                {ref.author} ({ref.year})
              </Text>
              <Text style={[styles.refTitle, { color: colors.textSecondary }]}>{ref.title}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Text style={[styles.refJournal, { color: colors.textTertiary }]}>{ref.journal}</Text>
                <Text style={[styles.refOrigin, { color: colors.primary }]}>{ref.origin}</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Fun Fact Banner */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <LinearGradient
            colors={isDark ? ['#1b4332', '#2d6a4f'] : ['#d1fae5', '#a7f3d0']}
            style={styles.funFactBanner}
          >
            <Ionicons name="bulb" size={26} color={isDark ? '#a7f3d0' : '#2d6a4f'} />
            <Text style={[styles.funFactTitle, { color: isDark ? '#a7f3d0' : '#1b4332' }]}>
              Did you know?
            </Text>
            <Text style={[styles.funFactText, { color: isDark ? '#d1fae5' : '#2d6a4f' }]}>
              A single mature Talisay tree can produce up to 100 kg of fruit per year, and its
              kernels contain more protein than almonds and more healthy fats than most tree nuts!
            </Text>
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
  pageSubtitle: { ...Typography.body, maxWidth: 580 },
  content: { padding: Spacing.lg },
  contentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center', width: '100%',
    paddingHorizontal: Spacing.xxl,
  },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.xs },
  sectionSubtitle: { ...Typography.caption, marginBottom: Spacing.md },

  introCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  introText: { ...Typography.body, lineHeight: 24 },

  twoCol: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  twoColMobile: { flexDirection: 'column' },

  /* Classification Table */
  tableCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  tableTitle: { ...Typography.bodyMedium, flex: 1 },
  tableMeta: { ...Typography.small },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  tableLabel: { ...Typography.captionMedium, width: 110 },
  tableValue: { ...Typography.body, flex: 1 },

  /* Nutrition */
  nutrientRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  nutrientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutrientName: { ...Typography.captionMedium },
  nutrientAmount: { ...Typography.small },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Medicinal */
  medicinalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  medicinalGridMobile: { gap: Spacing.sm },
  medicinalCard: {
    width: '30%',
    minWidth: 240,
    flexGrow: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  medicinalIcon: {
    width: 44, height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  medicinalTitle: { ...Typography.bodyMedium },
  medicinalDesc: { ...Typography.small, lineHeight: 20 },

  /* Cultural */
  culturalList: { gap: Spacing.sm },
  culturalCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  culturalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  culturalIcon: {
    width: 36, height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  culturalTitle: { ...Typography.bodyMedium },
  culturalDesc: { ...Typography.caption, paddingLeft: 52, lineHeight: 20 },

  /* Gallery */
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  galleryGridMobile: { gap: Spacing.sm },
  galleryItem: {
    width: '48%',
    minWidth: 200,
    aspectRatio: 1.5,
    flexGrow: 1,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  galleryCaption: {
    color: '#fff',
    ...Typography.captionMedium,
  },

  /* Fun Fact */
  funFactBanner: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  funFactTitle: { ...Typography.h4 },
  funFactText: { ...Typography.body, lineHeight: 22 },

  /* Science Summary Cards */
  sciCards: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  sciCardsMobile: { gap: Spacing.sm },
  sciCard: {
    width: '22%', minWidth: 160, flexGrow: 1,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1,
    alignItems: 'center', gap: Spacing.xs,
  },
  sciCardIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  sciCardValue: { ...Typography.h2, fontWeight: '700' },
  sciCardLabel: { ...Typography.captionMedium, textAlign: 'center' },
  sciCardDetail: { ...Typography.small, textAlign: 'center' },

  /* Chips */
  sciChipSection: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  sciChipLabel: { ...Typography.caption, marginBottom: Spacing.xs },
  sciChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  sciChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  sciChipText: { ...Typography.small, fontWeight: '500' },

  /* Oil Yield Comparison */
  oilYieldCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm },
  oilDot: { width: 12, height: 12, borderRadius: 6 },
  oilLabel: { ...Typography.bodyMedium },
  oilCompareRow: { flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' },
  oilCompareCol: { gap: 2 },
  oilCompareHeader: { ...Typography.tiny },
  oilCompareVal: { ...Typography.captionMedium, fontWeight: '700' },
  oilDesc: { ...Typography.small },

  /* Extraction */
  extractRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, flexWrap: 'wrap' },
  extractMethod: { ...Typography.captionMedium, minWidth: 90, flexShrink: 0 },
  extractYield: { ...Typography.captionMedium, minWidth: 60, flexShrink: 0 },
  extractQuality: { ...Typography.small, flex: 1, minWidth: 80 },

  /* Fatty Acid Legend */
  faLegend: { flexDirection: 'row', gap: Spacing.md, borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, flexWrap: 'wrap' },
  faLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  faLegendDot: { width: 8, height: 8, borderRadius: 4 },
  faLegendText: { ...Typography.tiny },

  /* Oil Uses */
  oilUseItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4, paddingHorizontal: Spacing.md },
  oilUseText: { ...Typography.caption, flex: 1 },

  /* References */
  refRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2 },
  refAuthor: { ...Typography.captionMedium },
  refTitle: { ...Typography.small, fontStyle: 'italic' },
  refJournal: { ...Typography.tiny },
  refOrigin: { ...Typography.tiny, fontWeight: '600' },
});
