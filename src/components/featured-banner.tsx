import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused } from 'expo-router';
import { colors as c, fonts } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import type { Meal } from '@/types';
import { Button, FoodImage, Icon, T } from './ui';

const stories = [
  {
    eyebrow: 'YOUR BREAK, MADE BETTER',
    title: 'Skip the line.',
    accent: 'Savor the break.',
    body: 'Fresh favorites.\nReady for your break.',
  },
  {
    eyebrow: 'A LITTLE CAMPUS COMFORT',
    title: 'Good food.',
    accent: 'Better breaks.',
    body: 'Make room for\na campus favorite.',
  },
  {
    eyebrow: 'FIND YOUR NEXT FAVORITE',
    title: 'Fresh picks.',
    accent: 'Happy breaks.',
    body: 'A little variety.\nA lot to enjoy.',
  },
  {
    eyebrow: 'MAKE IT A GOOD BREAK',
    title: 'Pick a favorite.',
    accent: 'Make it yours.',
    body: 'Explore what’s cooking.\nFind your next good meal.',
  },
];

export function FeaturedBanner({ meals, onExplore }: { meals: Meal[]; onExplore: () => void }) {
  const { contentWidth, fontScale } = useLayout();
  const focused = useIsFocused();
  const slides = useMemo(() => {
    const active = meals.filter((meal) => meal.is_active);
    const featured = active.filter((meal) => meal.featured);
    const choices: (Meal | undefined)[] = featured.length
      ? featured.slice(0, 4)
      : active.slice(0, 4);
    if (!choices.length) choices.push(undefined);
    return choices.map((meal, index) => ({ id: meal?.id ?? 'daily', meal, ...stories[index] }));
  }, [meals]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [appActive, setAppActive] = useState(
    () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));
  const transition = useRef<Animated.CompositeAnimation | null>(null);
  const generation = useRef(0);
  const index = Math.max(
    0,
    slides.findIndex((slide) => slide.id === activeId),
  );
  const slide = slides[index];
  const width = measuredWidth || contentWidth - (contentWidth >= 1000 ? 313 : 0);
  const compact = width < 600;
  const scale = Math.max(1, fontScale);
  const height = Math.ceil((compact ? 244 : 280) * scale);
  const photoSize = compact ? (width < 340 ? 132 : 160) : 260;
  const titleSize = compact ? (width < 340 ? 25 : 28) : 38;

  useEffect(() => {
    let disposed = false;
    let motionChanged = false;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      motionChanged = true;
      setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (!disposed && !motionChanged) setReducedMotion(enabled);
      },
      () => {},
    );
    const state = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => {
      disposed = true;
      generation.current += 1;
      transition.current?.stop();
      motion?.remove();
      state.remove();
    };
  }, []);

  useEffect(() => {
    generation.current += 1;
    transition.current?.stop();
    const reveal = Animated.timing(opacity, {
      toValue: 1,
      duration: reducedMotion ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    transition.current = reveal;
    reveal.start();
    return () => reveal.stop();
  }, [slide.id, reducedMotion, opacity]);

  useEffect(() => {
    if (!focused || !appActive) {
      generation.current += 1;
      transition.current?.stop();
      opacity.setValue(1);
    }
  }, [focused, appActive, opacity]);

  const show = useCallback(
    (next: number) => {
      const target = slides[(next + slides.length) % slides.length];
      const version = ++generation.current;
      transition.current?.stop();
      if (reducedMotion || target.id === slide.id) {
        opacity.setValue(1);
        setActiveId(target.id);
        return;
      }
      const hide = Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      });
      transition.current = hide;
      hide.start(({ finished }) => {
        if (finished && generation.current === version) setActiveId(target.id);
      });
    },
    [slides, slide.id, reducedMotion, opacity],
  );

  useEffect(() => {
    if (!focused || !appActive || reducedMotion || slides.length < 2) return;
    const timer = setInterval(() => show(index + 1), 6500);
    return () => clearInterval(timer);
  }, [focused, appActive, reducedMotion, slides.length, index, show]);

  return (
    <View
      testID="featured-banner"
      role="region"
      accessibilityLabel="Featured campus meals"
      onLayout={({ nativeEvent }) => setMeasuredWidth(Math.round(nativeEvent.layout.width))}
      style={styles.banner}
    >
      <View style={{ height, overflow: 'hidden' }}>
        <Animated.View
          testID="banner-slide"
          style={{
            height,
            opacity,
            transform: [
              { translateX: opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
          }}
        >
          <View
            style={{
              width: compact ? '100%' : '62%',
              padding: compact ? 20 : 29,
              paddingRight: compact ? 20 : 0,
              zIndex: 1,
            }}
          >
            <View style={styles.eyebrow}>
              <T style={styles.eyebrowText}>{slide.eyebrow}</T>
            </View>
            <T
              testID="banner-title"
              style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}
            >
              {slide.title}
            </T>
            <T
              style={[
                styles.title,
                { fontSize: titleSize, lineHeight: titleSize + 6, color: c.orangeDark },
              ]}
            >
              {slide.accent}
            </T>
            <T testID="banner-body" style={[styles.body, { maxWidth: compact ? 150 : 245 }]}>
              {slide.body}
            </T>
          </View>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={slide.meal ? `Featured ${slide.meal.name}` : 'Campus kitchen'}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: photoSize,
              height: photoSize,
              right: compact ? -22 : -15,
              bottom: compact ? -28 : 5,
            }}
          >
            <View style={[styles.photo, { width: photoSize, height: photoSize }]}>
              {slide.meal ? (
                <FoodImage
                  uri={slide.meal.image_url}
                  style={{ width: '100%', height: '100%', borderRadius: 150 }}
                />
              ) : (
                <Icon name="silverware-fork-knife" size={60} color={c.orangeDark} />
              )}
            </View>
            {!compact && slide.meal && (
              <View style={styles.caption}>
                <T style={styles.captionLabel}>CAMPUS PICK</T>
                <T bold numberOfLines={2} style={{ fontSize: 11, lineHeight: 16 }}>
                  {slide.meal.name}
                </T>
              </View>
            )}
          </View>
        </Animated.View>
        <View
          style={{
            position: 'absolute',
            left: compact ? 20 : 29,
            bottom: 16,
            maxWidth: width - 40,
          }}
        >
          <Button small onPress={onExplore} icon="arrow-right">
            Explore the menu
          </Button>
        </View>
      </View>
      {slides.length > 1 && (
        <View style={styles.controls}>
          <View style={{ flexDirection: 'row' }}>
            {slides.map((item, position) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Show feature ${position + 1}: ${item.meal?.name ?? 'Campus kitchen'}`}
                accessibilityHint="Shows this feature. Automatic rotation continues."
                accessibilityState={{ selected: position === index }}
                aria-pressed={position === index}
                onPress={() => show(position)}
                style={styles.dotButton}
              >
                <View
                  style={{
                    width: position === index ? 21 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: position === index ? c.orangeDark : '#D6B497',
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 26, borderRadius: 22, overflow: 'hidden', backgroundColor: '#FEE9D8' },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: '#FFF8EF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  eyebrowText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 1.1,
    color: c.orangeDark,
  },
  title: { fontFamily: fonts.display, letterSpacing: -1.2 },
  body: { marginTop: 10, fontSize: 12, lineHeight: 18, color: '#967B66' },
  photo: {
    borderRadius: 150,
    backgroundColor: '#F9C79E',
    padding: 12,
    transform: [{ rotate: '-12deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    left: -20,
    bottom: 20,
    maxWidth: 190,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: c.white,
    boxShadow: '0px 5px 16px rgba(86, 53, 28, 0.08)',
  },
  captionLabel: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1, color: c.orangeDark },
  controls: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
