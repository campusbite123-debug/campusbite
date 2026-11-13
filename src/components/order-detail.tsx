import React, { useState } from 'react';
import { View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import type { Order, Snapshot, Status } from '@/types';
import { useAuth, useToast } from '@/contexts/app';
import { transitionOrder } from '@/services/repository';
import { errorMessage, formatDate, money, statuses, time } from '@/utils/domain';
import { colors as c, fonts } from '@/constants/theme';
import { Button, Icon, Input, StatusBadge, T, s } from './ui';

export function OrderDetail({
  order,
  data,
  admin = false,
}: {
  order: Order;
  data: Snapshot;
  admin?: boolean;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [cancel, setCancel] = useState(false);
  const [collected, setCollected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function update(status: Status) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await transitionOrder(order.id, status, user!, code, reason, collected);
      await client.invalidateQueries({ queryKey: ['canteen'] });
      setCancel(false);
      toast(
        status === 'Completed'
          ? 'Pickup verified. Cash recorded. Enjoy your meal!'
          : `Order ${status.toLowerCase()}.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const next = statuses[statuses.indexOf(order.status) + 1];
  return (
    <View>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View>
          <T bold style={{ fontSize: 18 }}>
            {order.order_number}
          </T>
          <T muted style={{ fontSize: 11, marginTop: 5 }}>
            Placed {formatDate(order.created_at)} at {time(order.created_at)}
          </T>
        </View>
        <StatusBadge status={order.status} />
      </View>
      {order.status === 'Ready for Pickup' && (
        <View
          style={{
            backgroundColor: c.greenLight,
            padding: 17,
            borderRadius: 13,
            marginTop: 20,
            gap: 7,
          }}
        >
          <View style={s.row}>
            <Icon name="bell-ring-outline" color={c.green} />
            <T bold style={{ color: c.green }}>
              Your meal is ready to enjoy!
            </T>
          </View>
          <T style={{ color: c.green, fontSize: 12, lineHeight: 20 }}>
            Head to {data.settings.pickup_location}. Show your pickup code and pay{' '}
            {money(order.total)} in cash.
          </T>
        </View>
      )}
      {!admin && order.status !== 'Cancelled' && (
        <View style={{ marginTop: 24, marginBottom: 8 }}>
          {statuses.map((status, index) => {
            const step = statuses.indexOf(order.status);
            const done = index <= step;
            const history = order.history.find((h) => h.status === status);
            return (
              <View key={status} style={{ flexDirection: 'row', gap: 13, minHeight: 47 }}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 8,
                      backgroundColor: done ? c.orange : c.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={
                        index < step ? 'check' : index === step ? 'circle-small' : 'circle-outline'
                      }
                      size={15}
                      color={done ? c.white : '#B4B7AD'}
                    />
                  </View>
                  {index < 4 && (
                    <View
                      style={{
                        width: 2,
                        height: 25,
                        backgroundColor: index < step ? c.orange : c.line,
                      }}
                    />
                  )}
                </View>
                <T
                  style={{
                    fontFamily: index === step ? fonts.bold : fonts.regular,
                    fontSize: 12,
                    color: done ? c.ink : c.muted,
                    flex: 1,
                  }}
                >
                  {status}
                </T>
                {history && (
                  <T muted style={{ fontSize: 10 }}>
                    {time(history.created_at)}
                  </T>
                )}
              </View>
            );
          })}
        </View>
      )}
      <View style={s.divider} />
      <View style={{ gap: 11 }}>
        <View style={s.row}>
          <Icon name="account-outline" color={c.orange} size={18} />
          <T style={{ fontSize: 12 }}>{order.customer_name}</T>
        </View>
        <View style={s.row}>
          <Icon name="clock-outline" color={c.orange} size={18} />
          <T style={{ fontSize: 12 }}>
            {formatDate(order.pickup_at, { weekday: 'short' })} · {time(order.pickup_at)}
          </T>
        </View>
        <View style={s.row}>
          <Icon name="map-marker-outline" color={c.orange} size={18} />
          <T style={{ fontSize: 12, flex: 1 }}>{data.settings.pickup_location}</T>
        </View>
      </View>
      <View style={s.divider} />
      {order.items.map((i) => (
        <View
          key={i.daily_menu_id}
          style={[s.row, { justifyContent: 'space-between', marginBottom: 13 }]}
        >
          <T style={{ fontSize: 12, flex: 1 }}>
            {i.quantity} × {i.name}
          </T>
          <T bold style={{ fontSize: 12 }}>
            {money(i.quantity * i.unit_price)}
          </T>
        </View>
      ))}
      <View style={s.divider} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T bold>Total amount</T>
        <T style={{ fontFamily: fonts.display, fontSize: 25 }}>{money(order.total)}</T>
      </View>
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 10 }]}>
        <T muted style={{ fontSize: 11 }}>
          Cash on Pickup
        </T>
        <T style={{ fontSize: 11, color: order.payment_collected ? c.green : c.orange }}>
          {order.status === 'Cancelled'
            ? 'No payment due'
            : order.payment_collected
              ? 'Cash collected'
              : 'Payment due at pickup'}
        </T>
      </View>
      {!admin && !['Cancelled', 'Completed'].includes(order.status) && (
        <View
          style={{
            backgroundColor: '#F8F7F1',
            padding: 23,
            borderRadius: 14,
            marginTop: 23,
            alignItems: 'center',
            gap: 9,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: '#D9D9CA',
          }}
        >
          <T muted style={{ fontSize: 9, letterSpacing: 2 }}>
            YOUR UNIQUE PICKUP CODE
          </T>
          <T selectable style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: 5 }}>
            {order.pickup_code}
          </T>
          <T muted style={{ fontSize: 10 }}>
            Show this code to the canteen staff.
          </T>
        </View>
      )}
      {order.cancellation_reason && (
        <T style={{ marginTop: 18, color: c.red, fontSize: 12 }}>
          Cancellation reason: {order.cancellation_reason}
        </T>
      )}
      {admin && order.status === 'Ready for Pickup' && (
        <View style={{ marginTop: 22 }}>
          <Input
            label="Student’s pickup code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="Enter the code on their receipt"
          />
          <Checkbox.Item
            label="I have collected the cash payment"
            status={collected ? 'checked' : 'unchecked'}
            onPress={() => setCollected(!collected)}
            labelStyle={{ fontFamily: fonts.regular, fontSize: 12 }}
            position="leading"
          />
        </View>
      )}
      {!!error && (
        <T
          accessibilityRole="alert"
          style={{ color: c.red, marginTop: 15, lineHeight: 20, fontSize: 12 }}
        >
          {error}
        </T>
      )}
      {admin && next && order.status !== 'Cancelled' && !cancel && (
        <Button
          loading={busy}
          disabled={order.status === 'Ready for Pickup' && (!collected || !code.trim())}
          style={{ marginTop: 20 }}
          onPress={() => void update(next)}
          icon={next === 'Completed' ? 'check-all' : 'arrow-right'}
        >
          {
            (
              {
                Confirmed: 'Confirm order',
                Preparing: 'Start preparing',
                'Ready for Pickup': 'Mark ready for pickup',
                Completed: 'Verify code & complete pickup',
              } as any
            )[next]
          }
        </Button>
      )}
      {(admin
        ? !['Completed', 'Cancelled'].includes(order.status)
        : order.status === 'Pending') && (
        <View style={{ marginTop: 17 }}>
          {cancel ? (
            <>
              <Input
                label="Cancellation reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Tell the student why this order is cancelled"
                maxLength={500}
              />
              <View style={s.row}>
                <Button secondary style={{ flex: 1 }} onPress={() => setCancel(false)}>
                  Keep order
                </Button>
                <Button
                  style={{ flex: 1, backgroundColor: c.red }}
                  loading={busy}
                  disabled={reason.trim().length < 3}
                  onPress={() => void update('Cancelled')}
                >
                  Cancel order
                </Button>
              </View>
            </>
          ) : (
            <Button secondary onPress={() => setCancel(true)}>
              Cancel this order
            </Button>
          )}
        </View>
      )}
      {admin && (
        <View style={{ marginTop: 22 }}>
          <T bold style={{ fontSize: 12, marginBottom: 12 }}>
            Order activity
          </T>
          {order.history.map((h, i) => (
            <View key={i} style={[s.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <T muted style={{ fontSize: 11 }}>
                {h.status}
                {h.reason ? ` · ${h.reason}` : ''}
              </T>
              <T muted style={{ fontSize: 10 }}>
                {time(h.created_at)}
              </T>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
