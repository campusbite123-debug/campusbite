import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

type LoadingProps = {
  variant?: 'menu' | 'list' | 'dashboard';
  inShell?: boolean;
  hero?: boolean;
  label?: string;
};

function Bone({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.bone, style]} />;
}

function useSkeletonPulse() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let disposed = false;
    let preferenceChanged = false;
    let reducedMotion = true;
    let active = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let animation: Animated.CompositeAnimation | undefined;
    const update = () => {
      animation?.stop();
      opacity.setValue(1);
      if (disposed || reducedMotion || !active) return;
      const timing = (toValue: number) =>
        Animated.timing(opacity, {
          toValue,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        });
      // One shared animation for the entire skeleton, with no per-frame React renders.
      animation = Animated.loop(Animated.sequence([timing(0.55), timing(1)]));
      animation.start();
    };
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      reducedMotion = enabled;
      update();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (disposed || preferenceChanged) return;
        reducedMotion = enabled;
        update();
      },
      () => {},
    );
    const state = AppState.addEventListener('change', (next) => {
      active = next === 'active';
      update();
    });
    return () => {
      disposed = true;
      animation?.stop();
      motion?.remove();
      state.remove();
    };
  }, [opacity]);
  return opacity;
}

export function Loading({
  variant = 'menu',
  inShell = false,
  hero = true,
  label = 'Loading your canteen',
}: LoadingProps) {
  const { width, isPhone, pagePadding, contentWidth } = useLayout();
  const insets = useSafeAreaInsets();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const previousWidth = useRef(0);
  const opacity = useSkeletonPulse();
  const availableWidth = measuredWidth || (inShell ? contentWidth : width - pagePadding * 2);
  const gap = isPhone ? 12 : 16;
  const columns =
    availableWidth < 340 ? 1 : availableWidth < 660 ? 2 : availableWidth < 1000 ? 3 : 4;
  const cardWidth = Math.max(0, Math.floor((availableWidth - gap * (columns - 1)) / columns));
  const metricWidth = Math.max(
    0,
    Math.floor(
      (availableWidth - gap * (availableWidth < 700 ? 1 : 3)) / (availableWidth < 700 ? 2 : 4),
    ),
  );
  return (
    <View
      testID="loading-skeleton"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      aria-busy
      style={[styles.root, { paddingTop: inShell ? 0 : insets.top }]}
    >
      <ScrollView
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: pagePadding,
          paddingBottom: 32,
          width: '100%',
          maxWidth: 1600,
          alignSelf: 'center',
        }}
      >
        <Animated.View
          testID="skeleton-animation"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={({ nativeEvent }) => {
            const next = Math.floor(nativeEvent.layout.width);
            if (next !== previousWidth.current) {
              previousWidth.current = next;
              setMeasuredWidth(next);
            }
          }}
          style={{ opacity, gap: 24 }}
        >
          {/* Keep the same children on the server and first client render, before fonts load. */}
          <View style={{ gap: 12 }}>
            <Bone style={{ width: 108, height: 10 }} />
            <Bone style={{ width: '78%', maxWidth: 440, height: isPhone ? 28 : 34 }} />
            <Bone style={{ width: '56%', maxWidth: 290, height: 12 }} />
          </View>

          {variant === 'menu' ? (
            <>
              {hero && (
                <View style={[styles.hero, { height: isPhone ? 288 : 324 }]}>
                  <View style={{ flex: 1, maxWidth: 390, gap: 14 }}>
                    <Bone style={{ width: '55%', height: 9, backgroundColor: '#E8D8C8' }} />
                    <Bone style={{ width: '90%', height: 25, backgroundColor: '#E8D8C8' }} />
                    <Bone style={{ width: '70%', height: 25, backgroundColor: '#E8D8C8' }} />
                    <Bone style={{ width: '80%', height: 10, marginTop: 3 }} />
                    <Bone style={{ width: 100, height: 37, borderRadius: 12, marginTop: 7 }} />
                  </View>
                  <Bone
                    style={{
                      width: isPhone ? 82 : 150,
                      aspectRatio: 1,
                      borderRadius: 100,
                      backgroundColor: '#E8D8C8',
                    }}
                  />
                </View>
              )}
              <View style={styles.search}>
                <Bone style={{ width: 18, height: 18, borderRadius: 9 }} />
                <Bone style={{ width: '55%', height: 11 }} />
              </View>
              <View style={[styles.row, { gap: 10 }]}>
                {[80, 72, 72].map((item, index) => (
                  <Bone key={index} style={{ width: item, height: 40, borderRadius: 12 }} />
                ))}
              </View>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Bone style={{ width: '45%', maxWidth: 210, height: 20 }} />
                <Bone style={{ width: 60, height: 10 }} />
              </View>
              <View style={[styles.row, { flexWrap: 'wrap', gap }]}>
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <View
                    key={item}
                    testID="skeleton-card"
                    style={[styles.card, { width: cardWidth, padding: 8, borderRadius: 23 }]}
                  >
                    <Bone
                      style={{
                        width: '100%',
                        aspectRatio: cardWidth >= 240 ? 1.35 : 1.2,
                        borderRadius: 16,
                      }}
                    />
                    <View style={{ padding: 5, paddingTop: 12, gap: 10 }}>
                      <Bone style={{ width: '45%', height: 9 }} />
                      <Bone style={{ width: '88%', height: 13 }} />
                      <Bone style={{ width: '60%', height: 10 }} />
                      <Bone style={{ width: '52%', height: 10 }} />
                      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 5 }]}>
                        <Bone style={{ width: '38%', height: 17 }} />
                        <Bone style={{ width: 70, height: 44, borderRadius: 13 }} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {variant === 'dashboard' && (
                <View style={[styles.row, { flexWrap: 'wrap', gap }]}>
                  {[0, 1, 2, 3].map((item) => (
                    <View
                      key={item}
                      style={[styles.card, { width: metricWidth, padding: 18, gap: 15 }]}
                    >
                      <Bone style={{ width: 32, height: 32, borderRadius: 10 }} />
                      <Bone style={{ width: '62%', height: 12 }} />
                      <Bone style={{ width: '80%', height: 27 }} />
                    </View>
                  ))}
                </View>
              )}
              <View style={[styles.row, { gap: 10 }]}>
                <Bone style={{ width: 90, height: 40, borderRadius: 12 }} />
                <Bone style={{ width: 90, height: 40, borderRadius: 12 }} />
              </View>
              {[0, 1, 2].map((item) => (
                <View key={item} style={[styles.card, { padding: 18, gap: 18 }]}>
                  <View style={styles.row}>
                    <Bone style={{ width: 44, height: 44, borderRadius: 14 }} />
                    <View style={{ flex: 1, gap: 10 }}>
                      <Bone style={{ width: '66%', maxWidth: 230, height: 13 }} />
                      <Bone style={{ width: '42%', maxWidth: 150, height: 10 }} />
                    </View>
                  </View>
                  <Bone style={{ height: 1 }} />
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <Bone style={{ width: '34%', height: 12 }} />
                    <Bone style={{ width: 70, height: 18 }} />
                  </View>
                </View>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', backgroundColor: c.cream },
  bone: { borderRadius: 6, backgroundColor: '#E5E5DC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: c.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
  },
  hero: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#F5EDE2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  search: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
  },
});
