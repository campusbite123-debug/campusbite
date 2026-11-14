import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthLayout } from '@/components/auth-layout';
import { Button, Icon, T } from '@/components/ui';
import { colors as c, fonts } from '@/constants/theme';
import { confirmSignupEmail } from '@/services/email-confirmation';
import { errorMessage } from '@/utils/domain';

type Confirmation = { status: 'checking' | 'success' | 'error'; message?: string };

export default function ConfirmEmail() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const token = typeof params.token_hash === 'string' ? params.token_hash : '';
  const type = typeof params.type === 'string' ? params.type : '';
  return <EmailConfirmation key={`${type}:${token}`} token={token} type={type} />;
}

function EmailConfirmation({ token, type }: { token: string; type: string }) {
  const valid = Boolean(token) && type === 'email';
  const [confirmation, setConfirmation] = useState<Confirmation>(() =>
    valid
      ? { status: 'checking' }
      : {
          status: 'error',
          message:
            'Open the confirmation link in your Campusbite signup email to confirm your account.',
        },
  );
  const request = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    if (!valid) return;
    // React can replay effects. Reuse the request so a one-time link is consumed once.
    request.current ??= confirmSignupEmail(token);
    void request.current
      .then(() => {
        if (active) setConfirmation({ status: 'success' });
      })
      .catch((error) => {
        if (active) setConfirmation({ status: 'error', message: errorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [token, valid]);

  const checking = confirmation.status === 'checking';
  const success = confirmation.status === 'success';
  return (
    <AuthLayout onBack={() => router.replace('/login')} backLabel="Back to sign in">
      <View style={styles.content} accessibilityLiveRegion="polite">
        <View style={[styles.badge, { backgroundColor: success ? '#EDF3E7' : '#FFF0E5' }]}>
          {checking ? (
            <ActivityIndicator
              size="large"
              color={c.orange}
              accessibilityLabel="Confirming email"
            />
          ) : (
            <Icon
              name={success ? 'check-circle-outline' : 'email-alert-outline'}
              size={42}
              color={success ? '#49613D' : c.orangeDark}
            />
          )}
        </View>
        <T accessibilityRole="header" style={styles.heading}>
          {checking
            ? 'Confirming your email…'
            : success
              ? 'Your account is confirmed.'
              : 'Check your confirmation link.'}
        </T>
        <T style={styles.description}>
          {checking
            ? 'Just a moment while we verify your email address.'
            : success
              ? 'You can now use your Campusbite account. Return to the app and sign in with your email and password.'
              : confirmation.message}
        </T>
        {!checking && (
          <Button
            icon="arrow-right"
            onPress={() => router.replace('/login')}
            style={{ alignSelf: 'stretch', marginTop: 30 }}
          >
            {success ? 'Continue to sign in' : 'Back to sign in'}
          </Button>
        )}
        {success && (
          <T style={styles.footnote}>You can close this page and return to the Campusbite app.</T>
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingVertical: 30 },
  badge: {
    width: 86,
    height: 86,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heading: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40, textAlign: 'center' },
  description: { color: c.muted, fontSize: 14, lineHeight: 23, textAlign: 'center', marginTop: 16 },
  footnote: { color: c.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 22 },
});
