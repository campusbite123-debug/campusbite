import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts } from '@/constants/theme';
import { Icon, T } from './ui';

export function AuthLoading({ action }: { action: 'login' | 'logout' | null }) {
  const insets = useSafeAreaInsets();
  if (!action) return null;
  const signingIn = action === 'login';
  const title = signingIn ? 'Signing you in…' : 'Signing you out…';
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => {}}>
      <View
        testID="auth-loading"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: true }}
        accessibilityViewIsModal
        aria-busy
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          },
        ]}
      >
        <View style={styles.brand}>
          <Icon name="silverware-fork-knife" size={36} color={c.white} />
        </View>
        <T style={styles.wordmark}>
          campus<T style={{ color: c.orange, fontFamily: fonts.display, fontSize: 27 }}>bite</T>
        </T>
        <ActivityIndicator
          size="large"
          color={c.orange}
          accessible={false}
          aria-hidden
          style={{ marginTop: 36, marginBottom: 24 }}
        />
        <T style={styles.title}>{title}</T>
        <T style={styles.description}>
          {signingIn ? 'Getting your workspace ready.' : 'See you at your next break.'}
        </T>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    width: 64,
    height: 68,
    borderRadius: 22,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  wordmark: { fontFamily: fonts.display, fontSize: 27, letterSpacing: -1, marginTop: 18 },
  title: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  description: { color: c.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10 },
});
