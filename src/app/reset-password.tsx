import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useToast } from '@/contexts/app';
import { supabase } from '@/services/supabase';
import { Button, Input, T, s } from '@/components/ui';
import { errorMessage } from '@/utils/domain';
export default function ResetPassword() {
  const { user, finishRecovery } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 28 }}>
      <View style={[s.card, { width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
        <T style={[s.h1, { marginBottom: 25 }]}>A fresh start.</T>
        <T muted style={{ marginBottom: 20 }}>
          Open the recovery link from your email, then choose a new password.
        </T>
        <Input label="New password" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} />
        {!!error && <T style={{ color: '#C4493B', marginBottom: 20 }}>{error}</T>}
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
