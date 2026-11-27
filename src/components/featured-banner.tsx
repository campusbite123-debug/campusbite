import { MotionPressable as Pressable } from '@/components/motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import { money } from '@/utils/domain';
import type { Meal } from '@/types';
import { FoodImage, Icon, T } from './ui';

export function FeaturedBanner({
  meals,
  onExplore,
  onView,
}: {
  meals: Meal[];
  onExplore: () => void;
  onView: (meal: Meal) => void;
}) {
  const c = useColors();
  const styles = useComponentStyles();

  const { contentWidth, fontScale } = useLayout();
  const focused = useIsFocused();
  const slides = useMemo(() => {
    const active = meals.filter((meal) => meal.is_active);
    const featured = active.filter((meal) => meal.featured);
    const choices: (Meal | undefined)[] = featured.length
      ? featured.slice(0, 4)
      : active.slice(0, 4);
    if (!choices.length) choices.push(undefined);
    return choices.map((meal) => ({ id: meal?.id ?? 'daily', meal }));
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
  const tight = width / scale < 340;
  const padding = compact ? 18 : 30;
  const titleSize = compact ? (tight ? 39 : 47) : 64;
  const serifSize = compact ? (tight ? 44 : 53) : 74;
  const photoSize = compact ? Math.round(width * 0.84) : 490;
  const featureWidth = compact ? (tight ? 164 : 214) : 285;
  const dotWidth = tight ? 18 : 24;
  const meal = slide.meal;

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
      style={[styles.banner, { padding, minHeight: compact ? 340 * scale : 415 * scale }]}
    >
      <Animated.View
        testID="banner-slide"
        pointerEvents="none"
        accessible
        accessibilityRole="image"
        accessibilityLabel={meal ? `Featured ${meal.name}` : 'Campus kitchen'}
        style={[
          styles.photo,
          { width: photoSize, height: photoSize, opacity, top: compact ? 65 : 5 },
        ]}
      >
        {meal ? (
          <FoodImage
            uri={meal.image_url}
            style={{ width: '100%', height: '100%', borderRadius: 300 }}
          />
        ) : (
          <Icon name="silverware-fork-knife" size={80} color={c.seafoam} />
        )}
      </Animated.View>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="home-hero-shade" x1="0" y1="0" x2="1" y2="0.8">
            <Stop offset="0" stopColor={c.hero} stopOpacity="1" />
            <Stop offset="0.38" stopColor={c.hero} stopOpacity="0.88" />
            <Stop offset="1" stopColor={c.hero} stopOpacity="0.07" />
          </LinearGradient>
          <LinearGradient id="home-hero-bottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.5" stopColor={c.hero} stopOpacity="0" />
            <Stop offset="1" stopColor={c.hero} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#home-hero-shade)" />
        <Rect width="100%" height="100%" fill="url(#home-hero-bottom)" />
      </Svg>
      <View style={styles.club}>
        <Icon name="star-four-points" color={c.lime} size={17} />
        <T style={styles.clubText}>THE CAMPUS LUNCH CLUB</T>
      </View>
      <View style={{ marginTop: compact ? 14 : 20 }}>
        <T
          accessibilityRole="header"
          style={[styles.headline, { fontSize: titleSize, lineHeight: titleSize + 3 }]}
        >
          Good food.
        </T>
        <T style={[styles.serif, { fontSize: serifSize, lineHeight: serifSize + 1 }]}>
          Better breaks.
        </T>
      </View>
      <T testID="banner-body" style={styles.body}>
        Campus favorites, made fresh.{'\n'}Ready when you are.
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore the menu"
        onPress={onExplore}
        style={({ pressed }) => [styles.explore, { opacity: pressed ? 0.85 : 1 }]}
      >
        <T bold style={{ color: c.ink, fontSize: 12 }}>
          Explore the menu
        </T>
        <Icon name="arrow-right" size={17} color={c.ink} />
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.length > 1 &&
            slides.map((item, position) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Show feature ${position + 1}: ${item.meal?.name ?? 'Campus kitchen'}`}
                accessibilityHint="Shows this feature. Automatic rotation continues."
                accessibilityState={{ selected: position === index }}
                aria-pressed={position === index}
                onPress={() => show(position)}
                style={[styles.dotButton, { width: dotWidth }]}
              >
                <View
                  style={{
                    width: position === index ? 13 : 4,
                    height: 4,
                    borderRadius: 3,
                    backgroundColor: position === index ? c.lime : c.seafoam + '70',
                  }}
                />
              </Pressable>
            ))}
        </View>
        {meal && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View featured ${meal.name}`}
            onPress={() => onView(meal)}
            style={({ pressed }) => [
              styles.feature,
              { width: featureWidth, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.featureIcon}>
              <Icon name="star-four-points" size={21} color={c.lime} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={styles.featureLabel}>TODAY’S FEATURE</T>
              <T testID="banner-title" numberOfLines={1} style={styles.featureTitle}>
                {meal.name}
              </T>
              <T style={styles.featureMeta}>
                {money(meal.price)} · {meal.prep_minutes} min prep
              </T>
            </View>
            <Icon name="chevron-right" color={c.white} size={16} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        banner: { backgroundColor: c.hero, borderRadius: 20, overflow: 'hidden', marginBottom: 18 },
        photo: {
          position: 'absolute',
          right: -35,
          borderRadius: 300,
          alignItems: 'center',
          justifyContent: 'center',
        },
        club: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 7,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: c.lime + '45',
          borderRadius: 24,
          backgroundColor: c.white + '07',
        },
        clubText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.1, color: c.lime },
        headline: { fontFamily: fonts.display, color: c.white, letterSpacing: -2.6 },
        serif: { fontFamily: fonts.serifItalic, color: c.lime, letterSpacing: -1.5, marginTop: -5 },
        body: {
          fontFamily: fonts.medium,
          color: c.white,
          fontSize: 12,
          lineHeight: 17,
          marginTop: 8,
          maxWidth: 255,
        },
        explore: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 44,
          paddingHorizontal: 14,
          backgroundColor: c.lime,
          borderRadius: 10,
          marginTop: 12,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 10,
        },
        dots: { flexDirection: 'row', marginLeft: -4 },
        dotButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
        feature: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          padding: 9,
          minHeight: 62,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.seafoam + '45',
          backgroundColor: c.hero + 'DD',
        },
        featureIcon: {
          width: 27,
          height: 27,
          borderRadius: 8,
          backgroundColor: c.lime + '15',
          alignItems: 'center',
          justifyContent: 'center',
        },
        featureLabel: {
          fontFamily: fonts.bold,
          fontSize: 7,
          lineHeight: 10,
          letterSpacing: 1,
          color: c.lime,
        },
        featureTitle: {
          fontFamily: fonts.bold,
          fontSize: 10,
          lineHeight: 14,
          color: c.white,
        },
        featureMeta: { fontFamily: fonts.medium, fontSize: 9, lineHeight: 12, color: c.seafoam },
      }),
    [c],
  );
}
