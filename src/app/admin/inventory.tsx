import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AdminHeader, DataPage, useAction } from '@/components/admin';
import { Button, Empty, FoodImage, Input, Pill, Search, Sheet, T, s } from '@/components/ui';
import { useAuth } from '@/contexts/app';
import { setStock } from '@/services/repository';
import type { DailyMenu } from '@/types';
import { dayKey, formatDate, futureDay, mealFor } from '@/utils/domain';
import { colors as c } from '@/constants/theme';
export default function Inventory() {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [date, setDate] = useState(dayKey());
  const [search, setSearch] = useState('');
  const [low, setLow] = useState(false);
  const [edit, setEdit] = useState<DailyMenu | null>(null);
  const [qty, setQty] = useState('');
  const [threshold, setThreshold] = useState('');
  return (
    <DataPage>
      {(data) => {
        const menus = data.menus.filter(
          (m) =>
            m.service_date === date &&
            (!low || m.quantity <= m.low_stock_threshold) &&
            mealFor(m, data).name.toLowerCase().includes(search.toLowerCase()),
        );
        return (
          <>
            <AdminHeader
              title="A well-stocked kitchen."
              subtitle="Keep an eye on every serving. Stock is reserved when students pre-order."
            />
            <Search
              value={search}
              onChangeText={setSearch}
              placeholder="Search your meal inventory"
            />
            <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <Pill
                  key={i}
                  selected={date === futureDay(i)}
                  onPress={() => setDate(futureDay(i))}
                >
                  {i === 0 ? 'Today' : formatDate(futureDay(i))}
                </Pill>
              ))}
            </ScrollView>
            <View style={[s.row, { marginBottom: 19 }]}>
              <Pill selected={!low} onPress={() => setLow(false)}>
                All stock
              </Pill>
              <Pill selected={low} onPress={() => setLow(true)} icon="alert-circle-outline">
                Low stock
              </Pill>
            </View>
            <View style={{ gap: 12 }}>
              {menus.map((menu) => {
                const meal = mealFor(menu, data);
                return (
                  <View key={menu.id} style={[s.card, s.row, { flexWrap: 'wrap' }]}>
                    <FoodImage
                      uri={meal.image_url}
                      style={{ width: 66, height: 66, borderRadius: 12 }}
                    />
                    <View style={{ flex: 1, minWidth: 120, gap: 6 }}>
                      <T bold style={{ fontSize: 13 }}>
                        {meal.name}
                      </T>
                      <T muted style={{ fontSize: 10 }}>
                        Low-stock alert at {menu.low_stock_threshold} servings
                      </T>
                      <View
                        style={{
                          height: 4,
                          backgroundColor: c.line,
                          borderRadius: 3,
                          maxWidth: 220,
                        }}
                      >
                        <View
                          style={{
                            height: 4,
                            borderRadius: 3,
                            width: `${Math.min(100, (menu.quantity / Math.max(50, menu.quantity)) * 100)}%`,
                            backgroundColor:
                              menu.quantity <= menu.low_stock_threshold ? c.orange : c.green,
                          }}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'center', minWidth: 66 }}>
                      <T
                        bold
                        style={{
                          fontSize: 24,
                          color: menu.quantity <= menu.low_stock_threshold ? c.orange : c.ink,
                        }}
                      >
                        {menu.quantity}
                      </T>
                      <T muted style={{ fontSize: 9 }}>
                        {menu.quantity ? 'remaining' : 'SOLD OUT'}
                      </T>
                    </View>
                    <Button
                      small
                      secondary
                      onPress={() => {
                        setEdit(menu);
                        setQty(String(menu.quantity));
                        setThreshold(String(menu.low_stock_threshold));
                      }}
                    >
                      Update stock
                    </Button>
                  </View>
                );
              })}
            </View>
            {!menus.length && (
              <Empty
                icon="package-variant-closed"
                title={low ? 'All stocked up' : 'No meals scheduled'}
                text={
                  low
                    ? 'There are no low-stock meals for this day.'
                    : 'Schedule meals in Menu Management first.'
                }
              />
            )}
            <Sheet visible={!!edit} title="Update meal stock" onClose={() => setEdit(null)}>
              {edit && (
                <>
                  <T bold style={{ marginBottom: 17 }}>
                    {mealFor(edit, data).name} · {formatDate(edit.service_date)}
                  </T>
                  <Input
                    label="Remaining servings"
                    keyboardType="number-pad"
                    value={qty}
                    onChangeText={setQty}
                  />
                  <Input
                    label="Low-stock alert threshold"
                    keyboardType="number-pad"
                    value={threshold}
                    onChangeText={setThreshold}
                  />
                  <T muted style={{ fontSize: 11, lineHeight: 19, marginBottom: 18 }}>
                    Set remaining stock to 0 to mark this meal as sold out. Orders that are already
                    reserved are unaffected.
                  </T>
                  <Button
                    loading={busy}
                    onPress={() =>
                      void run(
                        () =>
                          setStock(edit.id, Number(qty), Number(threshold), user!, edit.quantity),
                        'Inventory updated.',
                        () => setEdit(null),
                      )
                    }
                  >
                    Save stock
                  </Button>
                </>
              )}
            </Sheet>
          </>
        );
      }}
    </DataPage>
  );
}
