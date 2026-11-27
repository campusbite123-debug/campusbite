import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import type { SessionUser } from '@/types';
import { formatDate } from '@/utils/domain';
import type { OrderNotification } from '@/utils/order-notifications';
import { MotionPressable as Pressable } from './motion';
import { Button, Empty, Icon, Sheet, T, useStyles } from './ui';

export function NotificationCenter({ user }: { user: SessionUser }) {
  const c = useColors();
  const styles = useComponentStyles();
  const s = useStyles();

  const [open, setOpen] = useState(false);
  const inbox = useNotificationInbox(user);
  const ordersPath = user.role === 'ADMIN' ? '/admin/orders' : '/orders';
  const unreadLabel = inbox.unreadCount
    ? `${inbox.unreadCount} unread ${inbox.unreadCount === 1 ? 'update' : 'updates'}`
    : 'No unread updates';
  function viewOrder(notification?: OrderNotification) {
    if (notification) inbox.markRead([notification.id]);
    setOpen(false);
    if (notification)
      router.push({ pathname: ordersPath, params: { id: notification.orderId, placed: '' } });
    else router.push(ordersPath);
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View notifications"
        accessibilityHint={inbox.loading ? 'Checking for order updates' : unreadLabel}
        onPress={() => setOpen(true)}
        style={styles.bell}
      >
        <Icon name="bell-outline" size={20} color={c.ink} />
        {inbox.unreadCount > 0 && (
          <View
            testID="notification-unread-badge"
            accessibilityLabel={unreadLabel}
            pointerEvents="none"
            style={styles.badge}
          >
            <T bold maxFontSizeMultiplier={1.5} style={styles.badgeText}>
              {inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}
            </T>
          </View>
        )}
      </Pressable>
      <Sheet
        visible={open}
        title="Notifications"
        onClose={() => setOpen(false)}
        footer={
          <Button secondary icon="arrow-right" onPress={() => viewOrder()}>
            View all orders
          </Button>
        }
      >
        {inbox.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.teal} />
            <T muted>Loading your notifications…</T>
          </View>
        ) : inbox.error && !inbox.hasData ? (
          <Empty
            icon="wifi-alert"
            title="Notifications unavailable"
            text="We couldn’t load your order updates. Please try again."
          >
            <Button secondary onPress={inbox.refresh}>
              Try again
            </Button>
          </Empty>
        ) : (
          <>
            <View style={styles.toolbar}>
              <T muted style={{ fontSize: 12 }}>
                {unreadLabel}
              </T>
              {inbox.unreadCount > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark all read"
                  onPress={inbox.markAllRead}
                  style={[s.row, { minHeight: 44, gap: 6 }]}
                >
                  <Icon name="check-all" color={c.teal} size={19} />
                  <T bold style={{ fontSize: 12, color: c.teal }}>
                    Mark all read
                  </T>
                </Pressable>
              )}
            </View>
            {inbox.error && (
              <T muted style={styles.refreshError}>
                New updates couldn’t be checked. Your saved updates are shown below.
              </T>
            )}
            {inbox.notifications.length ? (
              <View style={{ gap: 10 }}>
                {inbox.notifications.map((notification) => {
                  const unread = !inbox.isRead(notification.id);
                  return (
                    <Pressable
                      key={notification.id}
                      accessibilityRole="button"
                      accessibilityLabel={`View notification: ${notification.title}, ${notification.orderNumber}`}
                      accessibilityHint={
                        unread ? 'Unread update. Opens this order.' : 'Opens this order.'
                      }
                      onPress={() => viewOrder(notification)}
                      style={[styles.item, unread && styles.unreadItem]}
                    >
                      <View style={styles.itemIcon}>
                        <Icon name={notification.icon} color={c.teal} size={21} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <T bold style={styles.itemTitle}>
                          {notification.title}
                        </T>
                        <T style={styles.message}>{notification.message}</T>
                        <T muted style={styles.timestamp}>
                          {formatDate(notification.createdAt, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </T>
                      </View>
                      <View style={{ alignItems: 'center', gap: 12 }}>
                        {unread && (
                          <View
                            testID={`notification-unread-${notification.id}`}
                            style={styles.unreadDot}
                          />
                        )}
                        <Icon name="chevron-right" color={c.muted} size={17} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Empty
                icon="bell-check-outline"
                title="You’re all caught up"
                text={
                  user.role === 'ADMIN'
                    ? 'New pre-orders and cancellations will appear here.'
                    : 'Your order confirmations, kitchen updates and pickup alerts will appear here.'
                }
              />
            )}
          </>
        )}
      </Sheet>
    </>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        bell: {
          width: 44,
          height: 44,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 13,
          backgroundColor: c.white,
          alignItems: 'center',
          justifyContent: 'center',
        },
        badge: {
          position: 'absolute',
          right: -5,
          top: -5,
          minWidth: 21,
          minHeight: 21,
          paddingHorizontal: 4,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: c.white,
          backgroundColor: c.unread,
          alignItems: 'center',
          justifyContent: 'center',
        },
        badgeText: { color: c.white, fontSize: 10, lineHeight: 15 },
        toolbar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 14,
          minHeight: 36,
        },
        item: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.white,
        },
        unreadItem: { backgroundColor: c.cream },
        itemIcon: {
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.greenLight,
        },
        itemTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
        message: { color: c.muted, fontSize: 12, lineHeight: 19 },
        timestamp: { fontSize: 10, lineHeight: 16 },
        unreadDot: {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: c.unread,
          marginTop: 6,
        },
        refreshError: { fontSize: 12, lineHeight: 19, marginBottom: 14 },
        loading: { padding: 32, alignItems: 'center', gap: 14 },
      }),
    [c],
  );
}
