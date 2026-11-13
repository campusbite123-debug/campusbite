import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { AdminHeader, DataPage, Metric, SalesChart } from '@/components/admin';
import { Button, Empty, Icon, StatusBadge, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import {
  collectedRevenue,
  dayKey,
  formatDate,
  futureDay,
  mealFor,
  money,
  time,
} from '@/utils/domain';
export default function Dashboard() {
  const { width } = useWindowDimensions();
  return (
    <DataPage>
      {(data) => {
        const today = data.orders.filter((o) => dayKey(new Date(o.created_at)) === dayKey());
        const collected = data.orders.filter(
          (o) => o.collected_at && dayKey(new Date(o.collected_at)) === dayKey(),
        );
        const count = (status: string) => today.filter((o) => o.status === status).length;
        const low = data.menus.filter(
          (m) =>
            m.service_date === dayKey() && m.is_available && m.quantity <= m.low_stock_threshold,
        );
        const series = Array.from({ length: 7 }, (_, i) => {
          const day = futureDay(i - 6);
          return {
            label: formatDate(day, { weekday: 'short', month: undefined, day: undefined }),
            value: collectedRevenue(
              data.orders.filter((o) => o.collected_at && dayKey(new Date(o.collected_at)) === day),
            ),
          };
        });
        return (
          <>
            <AdminHeader
              title="A good day starts here."
              subtitle="Your kitchen, your orders, and a little less guesswork."
              action={
                <Button
                  small
                  icon="receipt-text-outline"
                  onPress={() => router.push('/admin/orders')}
                >
                  Manage orders
                </Button>
              }
            />
            <View style={[s.wrap, { gap: 16, marginBottom: 24 }]}>
              <Metric
                label="Cash collected today"
                value={money(collectedRevenue(collected))}
                icon="cash-multiple"
                accent
                note="Verified pickups with payment recorded"
              />
              <Metric
                label="Orders today"
                value={today.length}
                icon="receipt-text-outline"
                note={`${count('Completed')} completed · ${count('Cancelled')} cancelled`}
              />
              <Metric
                label="In the kitchen"
                value={count('Preparing')}
                icon="chef-hat"
                note={`${count('Pending')} pending · ${count('Confirmed')} confirmed`}
              />
              <Metric
                label="Ready for pickup"
                value={count('Ready for Pickup')}
                icon="shopping-outline"
                note="Freshly prepared and ready to go"
              />
            </View>
            <View style={{ flexDirection: width > 1200 ? 'row' : 'column', gap: 23 }}>
              <View style={[s.card, { flex: 1 }]}>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <View>
                    <T style={s.h2}>A week in good food</T>
                    <T muted style={{ fontSize: 11, marginTop: 6 }}>
                      Collected revenue · last 7 days
                    </T>
                  </View>
                  <Icon name="chart-line" color={c.orange} />
                </View>
                <SalesChart series={series} />
                <Button secondary small onPress={() => router.push('/admin/analytics')}>
                  Explore analytics
                </Button>
              </View>
              <View style={[s.card, { width: width > 1200 ? 300 : '100%' }]}>
                <View style={[s.row, { justifyContent: 'space-between', marginBottom: 17 }]}>
                  <T style={s.h2}>Stock watch</T>
                  <Icon name="package-variant" color={c.orange} />
                </View>
                {low.length ? (
                  low.slice(0, 5).map((m) => (
                    <View
                      key={m.id}
                      style={[
                        s.row,
                        {
                          justifyContent: 'space-between',
                          paddingVertical: 13,
                          borderBottomWidth: 1,
                          borderColor: c.line,
                        },
                      ]}
                    >
                      <T style={{ fontSize: 12, flex: 1 }}>{mealFor(m, data).name}</T>
                      <T bold style={{ color: m.quantity ? c.orange : c.red, fontSize: 11 }}>
                        {m.quantity} left
                      </T>
                    </View>
                  ))
                ) : (
                  <Empty
                    icon="check-circle-outline"
                    title="Stock looks good"
                    text="No low-stock meals today."
                  />
                )}
                <Button
                  secondary
                  small
                  style={{ marginTop: 19 }}
                  onPress={() => router.push('/admin/inventory')}
                >
                  Open inventory
                </Button>
              </View>
            </View>
            <View style={[s.card, { marginTop: 24 }]}>
              <T style={[s.h2, { marginBottom: 15 }]}>The campus favorites</T>
              {data.popularity.length ? (
                [...data.popularity]
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 3)
                  .map((item, index) => (
                    <View
                      key={item.meal_id}
                      style={[
                        s.row,
                        {
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          borderTopWidth: 1,
                          borderColor: c.line,
                        },
                      ]}
                    >
                      <T muted style={{ fontSize: 11 }}>
                        0{index + 1}
                      </T>
                      <T bold style={{ fontSize: 12, flex: 1 }}>
                        {data.meals.find((m) => m.id === item.meal_id)?.name ?? 'Archived meal'}
                      </T>
                      <T style={{ fontSize: 11, color: c.orange }}>
                        {item.quantity} servings ordered
                      </T>
                    </View>
                  ))
              ) : (
                <T muted style={{ fontSize: 12 }}>
                  Popular meals appear after students start ordering.
                </T>
              )}
              <T muted style={{ fontSize: 10, marginTop: 10 }}>
                Last 30 days · excludes cancelled orders
              </T>
            </View>
            <View style={[s.card, { marginTop: 24 }]}>
              <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
                <T style={s.h2}>Fresh from the order queue</T>
                <Pressable onPress={() => router.push('/admin/orders')}>
                  <T style={{ fontSize: 11, color: c.orange }}>View all orders →</T>
                </Pressable>
              </View>
              {!today.length ? (
                <Empty
                  icon="receipt-text-outline"
                  title="Ready for the first order"
                  text="Student pre-orders will appear here as soon as they are placed."
                />
              ) : (
                [...today]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 5)
                  .map((o) => (
                    <Pressable
                      key={o.id}
                      onPress={() =>
                        router.push({ pathname: '/admin/orders', params: { id: o.id } })
                      }
                      style={[
                        s.row,
                        {
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          paddingVertical: 15,
                          borderTopWidth: 1,
                          borderColor: c.line,
                        },
                      ]}
                    >
                      <View>
                        <T bold style={{ fontSize: 12 }}>
                          {o.order_number}
                        </T>
                        <T muted style={{ fontSize: 10, marginTop: 5 }}>
                          {o.customer_name} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
                        </T>
                      </View>
                      <T muted style={{ fontSize: 11 }}>
                        Pickup {time(o.pickup_at)}
                      </T>
                      <StatusBadge status={o.status} />
                      <T bold style={{ fontSize: 13 }}>
                        {money(o.total)}
                      </T>
                    </Pressable>
                  ))
              )}
            </View>
          </>
        );
      }}
    </DataPage>
  );
}
