import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AdminHeader, DataPage } from '@/components/admin';
import { OrderDetail } from '@/components/order-detail';
import { Empty, Pill, Search, Sheet, StatusBadge, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { formatDate, money, statuses, time } from '@/utils/domain';
export default function AdminOrders() {
  const params = useLocalSearchParams<{ id?: string }>();
  const selected = params.id ?? '';
  const setSelected = (id: string | null) => router.setParams({ id: id ?? '', placed: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  return (
    <DataPage>
      {(data) => {
        const orders = data.orders
          .filter(
            (o) =>
              (filter === 'All' || o.status === filter) &&
              `${o.order_number} ${o.customer_name} ${o.student_id}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const order = data.orders.find((o) => o.id === selected);
        return (
          <>
            <AdminHeader
              title="The order queue"
              subtitle="Every good meal starts with a little preparation."
            />
            <Search
              value={search}
              onChangeText={setSearch}
              placeholder="Search order number, student name or ID"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 20 }}
            >
              {['All', ...statuses, 'Cancelled'].map((status) => (
                <Pill key={status} selected={filter === status} onPress={() => setFilter(status)}>
                  {status}
                  {status === 'All'
                    ? ` (${data.orders.length})`
                    : ` (${data.orders.filter((o) => o.status === status).length})`}
                </Pill>
              ))}
            </ScrollView>
            <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
              {orders.length ? (
                orders.map((o) => (
                  <Pressable
                    key={o.id}
                    accessibilityRole="button"
                    onPress={() => setSelected(o.id)}
                    style={{ padding: 21, borderBottomWidth: 1, borderColor: c.line, gap: 12 }}
                  >
                    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
                      <View>
                        <T bold style={{ fontSize: 14 }}>
                          {o.order_number}
                        </T>
                        <T muted style={{ fontSize: 11, marginTop: 5 }}>
                          {o.customer_name} · {o.student_id}
                        </T>
                      </View>
                      <StatusBadge status={o.status} />
                      <T bold style={{ color: c.orange }}>
                        {money(o.total)}
                      </T>
                    </View>
                    <T muted style={{ fontSize: 12 }}>
                      {o.items.map((i) => `${i.quantity} × ${i.name}`).join(' · ')}
                    </T>
                    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
                      <T muted style={{ fontSize: 10 }}>
                        Pickup {formatDate(o.pickup_at)} · {time(o.pickup_at)}
                      </T>
                      <T style={{ fontSize: 10, color: o.payment_collected ? c.green : c.muted }}>
                        {o.status === 'Cancelled'
                          ? 'No payment due'
                          : o.payment_collected
                            ? 'Cash collected'
                            : 'Cash due at pickup'}{' '}
                        · View order →
                      </T>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Empty
                  title="A quiet moment in the kitchen"
                  text="Orders matching your filters will appear here."
                />
              )}
            </View>
            <Sheet
              visible={!!order}
              title="Manage order"
              onClose={() => {
                setSelected('');
                router.setParams({ id: '' });
              }}
            >
              {order && <OrderDetail key={order.id} order={order} data={data} admin />}
            </Sheet>
          </>
        );
      }}
    </DataPage>
  );
}
