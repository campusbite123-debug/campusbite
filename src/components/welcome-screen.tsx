import { MotionPressable as Pressable } from '@/components/motion';
import React, { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import { T } from './ui';
import { BrandMark } from './brand-mark';
import { openWithSignInTransition, signInLayoutReady } from '@/utils/sign-in-transition';

export function WelcomeScreen() {
  const c = useColors();
  const styles = useComponentStyles();

  const { width, height, isPhone } = useLayout();
  const focused = useIsFocused();
  useLayoutEffect(() => {
    if (focused) signInLayoutReady();
  }, [focused]);
  const insets = useSafeAreaInsets();
  const compact = width < 380;
  return (
    <View testID="welcome-screen" style={styles.screen}>
      {focused && <StatusBar style="light" />}
      <View nativeID="welcome-photo" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          testID="welcome-food-image"
          source={require('../../assets/auth/food-background.jpg')}
          contentFit="cover"
          contentPosition={{ left: isPhone ? '28%' : '50%', top: '50%' }}
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
          aria-hidden
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="welcome-photo-shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.ink} stopOpacity="0.32" />
              <Stop offset="0.35" stopColor={c.ink} stopOpacity="0.4" />
              <Stop offset="0.7" stopColor={c.ink} stopOpacity="0.62" />
              <Stop offset="1" stopColor={c.ink} stopOpacity="0.88" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#welcome-photo-shade)" />
        </Svg>
      </View>
      <ScrollView
        nativeID="welcome-foreground"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + (isPhone ? 28 : 48),
          paddingBottom: insets.bottom + (isPhone ? Math.min(height * 0.13, 100) : 72),
          paddingLeft: insets.left + (compact ? 24 : isPhone ? 32 : 64),
          paddingRight: insets.right + (compact ? 24 : isPhone ? 32 : 64),
        }}
      >
        <View style={styles.content}>
          <View
            accessible
            accessibilityLabel="Campusbite"
            accessibilityRole="image"
            style={styles.brand}
          >
            <View style={styles.brandIcon}>
              <BrandMark size={48} />
            </View>
            <T style={styles.wordmark}>
              campus<T style={styles.wordmark}>bite</T>
            </T>
          </View>
          <View
            style={{ flexGrow: 1, justifyContent: 'center', minHeight: 260, paddingVertical: 48 }}
          >
            <T style={styles.eyebrow}>YOUR NEXT GOOD MEAL AWAITS</T>
            <T
              accessibilityRole="header"
              style={[
                styles.headline,
                {
                  fontSize: compact ? 35 : isPhone ? 40 : 68,
                  lineHeight: compact ? 46 : isPhone ? 51 : 81,
                },
              ]}
            >
              Good food.{'\n'}Better campus{'\n'}days.
            </T>
            <T style={styles.description}>Your campus favorites, without the wait.</T>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={() => openWithSignInTransition(() => router.push('/login'))}
              style={({ pressed }) => [
                styles.signIn,
                { backgroundColor: pressed ? c.white + '5C' : c.white + '33' },
              ]}
            >
              <T style={styles.signInText}>Sign in</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              onPress={() => openWithSignInTransition(() => router.push('/register'), 'register')}
              style={({ pressed }) => [styles.register, { opacity: pressed ? 0.65 : 1 }]}
            >
              <T style={styles.registerText}>Create an account</T>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: c.ink },
        content: { flexGrow: 1, width: '100%', maxWidth: 1120, alignSelf: 'center' },
        brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        brandIcon: {
          width: 39,
          height: 42,
          borderRadius: 14,
          backgroundColor: c.orange,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-5deg' }],
        },
        wordmark: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.8, color: c.white },
        eyebrow: {
          fontFamily: fonts.semibold,
          fontSize: 9,
          letterSpacing: 1.7,
          color: c.peach,
          marginBottom: 20,
        },
        headline: { fontFamily: fonts.display, letterSpacing: -1.3, color: c.white },
        description: { maxWidth: 310, color: c.white, fontSize: 14, lineHeight: 23, marginTop: 22 },
        actions: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 8 },
        signIn: {
          minHeight: 54,
          paddingVertical: 15,
          paddingHorizontal: 24,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: c.white + '59',
          alignItems: 'center',
          justifyContent: 'center',
        },
        signInText: { fontFamily: fonts.semibold, fontSize: 14, color: c.white },
        register: {
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
        },
        registerText: { fontFamily: fonts.medium, fontSize: 12, color: c.white },
      }),
    [c],
  );
}
