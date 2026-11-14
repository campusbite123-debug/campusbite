import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { router, Slot, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useCart, useSnapshot, useToast } from '@/contexts/app';
import { useLayout } from '@/hooks/use-layout';
import { colors as c, fonts } from '@/constants/theme';
import { todayLabel } from '@/utils/domain';
import { Button, Empty, Icon, IconButton, Loading, Sheet, T, s } from './ui';
import { MobileNavigation } from './mobile-navigation';
import { BrandMark } from './brand-mark';

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

export function Brand({ compact = false, small = false }: { compact?: boolean; small?: boolean }) {
  const { width, fontScale } = useLayout();
  const iconOnly = compact || (width < 600 && fontScale > 1.3);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Campusbite"
      style={[s.row, { gap: 9 }]}
    >
      <View
        style={{
          width: small ? 34 : 39,
          height: small ? 37 : 42,
          borderRadius: 13,
          backgroundColor: c.orange,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '-5deg' }],
        }}
      >
        <BrandMark size={small ? 42 : 48} />
      </View>
      {!iconOnly && (
        <View>
          <T style={{ fontFamily: fonts.display, fontSize: small ? 20 : 22, letterSpacing: -0.9 }}>
            campus
            <T style={{ fontSize: small ? 20 : 22, color: c.orange, fontFamily: fonts.display }}>
              bite
            </T>
          </T>
          <T muted style={{ fontSize: small ? 7 : 8, letterSpacing: 0.9 }}>
            GOOD FOOD. ZERO QUEUES.
          </T>
        </View>
      )}
    </View>
  );
}

