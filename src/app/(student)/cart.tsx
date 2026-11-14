import React, { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useCart, useSnapshot, useToast } from '@/contexts/app';
import { placeOrder } from '@/services/repository';
import { cartTotal, errorMessage, formatDate, money, time, validSlots } from '@/utils/domain';
import { colors as c, fonts } from '@/constants/theme';
import { Page } from '@/components/shell';
import { useLayout } from '@/hooks/use-layout';
import {
  Button,
  Empty,
  ErrorState,
  FoodImage,
  Icon,
  Loading,
  Pill,
  Quantity,
  T,
  s,
} from '@/components/ui';
export default function Cart() {
  const { data, error, isLoading, refetch } = useSnapshot();
  const { user } = useAuth();
  const { lines, setQuantity, clear } = useCart();
  const toast = useToast();
  const client = useQueryClient();
  const { isPhone, contentWidth } = useLayout();
  const twoPane = contentWidth >= 850;
  const [slotId, setSlotId] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const locked = useRef(false);
  if (isLoading) return <Loading inShell variant="list" label="Loading your bag" />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} retry={() => void refetch()} />;
  const slots = validSlots(data, lines);
  const chosen = slots.find((s) => s.id === slotId);
  const dates = [...new Set(slots.map((s) => formatDate(s.starts_at, { weekday: 'short' })))];
  async function checkout() {
    if (locked.current || !chosen || !user) return;
    locked.current = true;
    setBusy(true);
    setFailure('');
    try {
      const storageKey = `checkout-intent-${user.id}`;
      const fingerprint = JSON.stringify({ items: lines, slot: chosen.id });
      const rawIntent = await AsyncStorage.getItem(storageKey);
      const previous = rawIntent ? JSON.parse(rawIntent) : null;
      const intent =
        previous?.fingerprint === fingerprint
          ? previous
          : { fingerprint, key: Crypto.randomUUID() };
      await AsyncStorage.setItem(storageKey, JSON.stringify(intent));
      const id = await placeOrder(
        { items: lines, slot_id: chosen.id, idempotency_key: intent.key },
        user,
      );
      clear();
      await AsyncStorage.removeItem(storageKey);
      await client.invalidateQueries({ queryKey: ['canteen'] });
      // The confirmation replaces earlier cart notices and keeps its actions unobstructed.
      toast('');
      router.replace({ pathname: '/orders', params: { id, placed: 'true' } });
    } catch (e) {
      setFailure(errorMessage(e));
      void refetch();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Page
      footer={
        isPhone && lines.length > 0 ? (
          <View testID="checkout-actions" style={[s.row, { justifyContent: 'space-between' }]}>
            <View style={{ gap: 3 }}>
              <T muted style={{ fontSize: 10 }}>
                Cash at pickup
              </T>
              <T bold style={{ fontSize: 22 }}>
                {money(cartTotal(lines, data))}
              </T>
            </View>
            <Button
              disabled={!chosen}
              loading={busy}
              onPress={() => void checkout()}
              icon="check-circle-outline"
              style={{ flexShrink: 1 }}
            >
              Confirm pre-order
            </Button>
          </View>
        ) : undefined
      }
    >
      <T muted style={{ fontSize: 12, marginBottom: 7 }}>
        ONE STEP CLOSER TO YOUR NEXT GOOD MEAL
      </T>
      <T style={s.h1}>Your bag, your break.</T>
      <T muted style={{ marginTop: 9, marginBottom: 27 }}>
        A few favorites. A pickup time. You’re all set.
      </T>
      {!lines.length ? (
        <View style={s.card}>
          <Empty
            icon="shopping-outline"
            title="Your next favorite is waiting"
            text="Explore the menu and add a little deliciousness to your day."
          >
            <Button onPress={() => router.push('/menu')}>Browse the menu</Button>
          </Empty>
        </View>
      ) : (
        <View
          style={{
            flexDirection: twoPane ? 'row' : 'column',
            gap: 24,
            alignItems: 'flex-start',
          }}
        >
          <View
            style={[
              s.card,
              {
                flex: 1,
                minWidth: 0,
                width: twoPane ? undefined : '100%',
                padding: isPhone ? 16 : 20,
              },
            ]}
          >
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
              <T style={s.h2}>Your order</T>
              <T muted style={{ fontSize: 11 }}>
                {lines.reduce((n, l) => n + l.quantity, 0)} items
              </T>
            </View>
            {lines.map((line) => {
              const menu = data.menus.find((m) => m.id === line.daily_menu_id);
              const meal = data.meals.find((m) => m.id === menu?.meal_id);
              const invalid =
                !menu ||
                !meal ||
                !menu.is_available ||
                !meal.is_active ||
                line.quantity > menu.quantity;
              return (
                <View
                  key={line.daily_menu_id}
                  style={{ paddingVertical: 17, borderTopWidth: 1, borderColor: c.line }}
                >
                  <View style={[s.row, { gap: 12, alignItems: 'flex-start' }]}>
                    {meal && (
                      <FoodImage
                        uri={meal.image_url}
                        style={{
                          width: isPhone ? 64 : 74,
                          height: isPhone ? 64 : 74,
                          borderRadius: 14,
                        }}
                      />
                    )}
                    <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
                      <T bold style={{ fontSize: 14, lineHeight: 20 }}>
                        {meal?.name ?? 'Unavailable meal'}
                      </T>
                      <T muted style={{ fontSize: 11 }}>
                        {menu ? formatDate(menu.service_date) : 'Remove this item to continue'}
                      </T>
                      {!isPhone && (
                        <T bold style={{ color: c.orange }}>
                          {money((meal?.price ?? 0) * line.quantity)}
                        </T>
                      )}
                    </View>
                    {!isPhone && (
                      <Quantity
                        value={line.quantity}
                        onChange={(v) => setQuantity(line.daily_menu_id, v)}
                        max={menu?.quantity ?? 0}
                      />
                    )}
                  </View>
                  {isPhone && (
                    <View style={[s.row, { marginTop: 12, justifyContent: 'space-between' }]}>
                      <T bold style={{ color: c.orangeDark, fontSize: 17 }}>
                        {money((meal?.price ?? 0) * line.quantity)}
                      </T>
                      <Quantity
                        value={line.quantity}
                        onChange={(value) => setQuantity(line.daily_menu_id, value)}
                        max={menu?.quantity ?? 0}
                      />
                    </View>
                  )}
                  {invalid && (
                    <T style={{ color: c.red, fontSize: 11, marginTop: 10 }}>
                      This quantity is no longer available. Reduce it or remove the item.
                    </T>
                  )}
                </View>
              );
            })}
            <View style={s.divider} />
            <Button secondary icon="plus" onPress={() => router.push('/menu')}>
              Add something else
            </Button>
          </View>
          <View
            style={[s.card, { width: twoPane ? 350 : '100%', gap: 14, padding: isPhone ? 16 : 20 }]}
          >
            <T style={s.h2}>Make it your time</T>
            <T muted style={{ fontSize: 11, lineHeight: 18 }}>
              Pickup times account for meal preparation, stock and canteen hours. All times are in
              Manila.
            </T>
            {!slots.length && (
              <T style={{ color: c.orangeDark, fontSize: 12, lineHeight: 20 }}>
                No valid pickup times for this bag. All meals must be scheduled on the same day.
                Check stock or choose a future menu date.
              </T>
            )}
            {dates.map((date) => (
              <View key={date} style={{ gap: 9 }}>
                <T bold style={{ fontSize: 11 }}>
                  {date}
                </T>
                <View style={s.wrap}>
                  {slots
                    .filter((s) => formatDate(s.starts_at, { weekday: 'short' }) === date)
                    .map((slot) => (
                      <Pill
                        key={slot.id}
                        selected={slotId === slot.id}
                        onPress={() => setSlotId(slot.id)}
                      >
                        {time(slot.starts_at)}
                      </Pill>
                    ))}
                </View>
              </View>
            ))}
            <View style={s.divider} />
            <View style={[s.row, { backgroundColor: '#F8F8F2', padding: 14, borderRadius: 12 }]}>
              <Icon name="cash-multiple" color={c.green} />
              <View style={{ flex: 1 }}>
                <T bold style={{ fontSize: 12 }}>
                  Cash on Pickup
                </T>
                <T muted style={{ fontSize: 10, marginTop: 4 }}>
                  Pay at the counter when your meal is ready.
                </T>
              </View>
            </View>
            <View style={[s.row, { justifyContent: 'space-between', marginVertical: 5 }]}>
              <T bold style={{ flex: 1 }}>
                Total to pay at pickup
              </T>
              <T style={{ fontSize: 24, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>
                {money(cartTotal(lines, data))}
              </T>
            </View>
            {!!failure && (
              <T accessibilityRole="alert" style={{ color: c.red, fontSize: 12, lineHeight: 20 }}>
                {failure}
              </T>
            )}
            {!isPhone && (
              <Button
                icon="check-circle-outline"
                disabled={!chosen || !lines.length}
                loading={busy}
                onPress={() => void checkout()}
              >
                Confirm pre-order
              </Button>
            )}
            <T muted style={{ fontSize: 9, lineHeight: 16, textAlign: 'center' }}>
              Stock and prices are checked again when you confirm.{'\n'}No pickup fee. No online
              payment required.
            </T>
          </View>
        </View>
      )}
    </Page>
  );
}
