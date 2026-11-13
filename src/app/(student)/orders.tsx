import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSnapshot } from '@/contexts/app';
import { errorMessage, formatDate, isActive, money, time } from '@/utils/domain';
import { colors as c } from '@/constants/theme';
import { Page } from '@/components/shell';
import { OrderDetail } from '@/components/order-detail';
import { OrderConfirmation } from '@/components/order-confirmation';
import {
  Button,
  Empty,
  ErrorState,
  Icon,
  Loading,
  Pill,
  Sheet,
  StatusBadge,
  T,
  s,
} from '@/components/ui';
export default function Orders() {
  const { data, isLoading, error, refetch } = useSnapshot();
  const params = useLocalSearchParams<{ id?: string; placed?: string }>();
  const selected = params.id ?? '';
  const setSelected = (id: string | null) => router.setParams({ id: id ?? '', placed: '' });
  const [tab, setTab] = useState('Active');
  if (isLoading) return <Loading />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} retry={() => void refetch()} />;
  const orders = data.orders
    .filter((o) => tab === 'All' || (tab === 'Active' ? isActive(o) : !isActive(o)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const order = data.orders.find((o) => o.id === selected);
  return (
    <Page>
      <T muted style={{ fontSize: 12, marginBottom: 7 }}>
        FROM OUR KITCHEN TO YOUR BREAK
      </T>
      <T style={s.h1}>Your orders</T>
      <T muted style={{ marginTop: 9, marginBottom: 24 }}>
        A little anticipation makes everything taste better.
      </T>
      <View style={[s.row, { marginBottom: 24 }]}>
        {['Active', 'Past orders', 'All'].map((t) => (
          <Pill key={t} selected={tab === t} onPress={() => setTab(t)}>
            {t}
          </Pill>
        ))}
      </View>
      {orders.length ? (
        <View style={{ gap: 14 }}>
          {orders.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityLabel={`View order ${o.order_number}`}
              onPress={() => setSelected(o.id)}
              style={[s.card, { gap: 15 }]}
            >
              <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
                <View style={s.row}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      backgroundColor: c.peach,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 13,
                    }}
                  >
                    <Icon name="receipt-text-outline" color={c.orange} />
                  </View>
                  <View>
                    <T bold>{o.order_number}</T>
                    <T muted style={{ fontSize: 10, marginTop: 5 }}>
                      {formatDate(o.created_at)} · {o.items.reduce((n, i) => n + i.quantity, 0)}{' '}
                      items
                    </T>
                  </View>
                </View>
                <StatusBadge status={o.status} />
              </View>
              <T muted style={{ fontSize: 12 }} numberOfLines={2}>
                {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
              </T>
              <View
                style={[
                  s.row,
                  {
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderColor: c.line,
                  },
                ]}
              >
                <T style={{ fontSize: 11 }}>
                  Pickup {formatDate(o.pickup_at)} · {time(o.pickup_at)}
                </T>
                <T bold style={{ color: c.orange }}>
                  {money(o.total)} →
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={s.card}>
          <Empty
            icon="receipt-text-outline"
            title={
              tab === 'Active' ? 'Nothing in the kitchen just yet' : 'Your food story starts here'
            }
            text="Your pre-orders and pickup receipts will appear here."
          >
            <Button onPress={() => router.push('/menu')}>Find your next meal</Button>
          </Empty>
        </View>
      )}
      <Sheet
        visible={!!order && params.placed !== 'true'}
        onClose={() => {
          setSelected(null);
          router.setParams({ id: '', placed: '' });
        }}
        title="Your digital receipt"
      >
        {order && params.placed !== 'true' && (
          <OrderDetail key={order.id} order={order} data={data} />
        )}
      </Sheet>
      {order && params.placed === 'true' && (
        <OrderConfirmation
          order={order}
          data={data}
          onClose={() => setSelected(null)}
          onTrack={() => router.setParams({ placed: '' })}
          onBrowse={() => router.replace('/menu')}
        />
      )}
    </Page>
  );
}
