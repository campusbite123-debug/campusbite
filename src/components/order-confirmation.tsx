import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Portal } from 'react-native-paper';
import { AppModal as Modal } from './app-modal';
import type { Order, Snapshot } from '@/types';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { formatDate, money, time } from '@/utils/domain';
import { Button, FoodImage, Icon, IconButton, StatusBadge, T, useStyles } from './ui';

export function OrderConfirmation({
  order,
  data,
  onClose,
  onTrack,
  onBrowse,
}: {
  order: Order;
  data: Snapshot;
  onClose: () => void;
  onTrack: () => void;
  onBrowse: () => void;
}) {
  const c = useColors();
  const styles = useComponentStyles();
  const s = useStyles();

  const { width, height } = useWindowDimensions();
  const compact = width < 600;
  const cancelled = order.status === 'Cancelled';
  const completed = order.status === 'Completed';
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modal,
          { width: Math.min(width - 24, 720), maxHeight: height * 0.92 },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
          <View
            style={[
              styles.hero,
              { paddingHorizontal: compact ? 24 : 40 },
              compact && { paddingTop: 20, paddingBottom: 18 },
            ]}
          >
            <View style={styles.close}>
              <IconButton icon="close" label="Close dialog" onPress={onClose} />
            </View>
            <View style={[styles.checkHalo, compact && { padding: 6, marginBottom: 12 }]}>
              <View
                style={[
                  styles.check,
                  compact && { width: 40, height: 40 },
                  cancelled && { backgroundColor: c.red },
                ]}
              >
                <Icon
                  name={cancelled ? 'close' : 'check'}
                  color={c.white}
                  size={compact ? 25 : 32}
                />
              </View>
            </View>
            <T style={styles.eyebrow}>THANKS FOR ORDERING</T>
            <T
              accessibilityRole="header"
              style={[styles.title, compact && { fontSize: 24, marginTop: 7 }]}
            >
              {cancelled
                ? 'This order was cancelled.'
                : completed
                  ? 'Enjoy every bite.'
                  : 'Your pre-order is in!'}
            </T>
            <T style={[styles.subtitle, compact && { fontSize: 11, lineHeight: 18, marginTop: 7 }]}>
              {cancelled
                ? 'Your order details are below. You can explore the menu for another meal.'
                : completed
                  ? 'Your pickup is complete. Thanks for making us part of your day.'
                  : 'Sent to the canteen. Track your order for pickup updates.'}
            </T>
          </View>

          <View style={{ padding: compact ? 20 : 28, gap: compact ? 20 : 24 }}>
            <View style={[styles.orderLine, compact && { alignItems: 'flex-start' }]}>
              <View style={{ gap: 5, flexShrink: 1 }}>
                <T style={styles.label}>ORDER NUMBER</T>
                <T selectable bold style={{ fontSize: 13 }}>
                  {order.order_number}
                </T>
              </View>
              <StatusBadge status={order.status} />
            </View>

            <View style={{ flexDirection: compact ? 'column' : 'row', gap: 22 }}>
              <View
                style={[
                  styles.ticket,
                  { width: compact ? '100%' : 265 },
                  compact && { padding: 18 },
                ]}
              >
                <View style={[s.row, { gap: 7 }]}>
                  <Icon name="ticket-confirmation-outline" size={17} color={c.greenLight} />
                  <T style={styles.ticketLabel}>
                    {cancelled || completed ? 'PICKUP STATUS' : 'YOUR PICKUP CODE'}
                  </T>
                </View>
                <T
                  selectable={!cancelled && !completed}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={[
                    styles.code,
                    compact && { marginTop: 12 },
                    (cancelled || completed) && { fontSize: 25, letterSpacing: 0 },
                    width < 360 && { fontSize: 27, letterSpacing: 3 },
                  ]}
                >
                  {cancelled ? 'Cancelled' : completed ? 'Picked up' : order.pickup_code}
                </T>
                <View style={[styles.ticketDivider, compact && { marginVertical: 11 }]} />
                <T style={{ color: c.greenLight, fontSize: 11, lineHeight: 17 }}>
                  {cancelled
                    ? 'No payment is due for this order.'
                    : completed
                      ? 'Your meal has been collected.'
                      : 'Show this code to the staff when you pick up your meal.'}
                </T>
                <View style={[styles.notch, { left: -9, top: compact ? 88 : 100 }]} />
                <View style={[styles.notch, { right: -9, top: compact ? 88 : 100 }]} />
              </View>

              <View
                style={{
                  flex: 1,
                  gap: 20,
                  justifyContent: 'center',
                  flexDirection: compact ? 'row' : 'column',
                }}
              >
                <View style={[s.row, { alignItems: 'flex-start' }, compact && { flex: 1 }]}>
                  {!compact && (
                    <View style={styles.detailIcon}>
                      <Icon name="clock-outline" size={20} color={c.orangeDark} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 5 }}>
                    <T style={styles.label}>PICKUP TIME</T>
                    <T bold style={{ fontSize: 20 }}>
                      {time(order.pickup_at)}
                    </T>
                    <T style={styles.detailText}>
                      {formatDate(order.pickup_at, { weekday: 'short' })} · Manila time
                    </T>
                  </View>
                </View>
                <View style={[s.row, { alignItems: 'flex-start' }, compact && { flex: 1 }]}>
                  {!compact && (
                    <View style={styles.detailIcon}>
                      <Icon name="map-marker-outline" size={20} color={c.orangeDark} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 5 }}>
                    <T style={styles.label}>MEET US AT</T>
                    <T bold style={{ fontSize: 13, lineHeight: 20 }}>
                      {data.settings.pickup_location}
                    </T>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.receipt}>
              <View style={styles.orderLine}>
                <T bold style={{ fontSize: 14 }}>
                  Your order
                </T>
                <T style={styles.detailText}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </T>
              </View>
              {order.items.map((item) => {
                const meal = data.meals.find((meal) => meal.id === item.meal_id);
                return (
                  <View key={item.daily_menu_id} style={styles.item}>
                    {meal ? (
                      <FoodImage uri={meal.image_url} style={styles.photo} />
                    ) : (
                      <View style={[styles.photo, styles.photoFallback]}>
                        <Icon name="silverware-fork-knife" color={c.orange} size={20} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <T bold style={{ fontSize: 12, lineHeight: 18 }}>
                        {item.name}
                      </T>
                      <T style={styles.detailText}>
                        {item.quantity} × {money(item.unit_price)}
                      </T>
                    </View>
                    <T bold style={{ fontSize: 13 }}>
                      {money(item.quantity * item.unit_price)}
                    </T>
                  </View>
                );
              })}
              <View style={styles.total}>
                <View style={{ flex: 1, gap: 5 }}>
                  <T bold style={{ fontSize: 13 }}>
                    {cancelled
                      ? 'Order total'
                      : order.payment_collected
                        ? 'Total paid'
                        : 'Total to pay'}
                  </T>
                  <View style={[s.row, { gap: 5 }]}>
                    <Icon name="cash-multiple" size={16} color={c.green} />
                    <T style={styles.detailText}>Cash on Pickup</T>
                  </View>
                </View>
                <T style={styles.amount}>{money(order.total)}</T>
              </View>
            </View>

            <View style={[s.row, { alignItems: 'flex-start', gap: 9 }]}>
              <Icon
                name={order.payment_collected ? 'check-circle-outline' : 'information-outline'}
                size={18}
                color={c.green}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <T bold style={{ fontSize: 11 }}>
                  {cancelled
                    ? 'No payment due'
                    : order.payment_collected
                      ? 'Cash collected'
                      : 'Payment due at pickup'}
                </T>
                <T style={[styles.detailText, { lineHeight: 18 }]}>
                  {cancelled || completed
                    ? 'You can find this receipt anytime in your orders.'
                    : 'Track your order for a Ready for Pickup update before heading to the counter.'}
                </T>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { flexDirection: compact ? 'column' : 'row-reverse' }]}>
          <Button onPress={onTrack} icon="arrow-right" style={!compact && { flex: 1 }}>
            Track my order
          </Button>
          <Button secondary onPress={onBrowse} style={!compact && { flex: 1 }}>
            Back to menu
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        modal: {
          backgroundColor: c.white,
          borderRadius: 28,
          overflow: 'hidden',
          alignSelf: 'center',
        },
        hero: { backgroundColor: c.peach, paddingTop: 26, paddingBottom: 24, alignItems: 'center' },
        close: { position: 'absolute', right: 12, top: 12 },
        checkHalo: { padding: 9, backgroundColor: c.white, borderRadius: 50, marginBottom: 17 },
        check: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.orange,
          alignItems: 'center',
          justifyContent: 'center',
        },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 2, color: c.orangeDark },
        title: {
          fontFamily: fonts.display,
          fontSize: 30,
          letterSpacing: -1,
          marginTop: 9,
          textAlign: 'center',
          color: c.ink,
        },
        subtitle: {
          fontSize: 12,
          lineHeight: 20,
          color: c.muted,
          textAlign: 'center',
          maxWidth: 350,
          marginTop: 9,
        },
        orderLine: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        label: { fontSize: 9, letterSpacing: 1.2, color: c.muted, fontFamily: fonts.semibold },
        ticket: { backgroundColor: c.ink, borderRadius: 18, padding: 22, overflow: 'hidden' },
        ticketLabel: {
          fontSize: 9,
          letterSpacing: 1.5,
          color: c.greenLight,
          fontFamily: fonts.semibold,
        },
        code: {
          fontFamily: fonts.bold,
          fontVariant: ['tabular-nums'],
          fontSize: 30,
          letterSpacing: 4,
          color: c.white,
          marginTop: 17,
        },
        ticketDivider: {
          borderTopWidth: 1,
          borderStyle: 'dashed',
          borderColor: c.greenLight + '66',
          marginVertical: 15,
        },
        notch: {
          width: 18,
          height: 18,
          backgroundColor: c.white,
          borderRadius: 9,
          position: 'absolute',
          top: 100,
        },
        detailIcon: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: c.peach,
          alignItems: 'center',
          justifyContent: 'center',
        },
        detailText: { fontSize: 11, color: c.muted },
        receipt: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, paddingTop: 19 },
        item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17 },
        photo: { width: 44, height: 44, borderRadius: 12 },
        photoFallback: { backgroundColor: c.peach, alignItems: 'center', justifyContent: 'center' },
        total: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: c.greenLight,
          padding: 16,
          borderRadius: 14,
          marginVertical: 18,
        },
        amount: {
          fontFamily: fonts.bold,
          fontVariant: ['tabular-nums'],
          fontSize: 27,
          color: c.ink,
          letterSpacing: -0.6,
        },
        footer: {
          padding: 20,
          borderTopWidth: 1,
          borderColor: c.line,
          gap: 10,
          backgroundColor: c.white,
        },
      }),
    [c],
  );
}
