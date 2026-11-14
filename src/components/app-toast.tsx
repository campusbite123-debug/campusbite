import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts } from '@/constants/theme';
import { Icon, IconButton, T } from './ui';
import { useLayout } from '@/hooks/use-layout';

export type ToastOptions = {
  title?: string;
  tone?: 'success' | 'info' | 'error';
  icon?: string;
  action?: { label: string; onPress: () => void };
};
export type ToastNotice = ToastOptions & { id: number; message: string };

export function AppToast({
  notice,
  onDismiss,
}: {
  notice: ToastNotice | null;
  onDismiss: (id: number) => void;
}) {
  const { width, hasSidebar } = useLayout();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => onDismiss(notice.id), 4500);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;
  const error = notice.tone === 'error';
  const accent = error ? c.red : c.orangeDark;
  const icon =
    notice.icon ??
    (error ? 'alert-circle-outline' : notice.tone === 'success' ? 'check' : 'bell-outline');

  return (
    <Portal>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          testID="app-toast"
          style={[
            styles.card,
            {
              width: Math.min(width - 24, 410),
              right: width < 600 ? 12 : 24,
              top: insets.top + (hasSidebar ? 96 : 80),
              borderLeftColor: accent,
            },
          ]}
        >
          <View style={[styles.icon, error && { backgroundColor: '#FFF0EC' }]}>
            <Icon name={icon} color={accent} size={23} />
          </View>
          <View
            style={{ flex: 1, gap: 5 }}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <T bold style={styles.title}>
              {notice.title ?? 'Campusbite'}
            </T>
            <T style={styles.message}>{notice.message}</T>
            {notice.action && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={notice.action.label}
                onPress={() => {
                  onDismiss(notice.id);
                  notice.action?.onPress();
                }}
                style={({ pressed }) => [styles.action, { opacity: pressed ? 0.65 : 1 }]}
              >
                <T style={[styles.actionLabel, { color: accent }]}>{notice.action.label}</T>
                <Icon name="arrow-right" color={accent} size={16} />
              </Pressable>
            )}
          </View>
          <IconButton
            icon="close"
            label="Dismiss notification"
            color="#85877F"
            onPress={() => onDismiss(notice.id)}
            style={styles.close}
          />
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingRight: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#F1DFCF',
    backgroundColor: '#FFFDFA',
    boxShadow: '0px 8px 28px rgba(36, 43, 36, 0.14)',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: c.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, lineHeight: 20, color: c.ink },
  message: { fontSize: 12, lineHeight: 18, color: '#74766C' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 11,
    marginTop: 5,
    backgroundColor: c.peach,
    borderRadius: 9,
  },
  actionLabel: { fontFamily: fonts.bold, fontSize: 11 },
  close: { width: 30, height: 30, marginTop: -5, marginRight: -4 },
});
