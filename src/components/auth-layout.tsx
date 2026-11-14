import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { Brand } from './shell';
import { IconButton, T } from './ui';

const foodBackground = require('../../assets/auth/food-background.jpg');
export const authPaper = '#FFFDFA';

export function AuthLayout({
  children,
  onBack,
  backLabel,
}: React.PropsWithChildren<{ onBack: () => void; backLabel: string }>) {
  const { width, isPhone } = useLayout();
  const insets = useSafeAreaInsets();
  const wide = width >= 1000;
  const photoTopInset = isPhone ? insets.top : 0;
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!isPhone && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
          <Image
            source={foodBackground}
            contentFit="cover"
            blurRadius={12}
            style={[StyleSheet.absoluteFill, { opacity: 0.18 }]}
            accessible={false}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F5EDE29E' }]} />
        </View>
      )}
      <ScrollView
        testID="auth-scroll"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isPhone ? 'flex-start' : 'center',
          alignItems: 'center',
          paddingTop: isPhone ? 0 : insets.top + 40,
          paddingBottom: isPhone ? 0 : insets.bottom + 40,
          paddingHorizontal: isPhone ? 0 : width < 1000 ? 36 : 48,
        }}
      >
        <View
          testID="auth-panel"
          style={[
            styles.panel,
            {
              flexDirection: wide ? 'row' : 'column',
              flexGrow: isPhone ? 1 : 0,
              maxWidth: isPhone ? undefined : wide ? 1080 : 500,
              borderRadius: isPhone ? 0 : 36,
            },
          ]}
        >
          <View
            testID="auth-food-hero"
            style={{
              width: wide ? '48%' : '100%',
              height: wide ? undefined : (width < 380 ? 190 : 220) + photoTopInset,
              minHeight: wide ? 690 : undefined,
              overflow: 'hidden',
              backgroundColor: '#414331',
            }}
          >
            <Image
              testID="auth-food-image"
              source={foodBackground}
              contentFit="cover"
              contentPosition={{ left: wide ? '42%' : '50%', top: wide ? '50%' : '40%' }}
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
            >
              <Defs>
                <LinearGradient id="auth-food-shade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#172015" stopOpacity="0.12" />
                  <Stop offset="0.4" stopColor="#172015" stopOpacity={wide ? 0.2 : 0.08} />
                  <Stop offset="1" stopColor="#172015" stopOpacity={wide ? 0.9 : 0.2} />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#auth-food-shade)" />
            </Svg>
            <View
              style={{
                padding: wide ? 36 : 22,
                paddingTop: (wide ? 36 : 22) + photoTopInset,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <IconButton
                icon="arrow-left"
                label={backLabel}
                onPress={onBack}
                style={styles.backButton}
              />
              <View style={styles.brandBadge}>
                <Brand small />
              </View>
            </View>
            {wide && (
              <View style={styles.story}>
                <View style={styles.storyRule} />
                <T style={styles.storyTitle}>
                  Good food.{'\n'}Better campus{'\n'}days.
                </T>
                <T style={styles.storyBody}>
                  Your campus favorites, without the wait. Pre-order a meal and make the most of
                  every break.
                </T>
                <T style={styles.storyFootnote}>Freshly prepared. Fairly priced. Made for you.</T>
              </View>
            )}
            <Svg
              testID="auth-panel-curve"
              width={wide ? 44 : '100%'}
              height={wide ? '100%' : 48}
              viewBox={wide ? '0 0 44 800' : '0 0 400 48'}
              preserveAspectRatio="none"
              style={wide ? styles.sideCurve : styles.bottomCurve}
              aria-hidden
            >
              <Path
                fill={authPaper}
                d={
                  wide
                    ? 'M44 0 C0 160 0 310 23 440 C42 560 0 710 0 800 L44 800 Z'
                    : 'M0 44 C120 44 230 0 400 8 L400 48 L0 48 Z'
                }
              />
            </Svg>
          </View>
          <View
            style={{
              width: wide ? '52%' : '100%',
              justifyContent: 'center',
              paddingHorizontal: isPhone ? 24 : wide ? 48 : 36,
              paddingTop: wide ? 48 : 8,
              paddingBottom: isPhone ? 28 + insets.bottom : 36,
            }}
          >
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3EDE3' },
  panel: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: authPaper,
    boxShadow: '0px 22px 75px rgba(58, 43, 25, 0.16)',
  },
  brandBadge: { padding: 12, borderRadius: 18, backgroundColor: '#FFFDFAF2' },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: authPaper,
    boxShadow: '0px 2px 10px rgba(36, 43, 36, 0.12)',
  },
  story: { position: 'absolute', left: 36, right: 48, bottom: 44 },
  storyRule: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFB67F',
    marginBottom: 22,
  },
  storyTitle: {
    fontFamily: fonts.display,
    fontSize: 49,
    lineHeight: 58,
    letterSpacing: -1.9,
    color: c.white,
  },
  storyBody: { color: '#FFF5E9', fontSize: 14, lineHeight: 23, marginTop: 20, maxWidth: 330 },
  storyFootnote: { color: '#E8D5BF', fontSize: 10, lineHeight: 17, marginTop: 30 },
  sideCurve: { position: 'absolute', top: 0, bottom: 0, right: -1 },
  bottomCurve: { position: 'absolute', bottom: -1, left: 0, right: 0 },
});
