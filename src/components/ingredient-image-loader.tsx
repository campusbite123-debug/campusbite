import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Image as SvgImage } from 'react-native-svg';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import { Button, Icon, T } from './ui';

export function IngredientImageLoader({
  sources,
  svg = false,
  children,
}: React.PropsWithChildren<{ sources: ImageSourcePropType[]; svg?: boolean }>) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ImageAttempt
      key={attempt}
      sources={sources}
      svg={svg}
      retry={() => setAttempt((value) => value + 1)}
    >
      {children}
    </ImageAttempt>
  );
}

function ImageAttempt({
  sources,
  svg,
  retry,
  children,
}: React.PropsWithChildren<{ sources: ImageSourcePropType[]; svg: boolean; retry: () => void }>) {
  const c = useColors();
  const { contentWidth, height, fontScale } = useLayout();
  const [width, setWidth] = useState(Math.min(550, contentWidth));
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    sources.length ? 'loading' : 'ready',
  );
  const loaded = useRef(new Set<number>());
  const stageHeight = Math.round(
    Math.min(width * 1.4, height * 0.6) * Math.max(1, fontScale / 1.2),
  );
  function imageLoaded(index: number) {
    loaded.current.add(index);
    if (loaded.current.size === sources.length * (svg ? 2 : 1)) setStatus('ready');
  }
  if (status === 'ready') return <>{children}</>;
  return (
    <View
      testID={status === 'error' ? 'ingredient-image-error' : 'ingredient-loading'}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height: stageHeight,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.white,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
        overflow: 'hidden',
      }}
    >
      {status === 'error' ? (
        <>
          <Icon name="image-off-outline" size={32} color={c.muted} />
          <T accessibilityRole="alert" style={{ textAlign: 'center' }}>
            The ingredient images couldn’t load.
          </T>
          <Button secondary icon="refresh" onPress={retry}>
            Try again
          </Button>
        </>
      ) : (
        <>
          <ActivityIndicator
            color={c.orange}
            size="large"
            accessibilityLabel="Loading ingredient images"
          />
          <T accessibilityLiveRegion="polite" muted>
            Loading ingredients…
          </T>
          {/* Decode the complete set first. Mounting the scene only afterwards
              starts its one-time animation with every required image cached. */}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={styles.preload}
          >
            {sources.map((source, index) => (
              <Image
                key={index}
                source={source}
                style={styles.preload}
                contentFit="contain"
                allowDownscaling={false}
                priority="high"
                cachePolicy="memory-disk"
                transition={0}
                accessible={false}
                onLoad={() => imageLoaded(index)}
                onError={() => setStatus('error')}
              />
            ))}
            {svg && (
              <Svg width={1} height={1}>
                {sources.map((source, index) => (
                  <SvgImage
                    key={index}
                    href={source}
                    width={1}
                    height={1}
                    onLoad={() => imageLoaded(index + sources.length)}
                  />
                ))}
              </Svg>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preload: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
