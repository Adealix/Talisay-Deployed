/**
 * Talisay AI — Hero Carousel
 * Full-width image carousel with captions, auto-play, swipe, and arrows.
 * Performance: Uses FlatList for efficient rendering.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Spacing, BorderRadius, Typography } from '../../constants/Layout';
import { CAROUSEL } from '../../constants/images';

const CAROUSEL_DATA = [
  {
    id: '1',
    title: 'Terminalia Catappa',
    subtitle: 'The Tropical Almond',
    caption: 'A majestic tropical tree found across Southeast Asia, known for its large decorative leaves that turn vivid red, copper, and gold before falling.',
    color: '#2d6a4f',
    gradient: ['rgba(45,106,79,0.3)', 'rgba(27,67,50,0.85)'],
    imageSource: CAROUSEL.slide1,
    resizeMode: 'cover',
  },
  {
    id: '2',
    title: 'Talisay Oil',
    subtitle: "Nature's Hidden Gem",
    caption: 'The fruit of Terminalia Catappa contains a nutrient-rich kernel prized for its oil content of 38–65%, used in food, cosmetics, and biofuel research.',
    color: '#40916c',
    gradient: ['rgba(64,145,108,0.3)', 'rgba(45,106,79,0.85)'],
    imageSource: CAROUSEL.slide2,
    resizeMode: 'cover',
  },
  {
    id: '3',
    title: 'Maturity Grading',
    subtitle: 'AI-Powered Classification',
    caption: 'TalisayOil uses CNN-based image analysis to classify Green, Yellow, and Brown maturity stages — predicting oil yield with high accuracy.',
    color: '#d4a24e',
    gradient: ['rgba(212,162,78,0.3)', 'rgba(139,90,43,0.85)'],
    imageSource: CAROUSEL.slide3,
    resizeMode: 'cover',
  },
  {
    id: '4',
    title: 'Oil Yield Prediction',
    subtitle: 'From Fruit to Data',
    caption: 'Research from DOST and international studies reports oil yields of 24–65% depending on maturity stage and extraction method. Our system helps predict these outcomes.',
    color: '#52b788',
    gradient: ['rgba(82,183,136,0.3)', 'rgba(45,106,79,0.85)'],
    imageSource: CAROUSEL.slide4,
    resizeMode: 'cover',
  },
];

const AUTO_PLAY_INTERVAL = 5000;

function PaginationDot({ index, activeIndex, color }) {
  const animStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    return {
      width: withSpring(isActive ? 28 : 8, { damping: 15 }),
      opacity: withTiming(isActive ? 1 : 0.4, { duration: 300 }),
      backgroundColor: color,
    };
  });

  return <Animated.View style={[styles.dot, animStyle]} />;
}

function ArrowButton({ direction, onPress }) {
  const scale = useSharedValue(1);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.85); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[styles.arrowBtn, direction === 'left' ? styles.arrowLeft : styles.arrowRight]}
      accessibilityLabel={`${direction === 'left' ? 'Previous' : 'Next'} slide`}
    >
      <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))}>
        <Ionicons
          name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
          size={28}
          color="#fff"
        />
      </Animated.View>
    </Pressable>
  );
}

export default function HeroCarousel() {
  const { colors, isDark } = useTheme();
  const { width, isMobile, isDesktop } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoPlayRef = useRef(null);
  const activeIndex = useSharedValue(0);

  const carouselHeight = isMobile ? 360 : isDesktop ? 520 : 440;

  // Auto-play
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % CAROUSEL_DATA.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        activeIndex.value = next;
        return next;
      });
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(autoPlayRef.current);
  }, []);

  const resetAutoPlay = useCallback(() => {
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % CAROUSEL_DATA.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        activeIndex.value = next;
        return next;
      });
    }, AUTO_PLAY_INTERVAL);
  }, []);

  const goTo = useCallback((index) => {
    const idx = ((index % CAROUSEL_DATA.length) + CAROUSEL_DATA.length) % CAROUSEL_DATA.length;
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrentIndex(idx);
    activeIndex.value = idx;
    resetAutoPlay();
  }, [resetAutoPlay]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      setCurrentIndex(idx);
      activeIndex.value = idx;
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item, index }) => (
    <View style={[styles.slide, { width, height: carouselHeight }]}>
      {/* Background color base */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: item.color }]} />
      
      {/* Background image — local asset */}
      <Image
        source={item.imageSource}
        style={[StyleSheet.absoluteFillObject, styles.slideImage]}
        resizeMode={item.resizeMode || 'cover'}
      />
      
      {/* Dark gradient overlay */}
      <LinearGradient
        colors={item.gradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Content */}
      <View style={[styles.slideContent, isMobile && styles.slideContentMobile]}>
        <Animated.View
          entering={FadeInUp.delay(200).duration(280)}
          style={styles.captionContainer}
        >
          <Text style={[styles.slideSubtitle, isMobile && { fontSize: 13 }]}>
            {item.subtitle}
          </Text>
          <Text style={[styles.slideTitle, isMobile && { fontSize: 30, lineHeight: 36 }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.slideCaption, isMobile && { fontSize: 14, lineHeight: 21 }]}
            numberOfLines={3}
          >
            {item.caption}
          </Text>
        </Animated.View>
      </View>
    </View>
  ), [width, carouselHeight, isMobile]);

  return (
    <View style={[styles.container, { height: carouselHeight }]}>
      <FlatList
        ref={flatListRef}
        data={CAROUSEL_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== 'web'}
      />

      {/* Desktop arrows */}
      {isDesktop && (
        <>
          <ArrowButton direction="left" onPress={() => goTo(currentIndex - 1)} />
          <ArrowButton direction="right" onPress={() => goTo(currentIndex + 1)} />
        </>
      )}

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {CAROUSEL_DATA.map((_, idx) => (
          <PaginationDot
            key={idx}
            index={idx}
            activeIndex={activeIndex}
            color="#fff"
          />
        ))}
      </View>

      {/* Slide indicator */}
      <View style={styles.slideCounter}>
        <Text style={styles.slideCounterText}>
          {currentIndex + 1} / {CAROUSEL_DATA.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  slide: {
    position: 'relative',
    overflow: 'hidden',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 20,
    paddingLeft: 80,
  },
  slideContentMobile: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 16,
    paddingLeft: Spacing.lg,
  },
  captionContainer: {
    maxWidth: 600,
  },
  slideSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  slideTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 50,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  slideCaption: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  pagination: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  arrowBtn: {
    position: 'absolute',
    top: '40%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'background-color 0.2s',
      },
    }),
  },
  arrowLeft: {
    left: Spacing.md,
  },
  arrowRight: {
    right: Spacing.md,
  },
  slideCounter: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  slideCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
});
