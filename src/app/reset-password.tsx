import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useToast } from '@/contexts/app';
import { useColors } from '@/contexts/appearance';
import { supabase } from '@/services/supabase';
import { Button, Input, T, useStyles } from '@/components/ui';
import { PageHeading } from '@/components/page-heading';
import { errorMessage } from '@/utils/domain';
export default function ResetPassword() {
  const c = useColors();
  const s = useStyles();
  const { user, finishRecovery } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 28 }}>
      <View style={[s.card, { width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
        <PageHeading
          title="A fresh start."
          subtitle="Open the recovery link from your email, then choose a new password."
        />
        <Input label="New password" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} />
        {!!error && <T style={{ color: c.red, marginBottom: 20 }}>{error}</T>}
        <Button
          disabled={!user}
          loading={busy}
          onPress={() =>
            void (async () => {
              setError('');
              if (password.length < 8 || password !== confirm) {
                setError('Use at least 8 characters and matching passwords.');
                return;
              }
              setBusy(true);
              try {
                if (!supabase) throw new Error('Connect Supabase to reset online passwords.');
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                finishRecovery();
                toast('Password updated.');
                router.replace('/');
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            })()
          }
        >
          Update password
        </Button>
      </View>
    </View>
  );
}
