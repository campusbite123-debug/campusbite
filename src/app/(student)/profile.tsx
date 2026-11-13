import React, { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useAuth, useToast } from '@/contexts/app';
import { updateProfile } from '@/services/repository';
import { enableNotifications } from '@/services/media';
import { DataPage, useAction } from '@/components/admin';
import { Button, Icon, Input, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const [name, setName] = useState(user?.full_name ?? '');
  return (
    <DataPage>
      {(data) => (
        <>
          <T style={s.h1}>A little about you.</T>
          <T muted style={{ marginTop: 10, marginBottom: 28 }}>
            Your campus identity and the details that make pickup easy.
          </T>
          <View style={[s.card, { maxWidth: 600 }]}>
            <View style={[s.row, { marginBottom: 25 }]}>
              <View
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 23,
                  backgroundColor: c.peach,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="account-outline" size={34} color={c.orange} />
              </View>
              <View>
                <T style={s.h2}>
                  {data.profiles.find((p) => p.id === user?.id)?.full_name ?? user?.full_name}
                </T>
                <T muted style={{ fontSize: 12, marginTop: 6 }}>
                  {user?.student_id} · Student account
                </T>
              </View>
            </View>
            <Input label="Full name" value={name} onChangeText={setName} />
            <Input label="Student ID" value={user?.student_id} editable={false} />
            <Input label="Email address" value={user?.email} editable={false} />
            <Button
              loading={busy}
              onPress={() =>
                void run(async () => {
                  await updateProfile(name, user!);
                  await refreshUser();
                }, 'Your profile is updated.')
              }
            >
              Save profile
            </Button>
            <View style={s.divider} />
            <Button
              secondary
              icon="bell-outline"
              onPress={() => void run(enableNotifications, 'Device pickup notifications enabled.')}
            >
              Enable pickup notifications
            </Button>
            <T muted style={{ fontSize: 11, lineHeight: 19, marginVertical: 15 }}>
              Live status updates appear while you use the app. Device notifications can alert you
              when an active session receives a Ready for Pickup update.
            </T>
            <Button
              secondary
              icon="image-outline"
              style={{ marginBottom: 15 }}
              onPress={() => router.push('/credits')}
            >
              Photography credits
            </Button>
            <Button
              secondary
              icon="logout"
              onPress={() => void logout().catch((e) => toast(e.message))}
            >
              Sign out
            </Button>
          </View>
        </>
      )}
    </DataPage>
  );
}
