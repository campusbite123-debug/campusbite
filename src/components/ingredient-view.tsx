import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { mealIngredients } from '@/constants/meal-ingredients';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import {
  ingredientArtFor,
  ingredientImageSources,
  type IngredientArt,
} from '@/constants/ingredient-art';
import { foodImageSource } from '@/constants/food-images';
import { useLayout } from '@/hooks/use-layout';
import type { Meal } from '@/types';
import { useMotionReduced, useReveal } from './motion';
import { FoodImage, T, useStyles } from './ui';
import { DrinkIngredientView } from './drink-ingredient-view';
import { TeaFluidView } from './tea-fluid-view';
import { IngredientImageLoader } from './ingredient-image-loader';

function IngredientStack({ art }: { art: IngredientArt }) {
  const styles = useComponentStyles();

  const reduced = useMotionReduced();
  const { contentWidth, height, fontScale } = useLayout();
  const [width, setWidth] = useState(Math.min(550, contentWidth));
  const stageHeight = Math.round(
    Math.min(width * 1.4, height * 0.6) * Math.max(1, fontScale / 1.2),
  );
  const inset = 18;
  const foodHeight = stageHeight - inset * 2;
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
        duration: 1200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  return (
    <View
      testID="ingredient-stage"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.stage, { height: stageHeight }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.frame]} pointerEvents="none" />
      {art.layers.map((layer, index) => {
        const layerHeight = foodHeight * layer.height;
        const imageWidth = Math.min(width * 0.72, layerHeight * layer.aspectRatio);
        const anchorDistance = imageWidth * 0.32;
        const angle = (layer.angle * Math.PI) / 180;
        // Anchor the leader inside the actual contained image, accounting for its rotation.
        const anchorX = width * 0.64 - anchorDistance * Math.cos(angle);
        const anchorY = -anchorDistance * Math.sin(angle);
        const labelHeight = 36 * Math.max(1, fontScale);
        const travel = (layer.separated - layer.assembled) * foodHeight;
        return (
          <React.Fragment key={index}>
            <Animated.View
              testID={`ingredient-layer-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: '28%',
                width: '72%',
                height: layerHeight,
                top: inset + foodHeight * layer.assembled,
                zIndex: art.layers.length - index,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, travel],
                    }),
                  },
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, layer.x],
                    }),
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${layer.angle}deg`],
                    }),
                  },
                ],
              }}
            >
              <Image
                source={layer.image}
                cachePolicy="memory-disk"
                transition={0}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
                accessible={false}
              />
            </Animated.View>
            {layer.label && (
              <Animated.View
                testID={`ingredient-callout-${index}`}
                pointerEvents="none"
                style={[
                  styles.callout,
                  {
                    top: inset + foodHeight * layer.assembled + (layerHeight - labelHeight) / 2,
                    width: anchorX - 16 + 2.5,
                    height: labelHeight,
                    opacity: progress.interpolate({
                      inputRange: [0, 0.65, 1],
                      outputRange: [0, 0, 1],
                    }),
                    transform: [
                      {
                        translateY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, travel + anchorY],
                        }),
                      },
                      {
                        translateX: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, layer.x],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    width: Math.min(104, width * 0.28),
                    transform: [
                      {
                        translateX: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -layer.x],
                        }),
                      },
                    ],
                  }}
                >
                  <T style={styles.label}>{layer.label}</T>
                </Animated.View>
                <View style={styles.leader} />
                <View testID={`ingredient-anchor-${index}`} style={styles.anchor} />
              </Animated.View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function IngredientView({ meal }: { meal: Meal }) {
  const styles = useComponentStyles();
  const s = useStyles();

  const progress = useReveal(true, meal.id);
  const ingredients = mealIngredients(meal);
  const art = ingredientArtFor(meal);
  const sources = useMemo(
    () => (art ? ingredientImageSources(art) : [foodImageSource(meal.image_url)]),
    [art, meal.image_url],
  );
  return (
    <Animated.View style={{ opacity: progress, gap: 18 }}>
      <T style={[s.h2, { fontSize: 22, lineHeight: 30, letterSpacing: -0.6 }]}>{meal.name}</T>
      <IngredientImageLoader key={meal.id} sources={sources} svg={art?.key === 'tea'}>
        {art?.key === 'tea' ? (
          <TeaFluidView key={meal.id} />
        ) : art?.key === 'water' ? (
          <DrinkIngredientView key={meal.id} />
        ) : art ? (
          <IngredientStack key={`${meal.id}-${art.key}`} art={art} />
        ) : (
          <>
            <FoodImage
              uri={meal.image_url}
              style={{ height: 140, width: '100%', borderRadius: 16 }}
            />
            {ingredients.length ? (
              <View style={styles.list}>
                {ingredients.map((label, index) => (
                  <View key={index} style={styles.item}>
                    <View style={styles.dot} />
                    <T style={{ flex: 1 }}>{label}</T>
                  </View>
                ))}
              </View>
            ) : (
              <T muted>The canteen hasn’t listed ingredients for this meal yet.</T>
            )}
          </>
        )}
      </IngredientImageLoader>
    </Animated.View>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        stage: { backgroundColor: c.white, borderRadius: 20, overflow: 'hidden' },
        frame: { borderWidth: 1, borderColor: c.line, borderRadius: 20 },
        callout: {
          position: 'absolute',
          left: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          zIndex: 10,
        },
        label: { fontSize: 12, lineHeight: 17, fontFamily: fonts.semibold, color: c.ink },
        leader: { flex: 1, height: 1, backgroundColor: c.muted + '65' },
        anchor: {
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: c.teal,
          borderWidth: 1,
          borderColor: c.white,
        },
        list: {
          borderRadius: 14,
          backgroundColor: c.white,
          borderWidth: 1,
          borderColor: c.line,
          padding: 14,
          gap: 12,
        },
        item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green },
      }),
    [c],
  );
}
