import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Providers } from '@/contexts/app';
import { theme } from '@/constants/theme';
import { Loading } from '@/components/ui';
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Manrope_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        {!loaded && !error ? (
          <Loading />
        ) : (
          <Providers>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: '#FAF9F6' },
              }}
            />
          </Providers>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