export function Shell({ admin = false }: { admin?: boolean }) {
  const { width, hasSidebar, fullSidebar, sidebarWidth, pagePadding } = useLayout();
  const insets = useSafeAreaInsets();
  const { user, loading, logout, recovering } = useAuth();
  const path = usePathname();
  const { lines } = useCart();
  const { data } = useSnapshot();
  const toast = useToast();
  const [moreOpen, setMoreOpen] = useState(false);
  const nav = admin ? adminNav : studentNav;
  const mobileNav = admin
    ? [adminNav[0], adminNav[3], adminNav[1], adminNav[4], ['More', 'dots-horizontal', 'more']]
    : [studentNav[0], studentNav[3], studentNav[1], studentNav[2], studentNav[4]];
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

  const go = (href: string) => {
    setMoreOpen(false);
    router.push(href as any);
  };
  const selected = (href: string) => (href === '/admin' ? path === href : path.startsWith(href));
  const signOut = () => void logout().catch((error) => toast(error.message));
  const itemCount = lines.reduce((total, item) => total + item.quantity, 0);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: c.cream,
        flexDirection: hasSidebar ? 'row' : 'column',
        paddingTop: insets.top,
      }}
    >
      {hasSidebar && (
        <View
          testID="navigation-sidebar"
          style={{
            width: sidebarWidth,
            backgroundColor: c.white,
            borderRightWidth: 1,
            borderColor: c.line,
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              padding: fullSidebar ? 25 : 10,
              paddingTop: fullSidebar ? 35 : 23,
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <View style={{ alignItems: fullSidebar ? 'flex-start' : 'center' }}>
              <Brand compact={!fullSidebar} />
            </View>
            <View style={{ marginTop: fullSidebar ? 49 : 28, gap: 7 }}>
              {fullSidebar && (
                <T muted style={{ fontSize: 8, letterSpacing: 1, marginBottom: 8, marginLeft: 13 }}>
                  {admin ? 'CANTEEN WORKSPACE' : 'YOUR DAILY GOODNESS'}
                </T>
              )}
              {nav.map(([label, icon, href]) => (
                <Pressable
                  key={href}
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: selected(href) }}
                  onPress={() => go(href)}
                  style={{
                    flexDirection: fullSidebar ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: fullSidebar ? 'flex-start' : 'center',
                    gap: fullSidebar ? 13 : 6,
                    minHeight: fullSidebar ? 49 : 62,
                    paddingHorizontal: fullSidebar ? 14 : 3,
                    paddingVertical: 10,
                    borderRadius: 13,
                    backgroundColor: selected(href) ? c.peach : 'transparent',
                  }}
                >
                  <Icon
                    name={icon}
                    size={fullSidebar ? 21 : 24}
                    color={selected(href) ? c.orange : c.muted}
                  />
                  <T
                    style={{
                      fontFamily: selected(href) ? fonts.bold : fonts.medium,
                      color: selected(href) ? c.orangeDark : '#70736C',
                      fontSize: fullSidebar ? 12 : 10,
                      textAlign: fullSidebar ? 'left' : 'center',
                      flexShrink: 1,
                    }}
                  >
                    {fullSidebar ? label : label === 'Menu management' ? 'Menu' : label}
                  </T>
                  {fullSidebar && href === '/cart' && itemCount > 0 && (
                    <T bold style={{ marginLeft: 'auto', color: c.orange, fontSize: 11 }}>
                      {itemCount}
                    </T>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1, minHeight: 24 }} />
            {fullSidebar && !admin && (
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
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={signOut}
              style={{
                flexDirection: fullSidebar ? 'row' : 'column',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: fullSidebar ? 12 : 0,
                alignItems: 'center',
                minHeight: 48,
              }}
            >
              <Icon name="logout" color={c.muted} size={21} />
              <T muted style={{ fontSize: fullSidebar ? 12 : 10 }}>
                Sign out
              </T>
            </Pressable>
            {fullSidebar && (
              <T muted style={{ fontSize: 9, marginTop: 20 }}>
                MADE FOR YOUR CAMPUS ♡
              </T>
            )}
          </ScrollView>
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        <View
          style={{
            height: hasSidebar ? 80 : 68,
            paddingHorizontal: pagePadding,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottomWidth: 1,
            borderColor: c.line,
            backgroundColor: c.white,
          }}
        >
          {hasSidebar ? (
            <View style={[s.row, { flex: 1, minWidth: 0 }]}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: c.peach,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={admin ? 'storefront-outline' : 'map-marker-outline'}
                  color={c.orange}
                  size={20}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T muted style={{ fontSize: 9 }}>
                  {admin ? 'MANAGEMENT PORTAL' : 'YOUR PICKUP SPOT'}
                </T>
                <T bold numberOfLines={1} style={{ fontSize: 13 }}>
                  {data?.settings.name ?? 'Campus Canteen'}
                </T>
              </View>
            </View>
          ) : (
            <Brand small={width < 380} />
          )}
          <View style={[s.row, { gap: fullSidebar ? 20 : 8 }]}>
            {fullSidebar && (
              <T muted style={{ fontSize: 11 }}>
                {todayLabel()}
              </T>
            )}
            <IconButton
              icon="bell-outline"
              label="View order updates"
              onPress={() => go(admin ? '/admin/orders' : '/orders')}
              style={{ borderWidth: 1, borderColor: c.line, borderRadius: 13 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View profile"
              onPress={() => go(admin ? '/admin/settings' : '/profile')}
              style={[s.row, { minHeight: 44, minWidth: 44, justifyContent: 'center' }]}
            >
              <View
                style={{
                  backgroundColor: '#E9E7DB',
                  width: 40,
                  height: 40,
                  borderRadius: 14,
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
              {fullSidebar && (
                <View style={{ gap: 3 }}>
                  <T bold style={{ fontSize: 12 }}>
                    {user.full_name}
                  </T>
                  <T muted style={{ fontSize: 10 }}>
                    {admin ? 'Canteen administrator' : 'Student account'}
                  </T>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Slot />
        </View>

        {!hasSidebar && (
          <MobileNavigation
            items={mobileNav.map(([label, icon, href]) => ({
              href,
              icon,
              label: admin && href === '/admin' ? 'Home' : label,
              accessibilityLabel: label,
              selected:
                href === 'more'
                  ? !mobileNav
                      .filter((item) => item[2] !== 'more')
                      .some((item) => selected(item[2]))
                  : selected(href),
              badge: href === '/cart' ? itemCount : undefined,
            }))}
            onNavigate={(href) => (href === 'more' ? setMoreOpen(true) : go(href))}
          />
        )}
      </View>

      <Sheet
        visible={moreOpen && !hasSidebar}
        title="Canteen workspace"
        onClose={() => setMoreOpen(false)}
      >
        <View style={{ gap: 8 }}>
          {adminNav.map(([label, icon, href]) => (
            <Pressable
              key={href}
              accessibilityRole="link"
              accessibilityLabel={label}
              onPress={() => go(href)}
              style={[
                s.row,
                {
                  minHeight: 52,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: selected(href) ? c.peach : c.cream,
                },
              ]}
            >
              <Icon name={icon} color={selected(href) ? c.orangeDark : c.muted} />
              <T bold style={{ flex: 1 }}>
                {label}
              </T>
              <Icon name="chevron-right" size={18} color={c.muted} />
            </Pressable>
          ))}
          <Button secondary icon="logout" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </Sheet>
    </View>
  );
}

export function Page({
  children,
  style,
  footer,
}: React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
}>) {
  const { pagePadding, hasSidebar } = useLayout();
  return (
    <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
      <ScrollView
        testID="page-scroll"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={hasSidebar}
        contentContainerStyle={[
          {
            padding: pagePadding,
            paddingBottom: 32,
            maxWidth: 1600,
            width: '100%',
            alignSelf: 'center',
          },
          style,
        ]}
      >
        {children}
      </ScrollView>
      {footer && (
        <View
          style={{
            paddingHorizontal: pagePadding,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderColor: c.line,
            backgroundColor: c.white,
          }}
        >
          {footer}
        </View>
      )}
    </View>
  );
}
