import React, { useEffect } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, Slot, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useCart, useSnapshot, useToast } from '@/contexts/app';
import { colors as c, fonts } from '@/constants/theme';
import { todayLabel } from '@/utils/domain';
import { Button, Empty, Icon, IconButton, Loading, T, s } from './ui';
const studentNav = [
  ['Home', 'home-outline', '/home'],
  ['Menu', 'silverware-fork-knife', '/menu'],
  ['Cart', 'shopping-outline', '/cart'],
  ['Orders', 'receipt-text-outline', '/orders'],
  ['Profile', 'account-outline', '/profile'],
];
const adminNav = [
  ['Dashboard', 'view-dashboard-outline', '/admin'],
  ['Orders', 'receipt-text-outline', '/admin/orders'],
  ['Menu management', 'silverware-fork-knife', '/admin/menu'],
  ['Inventory', 'package-variant-closed', '/admin/inventory'],
  ['Analytics', 'chart-box-outline', '/admin/analytics'],
  ['Students', 'account-group-outline', '/admin/students'],
  ['Settings', 'cog-outline', '/admin/settings'],
];
export function Brand() {
  return (
    <View style={[s.row, { gap: 10 }]}>
      <View
        style={{
          width: 39,
          height: 42,
          borderRadius: 13,
          backgroundColor: c.orange,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '-5deg' }],
        }}
      >
        <Icon name="silverware-fork-knife" size={25} color="white" />
      </View>
      <View>
        <T style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.9 }}>
          campus<T style={{ fontSize: 22, color: c.orange, fontFamily: fonts.display }}>bite</T>
        </T>
        <T muted style={{ fontSize: 8, letterSpacing: 1 }}>
          GOOD FOOD. ZERO QUEUES.
        </T>
      </View>
    </View>
  );
}
export function Shell({ admin = false }: { admin?: boolean }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const insets = useSafeAreaInsets();
  const { user, loading, logout, recovering } = useAuth();
  const path = usePathname();
  const { lines } = useCart();
  const { data } = useSnapshot();
  const toast = useToast();
  const nav = admin ? adminNav : studentNav;
  useEffect(() => {
    if (loading) return;
    if (recovering) router.replace('/reset-password');
    else if (!user) router.replace('/login');
    else if (admin && user.role !== 'ADMIN') router.replace('/home');
    else if (!admin && user.role === 'ADMIN') router.replace('/admin');
  }, [user, loading, admin, recovering]);
  if (loading || !user || (admin ? user.role !== 'ADMIN' : user.role !== 'CUSTOMER'))
    return <Loading />;
  if (user.is_suspended || data?.profiles.find((p) => p.id === user.id)?.is_suspended)
    return (
      <Empty
        icon="account-lock-outline"
        title="Account temporarily suspended"
        text="Contact the canteen administrator for help with your account."
      >
        <Button onPress={() => void logout()}>Sign out</Button>
      </Empty>
    );
  const go = (href: string) => router.push(href as any);
  const selected = (href: string) => (href === '/admin' ? path === href : path.startsWith(href));
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.cream,
        flexDirection: desktop ? 'row' : 'column',
        paddingTop: desktop ? 0 : insets.top,
      }}
    >
      {desktop && (
        <View
          style={{
            width: 224,
            backgroundColor: c.white,
            borderRightWidth: 1,
            borderColor: c.line,
            padding: 25,
            paddingTop: 35,
          }}
        >
          <Brand />
          <View style={{ marginTop: 49, gap: 9 }}>
            <T muted style={{ fontSize: 8, letterSpacing: 1, marginBottom: 8, marginLeft: 13 }}>
              {admin ? 'CANTEEN WORKSPACE' : 'YOUR DAILY GOODNESS'}
            </T>
            {nav.map(([label, icon, href]) => (
              <Pressable
                key={href}
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={() => go(href)}
                style={[
                  s.row,
                  {
                    gap: 14,
                    paddingHorizontal: 15,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: selected(href) ? c.peach : 'transparent',
                  },
                ]}
              >
                <Icon name={icon} size={21} color={selected(href) ? c.orange : c.muted} />
                <T
                  style={{
                    fontFamily: selected(href) ? fonts.bold : fonts.medium,
                    color: selected(href) ? c.orange : '#70736C',
                    fontSize: 12,
                  }}
                >
                  {label}
                </T>
                {href === '/cart' && lines.length > 0 && (
                  <T bold style={{ marginLeft: 'auto', color: c.orange, fontSize: 11 }}>
                    {lines.reduce((n, i) => n + i.quantity, 0)}
                  </T>
                )}
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          {!admin && (
            <View
              style={{
                backgroundColor: c.greenLight,
                padding: 18,
                borderRadius: 16,
                gap: 10,
                marginBottom: 24,
              }}
            >
              <Icon name="leaf" color={c.green} size={24} />
              <T bold style={{ color: c.green, fontSize: 13 }}>
                A little less waiting.
              </T>
              <T style={{ color: c.green, fontSize: 11, lineHeight: 18 }}>
                A little more time for you. Pre-order your next break.
              </T>
            </View>
          )}
          <Pressable
            onPress={() => void logout().catch((e) => toast(e.message))}
            style={[s.row, { padding: 12 }]}
          >
            <Icon name="logout" color={c.muted} size={19} />
            <T muted style={{ fontSize: 12 }}>
              Sign out
            </T>
          </Pressable>
          <T muted style={{ fontSize: 9, marginTop: 20 }}>
            MADE FOR YOUR CAMPUS ♡
          </T>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: desktop ? 85 : 68,
            paddingHorizontal: desktop ? 34 : 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: c.line,
            backgroundColor: c.white,
          }}
        >
          {desktop ? (
            <View style={s.row}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: c.peach,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={admin ? 'storefront-outline' : 'map-marker-outline'}
                  color={c.orange}
                  size={19}
                />
              </View>
              <View>
                <T muted style={{ fontSize: 9, marginBottom: 3 }}>
                  {admin ? 'MANAGEMENT PORTAL' : 'YOUR PICKUP SPOT'}
                </T>
                <T bold style={{ fontSize: 12 }}>
                  {data?.settings.name ?? 'Main Campus Canteen'}
                </T>
              </View>
            </View>
          ) : (
            <Brand />
          )}
          <View style={[s.row, { gap: desktop ? 22 : 10 }]}>
            {desktop && (
              <T muted style={{ fontSize: 11 }}>
                {todayLabel()}
              </T>
            )}
            <IconButton
              icon="bell-outline"
              label="View order updates"
              onPress={() => go(admin ? '/admin/orders' : '/orders')}
              style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View profile"
              onPress={() => go(admin ? '/admin/settings' : '/profile')}
              style={s.row}
            >
              <View
                style={{
                  backgroundColor: '#E9E7DB',
                  width: 36,
                  height: 36,
                  borderRadius: 13,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <T bold style={{ color: '#76765C', fontSize: 12 }}>
                  {user.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </T>
              </View>
              {desktop && (
                <View>
                  <T bold style={{ fontSize: 12 }}>
                    {user.full_name}
                  </T>
                  <T muted style={{ fontSize: 10, marginTop: 2 }}>
                    {admin ? 'Canteen administrator' : user.student_id}
                  </T>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        {admin && !desktop && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, backgroundColor: c.white }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}
          >
            {nav.map(([label, icon, href]) => (
              <Pressable
                key={href}
                onPress={() => go(href)}
                style={[
                  s.row,
                  {
                    borderRadius: 10,
                    backgroundColor: selected(href) ? c.peach : c.white,
                    padding: 10,
                    gap: 6,
                  },
                ]}
              >
                <Icon name={icon} size={16} color={selected(href) ? c.orange : c.muted} />
                <T style={{ fontSize: 11, color: selected(href) ? c.orange : c.ink }}>{label}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        {!admin && !desktop && (
          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 9),
              paddingTop: 10,
              flexDirection: 'row',
              borderTopWidth: 1,
              borderColor: c.line,
              backgroundColor: c.white,
            }}
          >
            {nav.map(([label, icon, href]) => (
              <Pressable
                key={href}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: selected(href) }}
                onPress={() => go(href)}
                style={{ flex: 1, alignItems: 'center', gap: 4 }}
              >
                <View>
                  <Icon name={icon} size={23} color={selected(href) ? c.orange : c.muted} />
                  {href === '/cart' && lines.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -7,
                        top: -4,
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        backgroundColor: c.orange,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T style={{ fontSize: 8, color: c.white }}>
                        {lines.reduce((n, i) => n + i.quantity, 0)}
                      </T>
                    </View>
                  )}
                </View>
                <T
                  style={{
                    fontSize: 9,
                    fontFamily: fonts.medium,
                    color: selected(href) ? c.orange : c.muted,
                  }}
                >
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
export function Page({ children, style }: React.PropsWithChildren<{ style?: any }>) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        {
          padding: width >= 1000 ? 32 : 20,
          paddingBottom: 45,
          maxWidth: 1600,
          width: '100%',
          alignSelf: 'center',
        },
        style,
      ]}
    >
      {children}
    </ScrollView>
  );
}
