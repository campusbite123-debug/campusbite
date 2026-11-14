import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { Icon, T } from './ui';

export type MobileNavItem = {
  href: string;
  label: string;
  accessibilityLabel: string;
  icon: string;
  selected: boolean;
  badge?: number;
};

const filledIcons: Record<string, string> = {
  'home-outline': 'home',
  'shopping-outline': 'shopping',
  'account-outline': 'account',
  'receipt-text-outline': 'receipt-text',
  'view-dashboard-outline': 'view-dashboard',
  'chart-box-outline': 'chart-box',
};

function NavigationTab({
  item,
  onNavigate,
  reducedMotion,
}: {
  item: MobileNavItem;
  onNavigate: (href: string) => void;
  reducedMotion: boolean;
}) {
  const [lift] = useState(() => new Animated.Value(item.selected ? -4 : 12));
  useEffect(() => {
    const animation = Animated.timing(lift, {
      toValue: item.selected ? -4 : 12,
      duration: reducedMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [item.selected, lift, reducedMotion]);

  return (
    <Pressable
      testID={item.selected ? 'navigation-active-tab' : undefined}
      accessibilityRole="tab"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityState={{ selected: item.selected }}
      aria-selected={item.selected}
      onPress={() => onNavigate(item.href)}
      style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Animated.View
        testID={item.selected ? 'navigation-active-circle' : undefined}
        pointerEvents="none"
        style={[
          styles.face,
          item.selected && styles.activeFace,
          { transform: [{ translateY: lift }] },
        ]}
      >
        <View style={[styles.innerFace, item.selected && styles.activeInnerFace]}>
          <View style={styles.icon}>
            <Icon
              name={item.selected ? (filledIcons[item.icon] ?? item.icon) : item.icon}
              size={item.selected ? 25 : 22}
              color={item.selected ? c.white : '#74786E'}
            />
            {!!item.badge && (
              <View style={[styles.badge, item.selected && styles.activeBadge]}>
                <T
                  testID="navigation-cart-count"
                  maxFontSizeMultiplier={1.2}
                  style={[styles.badgeText, item.selected && { color: c.orangeDark }]}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </T>
              </View>
            )}
          </View>
          <T
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[
              styles.label,
              {
                color: item.selected ? c.white : '#74786E',
                fontFamily: item.selected ? fonts.semibold : fonts.medium,
              },
              item.selected && { fontSize: 9, lineHeight: 13 },
            ]}
          >
            {item.label}
          </T>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function MobileNavigation({
  items,
  onNavigate,
}: {
  items: MobileNavItem[];
  onNavigate: (href: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useLayout();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let disposed = false;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      changed = true;
      setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (!disposed && !changed) setReducedMotion(enabled);
      },
      () => {},
    );
    return () => {
      disposed = true;
      subscription?.remove();
    };
  }, []);
  return (
    <View
      testID="navigation-dock"
      style={[
        styles.dock,
        {
          paddingHorizontal: width < 380 ? 12 : 20,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        testID="bottom-navigation"
        role="tablist"
        accessibilityLabel="Main navigation"
        style={styles.bar}
      >
        {items.map((item) => (
          <NavigationTab
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingTop: 22, backgroundColor: c.cream },
  bar: {
    width: '100%',
    maxWidth: 520,
    height: 64,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#F1E5DA',
    backgroundColor: c.white,
    boxShadow: '0px 6px 22px rgba(36, 43, 36, 0.10)',
  },
  tab: {
    flex: 1,
    minWidth: 44,
    height: 84,
    marginTop: -20,
    alignSelf: 'flex-start',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  face: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFace: {
    backgroundColor: c.orange,
    borderColor: c.cream,
    boxShadow: '0px 4px 12px rgba(245, 107, 40, 0.22)',
    zIndex: 1,
  },
  innerFace: {
    width: 59,
    height: 59,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInnerFace: { borderColor: '#FFFFFFB3' },
  badge: {
    position: 'absolute',
    right: -11,
    top: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: c.white,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: { backgroundColor: c.white, borderColor: c.orange },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, color: c.white },
});
