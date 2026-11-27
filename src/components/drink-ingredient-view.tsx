import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import { useMotionReduced } from './motion';
import { T } from './ui';

export function DrinkIngredientView() {
  const styles = useComponentStyles();

  const reduced = useMotionReduced();
  const { contentWidth, height, fontScale } = useLayout();
  const [width, setWidth] = useState(Math.min(550, contentWidth));
  const stageHeight = Math.round(
    Math.min(width * 1.4, height * 0.6) * Math.max(1, fontScale / 1.2),
  );
  const vesselHeight = stageHeight * 0.55;
  const vesselWidth = vesselHeight * (285 / 774);
  const center = width * 0.64;
  const mouthY = stageHeight * 0.42;
  const splashHeight = stageHeight * 0.38;
  const splashWidth = splashHeight * (480 / 709);
  const fillHeight = vesselHeight * 0.73;
  const [progress] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(700),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  const fillScale = progress.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 0.04, 0.01] });
  const splashScale = progress.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0.03, 0.03, 1],
  });
  const splashOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.4, 1],
    outputRange: [0, 0, 1, 1],
  });
  const labelHeight = 36 * Math.max(1, fontScale);
  // The image's bottom-center stem stays attached to the mouth throughout expansion.
  const anchorX = center - splashWidth * 0.23;
  const anchorY = mouthY - splashHeight * 0.72;
  return (
    <View
      testID="ingredient-stage"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.stage, { height: stageHeight }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.frame]} pointerEvents="none" />
      <View
        style={{
          position: 'absolute',
          left: center - vesselWidth * 0.41,
          top: mouthY + vesselHeight * 0.2,
          width: vesselWidth * 0.82,
          height: fillHeight,
          overflow: 'hidden',
          borderRadius: vesselWidth * 0.18,
          zIndex: 1,
        }}
      >
        <Animated.View
          testID="water-fill"
          style={{
            flex: 1,
            backgroundColor: '#DCE9EC',
            borderTopWidth: 1,
            borderTopColor: '#ADC5CD',
            opacity: progress.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [0.55, 0.35, 0],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, fillHeight * 0.495],
                }),
              },
              { scaleY: fillScale },
            ],
          }}
        >
          <Image
            source={require('../../assets/ingredients/water-liquid.webp')}
            cachePolicy="memory-disk"
            transition={0}
            contentFit="fill"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
        </Animated.View>
      </View>
      <View
        testID="ingredient-layer-1"
        style={{
          position: 'absolute',
          left: center - vesselWidth / 2,
          top: mouthY,
          width: vesselWidth,
          height: vesselHeight,
        }}
      >
        <Image
          source={require('../../assets/ingredients/water-bottle.webp')}
          cachePolicy="memory-disk"
          transition={0}
          contentFit="contain"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
      </View>
      <View
        testID="water-neck"
        pointerEvents="none"
        style={{ position: 'absolute', left: center - 2, top: mouthY - 2, width: 4, height: 4 }}
      />
      <Animated.View
        testID="water-jet"
        pointerEvents="none"
        style={[
          styles.jet,
          {
            left: center - 3,
            width: 6,
            backgroundColor: '#D8E5E8',
            borderColor: '#ACBEC4',
            top: mouthY - splashHeight * 0.2,
            height: splashHeight * 0.2 + 4,
            opacity: splashOpacity,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.12, 1],
                  outputRange: [
                    (splashHeight * 0.2 + 4) * 0.485,
                    (splashHeight * 0.2 + 4) * 0.485,
                    0,
                  ],
                }),
              },
              { scaleY: splashScale },
            ],
          },
        ]}
      />
      <Animated.View
        testID="ingredient-layer-0"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: center - splashWidth / 2,
          top: mouthY - splashHeight,
          width: splashWidth,
          height: splashHeight,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: [splashHeight * 0.485, splashHeight * 0.485, 0],
              }),
            },
            { scale: splashScale },
          ],
        }}
      >
        <Animated.View
          testID="water-splash"
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
        >
          <Image
            source={require('../../assets/ingredients/water-splash.webp')}
            cachePolicy="memory-disk"
            transition={0}
            contentFit="contain"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        testID="ingredient-callout-0"
        style={[
          styles.callout,
          {
            top: anchorY - labelHeight / 2,
            width: anchorX - 16 + 2.5,
            height: labelHeight,
            opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1] }),
          },
        ]}
      >
        <T style={[styles.label, { width: Math.min(104, width * 0.28) }]}>Purified water</T>
        <View style={styles.leader} />
        <View testID="ingredient-anchor-0" style={styles.anchor} />
      </Animated.View>
    </View>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        stage: { backgroundColor: c.white, borderRadius: 20, overflow: 'hidden' },
        frame: { borderWidth: 1, borderColor: c.line, borderRadius: 20 },
        jet: {
          position: 'absolute',
          width: 6,
          borderRadius: 4,
          backgroundColor: '#D8E5E8',
          borderWidth: 1,
          borderColor: '#ACBEC4',
        },
        callout: {
          position: 'absolute',
          left: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        },
        label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: c.ink },
        leader: { flex: 1, height: 1, backgroundColor: c.muted + '65' },
        anchor: {
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: c.teal,
          borderWidth: 1,
          borderColor: c.white,
        },
      }),
    [c],
  );
}
