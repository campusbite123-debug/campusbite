import React, { useState } from 'react';
import { View } from 'react-native';
import { AdminHeader, DataPage, Metric, SalesChart, useAction } from '@/components/admin';
import { Button, Empty, Input, Pill, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { collectedRevenue, csv, dayKey, formatDate, futureDay, money } from '@/utils/domain';
import { exportCSV } from '@/services/media';
import { useLayout } from '@/hooks/use-layout';
export default function Analytics() {
  const { isPhone, fontScale } = useLayout();
  const stackDates = isPhone && fontScale > 1.2;
  const { run, busy } = useAction();
  const [period, setPeriod] = useState(7);
  const [from, setFrom] = useState(futureDay(-6));
  const [until, setUntil] = useState(dayKey());
  return (
    <DataPage>
      {(data) => {
        const inRange = (date: string) => {
          const d = dayKey(new Date(date));
          return d >= from && d <= until;
        };
        const orders = data.orders.filter((o) => inRange(o.created_at));
        const paid = data.orders.filter(
          (o) => o.payment_collected && o.collected_at && inRange(o.collected_at),
        );
        const quantity = paid.reduce((n, o) => n + o.items.reduce((x, i) => x + i.quantity, 0), 0);
        const mealStats = new Map<string, { name: string; quantity: number; revenue: number }>();
        const categories = new Map<string, number>();
        paid.forEach((o) =>
          o.items.forEach((i) => {
            const stat = mealStats.get(i.meal_id) ?? { name: i.name, quantity: 0, revenue: 0 };
            stat.quantity += i.quantity;
            stat.revenue += i.unit_price * i.quantity;
            mealStats.set(i.meal_id, stat);
            categories.set(
              i.category_id,
              (categories.get(i.category_id) ?? 0) + i.unit_price * i.quantity,
            );
          }),
        );
        const validRange =
          /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(until) && from <= until;
        const days = validRange
          ? Math.min(
              31,
              Math.round((new Date(until).getTime() - new Date(from).getTime()) / 86400000) + 1,
            )
          : 0;
        const chart = Array.from({ length: days }, (_, i) => {
          const d = new Date(`${until}T12:00:00+08:00`);
          d.setDate(d.getDate() - days + i + 1);
          const key = dayKey(d);
          return {
            label:
              days <= 7
                ? formatDate(key, { weekday: 'short', month: undefined, day: undefined })
                : key.slice(8),
            value: collectedRevenue(
              paid.filter((o) => o.collected_at && dayKey(new Date(o.collected_at)) === key),
            ),
          };
        });
        return (
          <>
            <AdminHeader
              title="Good food. Clear numbers."
              subtitle="Real orders and collected cash. A clearer picture of your canteen."
              action={
                <Button
                  small
                  secondary
                  icon="download-outline"
                  loading={busy}
                  disabled={!validRange}
                  onPress={() => void run(() => exportCSV(csv(orders)), 'Order report exported.')}
                >
                  Export orders CSV
                </Button>
              }
            />
            <View style={[s.row, { flexWrap: 'wrap', gap: isPhone ? 8 : 12, marginBottom: 22 }]}>
              {[
                [1, 'Today'],
                [7, 'Last 7 days'],
                [30, 'Last 30 days'],
              ].map(([days, label]) => (
                <Pill
                  key={days}
                  selected={period === days}
                  onPress={() => {
                    setPeriod(Number(days));
                    setFrom(futureDay(1 - Number(days)));
                    setUntil(dayKey());
                  }}
                >
                  {label}
                </Pill>
              ))}
            </View>
            <View
              style={[
                s.row,
                {
                  maxWidth: 520,
                  alignItems: 'stretch',
                  flexDirection: stackDates ? 'column' : 'row',
                  gap: stackDates ? 0 : 12,
                },
              ]}
            >
              <View style={{ flex: stackDates ? undefined : 1 }}>
                <Input
                  label={isPhone ? 'From date' : 'From (YYYY-MM-DD)'}
                  placeholder="YYYY-MM-DD"
                  value={from}
                  onChangeText={(v) => {
                    setFrom(v);
                    setPeriod(0);
                  }}
                />
              </View>
              <View style={{ flex: stackDates ? undefined : 1 }}>
                <Input
                  label={isPhone ? 'To date' : 'Through (YYYY-MM-DD)'}
                  placeholder="YYYY-MM-DD"
                  value={until}
                  onChangeText={(v) => {
                    setUntil(v);
                    setPeriod(0);
                  }}
                />
              </View>
            </View>
            {!validRange && (
              <T style={{ color: c.red, marginBottom: 20 }}>
                Enter valid dates with the start date before the end date.
              </T>
            )}
            <View style={[s.wrap, { gap: 16, marginBottom: 23 }]}>
              <Metric
                label="Collected revenue"
                value={money(collectedRevenue(paid))}
                icon="cash-multiple"
                accent
              />
              <Metric label="Completed & paid" value={paid.length} icon="check-circle-outline" />
              <Metric label="Servings sold" value={quantity} icon="silverware-fork-knife" />
              <Metric
                label="Average paid order"
                value={money(paid.length ? Math.round(collectedRevenue(paid) / paid.length) : 0)}
                icon="receipt-text-outline"
              />
            </View>
            <View style={s.card}>
              <T style={s.h2}>Collected cash over time</T>
              <T muted style={{ fontSize: 11, marginTop: 7 }}>
                By payment collection date · {from} to {until}
                {days === 31 ? ' · Chart shows the last 31 days' : ''}
              </T>
              {chart.length > 0 && <SalesChart series={chart} />}
            </View>
            <View style={[s.wrap, { alignItems: 'stretch', marginTop: 23, gap: 23 }]}>
              <View style={[s.card, { flex: 1, minWidth: 260 }]}>
                <T style={[s.h2, { marginBottom: 20 }]}>Campus favorites</T>
                {mealStats.size ? (
                  [...mealStats.values()]
                    .sort((a, b) => b.quantity - a.quantity)
                    .map((meal, i) => (
                      <View
                        key={meal.name}
                        style={[
                          s.row,
                          {
                            justifyContent: 'space-between',
                            paddingVertical: 14,
                            borderTopWidth: 1,
                            borderColor: c.line,
                          },
                        ]}
                      >
                        <T muted style={{ fontSize: 11 }}>
                          {String(i + 1).padStart(2, '0')}
                        </T>
                        <View style={{ flex: 1 }}>
                          <T bold style={{ fontSize: 12 }}>
                            {meal.name}
                          </T>
                          <T muted style={{ fontSize: 10, marginTop: 5 }}>
                            {meal.quantity} servings sold
                          </T>
                        </View>
                        <T bold style={{ fontSize: 12, color: c.orange }}>
                          {money(meal.revenue)}
                        </T>
                      </View>
                    ))
                ) : (
                  <Empty
                    icon="chart-bar"
                    title="Your story is still cooking"
                    text="Complete a pickup and record cash to see your top meals."
                  />
                )}
              </View>
              <View style={[s.card, { flex: 1, minWidth: 260 }]}>
                <T style={[s.h2, { marginBottom: 20 }]}>Revenue by category</T>
                {[...categories.entries()].map(([id, revenue]) => (
                  <View key={id} style={{ gap: 9, marginBottom: 24 }}>
                    <View style={[s.row, { justifyContent: 'space-between' }]}>
                      <T style={{ fontSize: 12 }}>
                        {data.categories.find((c) => c.id === id)?.name ?? 'Other'}
                      </T>
                      <T bold style={{ fontSize: 12 }}>
                        {money(revenue)}
                      </T>
                    </View>
                    <View style={{ height: 7, borderRadius: 4, backgroundColor: c.line }}>
                      <View
                        style={{
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: c.orange,
                          width: `${(revenue / Math.max(1, collectedRevenue(paid))) * 100}%`,
                        }}
                      />
                    </View>
                  </View>
                ))}
                {!categories.size && (
                  <T muted style={{ fontSize: 12, lineHeight: 22 }}>
                    Category revenue appears after your first paid pickup.
                  </T>
                )}
                <View style={s.divider} />
                <T muted style={{ fontSize: 11, lineHeight: 20 }}>
                  Only completed orders with recorded cash count as revenue. Uncollected and
                  cancelled orders are excluded. Order exports are filtered by order creation date;
                  sales use payment collection date.
                </T>
                <Button
                  secondary
                  small
                  style={{ marginTop: 15 }}
                  loading={busy}
                  onPress={() => void run(() => exportCSV(csv(paid)), 'Sales report exported.')}
                >
                  Export collected sales CSV
                </Button>
              </View>
            </View>
          </>
        );
      }}
    </DataPage>
  );
}
