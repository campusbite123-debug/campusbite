import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
// Import individual weights so unused font files stay out of the app bundle.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { Providers } from '@/contexts/app';
import { createTheme } from '@/constants/theme';
import { AppearanceProvider, useColors } from '@/contexts/appearance';
import { Loading } from '@/components/ui';
import { AppUpdatePrompt } from '@/components/app-update-prompt';
import { MotionProvider, useMotionReduced } from '@/components/motion';
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MotionProvider>
        <AppearanceProvider>
          <AppContent />
        </AppearanceProvider>
      </MotionProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const colors = useColors();
  const reducedMotion = useMotionReduced();
  const paperTheme = useMemo(() => {
    const theme = createTheme(colors);
    return {
      ...theme,
      animation: { ...theme.animation, scale: reducedMotion ? 0 : theme.animation.scale },
    };
  }, [colors, reducedMotion]);
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_700Bold,
    InstrumentSerifItalic: require('../../assets/fonts/InstrumentSerif-Italic.ttf'),
  });
  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style="dark" />
      {!loaded && !error ? (
        <Loading />
      ) : (
        <>
          <Providers>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: reducedMotion ? 'none' : 'fade',
                contentStyle: { backgroundColor: colors.white },
              }}
            />
          </Providers>
          <AppUpdatePrompt />
        </>
      )}
    </PaperProvider>
  );
}
