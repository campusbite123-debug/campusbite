import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useCart, useSnapshot } from '@/contexts/app';
import { colors as c, fonts } from '@/constants/theme';
import {
  cartTotal,
  dayKey,
  errorMessage,
  formatDate,
  futureDay,
  isActive,
  mealFor,
  money,
  validSlots,
} from '@/utils/domain';
import type { DailyMenu, Snapshot } from '@/types';
import {
  Button,
  Empty,
  ErrorState,
  FoodImage,
  Icon,
  IconButton,
  Loading,
  Pill,
  Quantity,
  Search,
  Sheet,
  StatusBadge,
  T,
  s,
} from './ui';
import { Page } from './shell';

export function BagPanel({ data, compact = false }: { data: Snapshot; compact?: boolean }) {
  const { lines, setQuantity } = useCart();
  return (
    <View style={[s.card, { padding: compact ? 18 : 24 }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T style={s.h2}>Your bag</T>
        <View style={{ padding: 7, backgroundColor: c.peach, borderRadius: 9 }}>
          <T bold style={{ color: c.orange, fontSize: 11 }}>
            {lines.reduce((n, l) => n + l.quantity, 0)} items
          </T>
        </View>
      </View>
      <T muted style={{ fontSize: 11, marginTop: 6 }}>
        Something delicious is on the way.
      </T>
      {lines.length ? (
        <View style={{ marginTop: 20, gap: 18 }}>
          {lines.map((line) => {
            const menu = data.menus.find((m) => m.id === line.daily_menu_id);
            const meal = data.meals.find((m) => m.id === menu?.meal_id);
            return (
              <View key={line.daily_menu_id} style={[s.row, { alignItems: 'flex-start', gap: 10 }]}>
                {meal && (
                  <FoodImage
                    uri={meal.image_url}
                    style={{ height: 53, width: 53, borderRadius: 11 }}
                  />
                )}
                <View style={{ flex: 1, gap: 7 }}>
                  <T bold style={{ fontSize: 11 }} numberOfLines={2}>
                    {meal?.name ?? 'Meal no longer available'}
                  </T>
                  <View
                    style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }]}
                  >
                    <T bold style={{ color: c.orange, fontSize: 12 }}>
                      {money((meal?.price ?? 0) * line.quantity)}
                    </T>
                    <Quantity
                      value={line.quantity}
                      max={menu?.quantity ?? 0}
                      onChange={(v) => setQuantity(line.daily_menu_id, v)}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 24,
              backgroundColor: '#F6F5EF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shopping-outline" size={30} color="#B9B9A6" />
          </View>
          <T bold style={{ fontSize: 13 }}>
            A good meal starts here
          </T>
          <T muted style={{ fontSize: 11, textAlign: 'center', lineHeight: 18 }}>
            Pick your favorites from the menu.{'\n'}We’ll take care of lunch.
          </T>
        </View>
      )}
      <View style={s.divider} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T muted style={{ fontSize: 12 }}>
          Subtotal
        </T>
        <T bold>{money(cartTotal(lines, data))}</T>
      </View>
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 11 }]}>
        <T muted style={{ fontSize: 12 }}>
          Pickup fee
        </T>
        <T style={{ fontSize: 11, color: c.green }}>Always free</T>
      </View>
      <View style={s.divider} />
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
        <T bold>Total</T>
        <T style={{ fontFamily: fonts.display, fontSize: 23 }}>{money(cartTotal(lines, data))}</T>
      </View>
      <Button disabled={!lines.length} onPress={() => router.push('/cart')} icon="arrow-right">
        Choose pickup time
      </Button>
      <View style={[s.row, { justifyContent: 'center', gap: 5, marginTop: 13 }]}>
        <Icon name="cash-multiple" color={c.muted} size={15} />
        <T muted style={{ fontSize: 10 }}>
          Pay cash when you pick up
        </T>
      </View>
    </View>
  );
}
export function Catalog({ home = false }: { home?: boolean }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useSnapshot();
  const { add, lines } = useCart();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [date, setDate] = useState(dayKey());
  const [sort, setSort] = useState(0);
  const [selected, setSelected] = useState<DailyMenu | null>(null);
  const [quantity, setQuantity] = useState(1);
  if (isLoading) return <Loading />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} retry={() => void refetch()} />;
  const withRail = home && width >= 1280;
  const columns = width < 600 ? 2 : width < 1000 ? 3 : withRail ? 3 : 4;
  const popularity = new Map<string, number>();
  data.popularity.forEach((item) => popularity.set(item.meal_id, item.quantity));
  const menus = data.menus
    .filter((m) => {
      const meal = mealFor(m, data);
      return (
        m.service_date === date &&
        m.is_available &&
        meal.is_active &&
        (category === 'all' || meal.category_id === category) &&
        `${meal.name} ${meal.description}`.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aa = mealFor(a, data),
        bb = mealFor(b, data);
      return sort === 1
        ? aa.price - bb.price
        : sort === 2
          ? bb.price - aa.price
          : sort === 3
            ? aa.prep_minutes - bb.prep_minutes
            : (popularity.get(bb.id) ?? 0) - (popularity.get(aa.id) ?? 0) ||
              Number(bb.featured) - Number(aa.featured);
    });
  const active = data.orders
    .filter(isActive)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const selectedMeal = selected ? mealFor(selected, data) : null;
  const currentMenu = selected ? data.menus.find((m) => m.id === selected.id) : null;
  const remaining = Math.max(
    0,
    (currentMenu?.quantity ?? 0) -
      (lines.find((l) => l.daily_menu_id === selected?.id)?.quantity ?? 0),
  );
  return (
    <Page>
      <View
        style={{
          flexDirection: withRail ? 'row' : 'column',
          gap: 28,
          alignItems: withRail ? 'flex-start' : undefined,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 22 }]}>
            <View>
              <T muted style={{ fontSize: 12, marginBottom: 6 }}>
                Hey {user?.full_name.split(' ')[0]}, let’s eat something good 👋
              </T>
              <T style={[s.h1, { fontSize: width < 600 ? 26 : 32 }]}>
                {home ? 'What are you craving today?' : 'Fresh picks. Happy breaks.'}
              </T>
            </View>
            {width > 700 && (
              <View
                style={[
                  s.row,
                  {
                    gap: 5,
                    padding: 9,
                    backgroundColor: data.settings.accepting_orders ? c.greenLight : c.peach,
                    borderRadius: 8,
                  },
                ]}
              >
                <View style={{ height: 5, width: 5, backgroundColor: c.green, borderRadius: 4 }} />
                <T style={{ fontSize: 10, color: c.green }}>
                  {data.settings.accepting_orders ? 'Accepting pre-orders' : 'Pre-orders paused'}
                </T>
              </View>
            )}
          </View>
          {home && (
            <View
              style={{
                backgroundColor: '#FEE9D8',
                borderRadius: 22,
                overflow: 'hidden',
                minHeight: width < 600 ? 235 : 250,
                marginBottom: 26,
                flexDirection: 'row',
              }}
            >
              <View
                style={{
                  width: '62%',
                  padding: width < 600 ? 21 : 29,
                  paddingRight: 0,
                  zIndex: 1,
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    borderRadius: 20,
                    backgroundColor: '#FFF8EF',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    marginBottom: 14,
                  }}
                >
                  <T bold style={{ fontSize: 8, letterSpacing: 1.3, color: c.orangeDark }}>
                    YOUR BREAK, MADE BETTER
                  </T>
                </View>
                <T
                  style={{
                    fontFamily: fonts.display,
                    fontSize: width < 600 ? 28 : 38,
                    lineHeight: width < 600 ? 34 : 44,
                    letterSpacing: -1.4,
                  }}
                >
                  Skip the line.{'\n'}
                  <T
                    style={{
                      fontFamily: fonts.display,
                      color: c.orangeDark,
                      fontSize: width < 600 ? 28 : 38,
                    }}
                  >
                    Savor the break.
                  </T>
                </T>
                <T
                  style={{
                    fontSize: 11,
                    color: '#967B66',
                    lineHeight: 18,
                    marginTop: 12,
                    maxWidth: width < 600 ? 155 : 245,
                  }}
                >
                  {width < 600
                    ? 'Fresh favorites, zero queues.\nMade for your break.'
                    : 'Your campus favorites, freshly made.\nPre-order now. Pick up on your time.'}
                </T>
                <Button
                  small
                  onPress={() => router.push('/menu')}
                  style={{ marginTop: 19 }}
                  icon="arrow-right"
                >
                  Explore the menu
                </Button>
              </View>
              <View
                style={{
                  position: 'absolute',
                  width: '49%',
                  right: '-6%',
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: width < 600 ? 200 : 280,
                    height: width < 600 ? 200 : 280,
                    borderRadius: 150,
                    backgroundColor: '#F9C79E',
                    padding: 13,
                    transform: [{ rotate: '-12deg' }],
                  }}
                >
                  <FoodImage
                    uri={
                      data.meals.find((m) => m.featured)?.image_url ??
                      data.meals[0]?.image_url ??
                      ''
                    }
                    style={{ height: '100%', width: '100%', borderRadius: 150 }}
                  />
                </View>
                <View
                  style={{
                    position: 'absolute',
                    left: -12,
                    bottom: 26,
                    backgroundColor: c.white,
                    borderRadius: 12,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    transform: [{ rotate: '-6deg' }],
                  }}
                >
                  <Icon name="clock-fast" color={c.orange} size={23} />
                  <View>
                    <T bold style={{ fontSize: 10 }}>
                      Made for your schedule
                    </T>
                    <T muted style={{ fontSize: 8, marginTop: 2 }}>
                      Fresh food. No long queues.
                    </T>
                  </View>
                </View>
              </View>
            </View>
          )}
          {active && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/orders', params: { id: active.id } })}
              style={[
                s.row,
                {
                  backgroundColor: active.status === 'Ready for Pickup' ? c.greenLight : c.peach,
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 24,
                  justifyContent: 'space-between',
                },
              ]}
            >
              <Icon
                name={active.status === 'Ready for Pickup' ? 'bell-ring-outline' : 'chef-hat'}
                color={c.orange}
              />
              <View style={{ flex: 1 }}>
                <T bold style={{ fontSize: 12 }}>
                  {active.status === 'Ready for Pickup'
                    ? 'Your food is ready! Come say hello.'
                    : 'Your next good meal is in the works'}
                </T>
                <T muted style={{ fontSize: 10, marginTop: 4 }}>
                  {active.order_number} · Tap to track your order
                </T>
              </View>
              <StatusBadge status={active.status} />
            </Pressable>
          )}
          <Search value={search} onChangeText={setSearch} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 19 }}
          >
            <Pill
              selected={category === 'all'}
              onPress={() => setCategory('all')}
              icon="silverware-fork-knife"
            >
              All meals
            </Pill>
            {data.categories.map((cat) => (
              <Pill
                key={cat.id}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                icon={cat.icon}
              >
                {cat.name}
              </Pill>
            ))}
          </ScrollView>
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', marginTop: 3, marginBottom: 18, flexWrap: 'wrap' },
            ]}
          >
            <View>
              <T style={s.h2}>{home ? 'Made fresh, loved on campus' : 'The campus menu'}</T>
              <T muted style={{ fontSize: 10, marginTop: 5 }}>
                {menus.length} delicious reasons to take a break
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSort((sort + 1) % 4)}
              style={[s.row, { gap: 4 }]}
            >
              <Icon name="sort-variant" size={16} color={c.muted} />
              <T style={{ fontSize: 10, color: '#686D62' }}>
                {
                  ['Popular picks', 'Price: low to high', 'Price: high to low', 'Quickest first'][
                    sort
                  ]
                }
              </T>
              <Icon name="chevron-down" size={14} color={c.muted} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingBottom: 17 }}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <Pill key={i} selected={date === futureDay(i)} onPress={() => setDate(futureDay(i))}>
                {i === 0
                  ? 'Today'
                  : i === 1
                    ? 'Tomorrow'
                    : formatDate(futureDay(i), { weekday: 'short' })}
              </Pill>
            ))}
          </ScrollView>
          {!menus.length ? (
            <Empty
              title="A fresh menu is on its way"
              text={
                search
                  ? 'Try another search or category.'
                  : 'There are no meals scheduled for this day. Try a different day.'
              }
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {menus.map((menu) => {
                const meal = mealFor(menu, data);
                const soldOut = menu.quantity <= 0;
                return (
                  <View
                    key={menu.id}
                    style={{
                      width: `${100 / columns - (columns === 2 ? 2.5 : 2)}%`,
                      flexGrow: 1,
                      maxWidth: columns === 2 ? '49%' : `${100 / columns}%`,
                      backgroundColor: c.white,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: c.line,
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${meal.name}`}
                      onPress={() => {
                        setSelected(menu);
                        setQuantity(1);
                      }}
                    >
                      <FoodImage
                        uri={meal.image_url}
                        style={{
                          height: width < 600 ? 134 : 155,
                          width: '100%',
                          opacity: soldOut ? 0.5 : 1,
                        }}
                      />
                      {meal.featured && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 11,
                            left: 11,
                            paddingVertical: 5,
                            paddingHorizontal: 8,
                            backgroundColor: '#FFF9EF',
                            borderRadius: 7,
                          }}
                        >
                          <T bold style={{ fontSize: 8, color: c.orangeDark }}>
                            ✦ CAMPUS FAVORITE
                          </T>
                        </View>
                      )}
                      <View style={{ padding: width < 600 ? 12 : 16, paddingBottom: 8 }}>
                        <T
                          bold
                          style={{ fontSize: width < 600 ? 12 : 13, minHeight: 34 }}
                          numberOfLines={2}
                        >
                          {meal.name}
                        </T>
                        <T
                          muted
                          style={{ fontSize: 10, lineHeight: 16, marginTop: 3 }}
                          numberOfLines={1}
                        >
                          {meal.description}
                        </T>
                        <View style={[s.row, { gap: 5, marginTop: 10 }]}>
                          <Icon name="clock-outline" size={12} color={c.muted} />
                          <T muted style={{ fontSize: 9 }}>
                            {meal.prep_minutes} min
                          </T>
                          <T muted style={{ fontSize: 9 }}>
                            {' '}
                            ·{' '}
                          </T>
                          <T
                            style={{
                              fontSize: 9,
                              color: soldOut
                                ? c.red
                                : menu.quantity <= menu.low_stock_threshold
                                  ? c.orangeDark
                                  : c.green,
                            }}
                          >
                            {soldOut ? 'Sold out' : `${menu.quantity} left today`}
                          </T>
                        </View>
                      </View>
                    </Pressable>
                    <View
                      style={[
                        s.row,
                        {
                          justifyContent: 'space-between',
                          padding: width < 600 ? 12 : 16,
                          paddingTop: 4,
                        },
                      ]}
                    >
                      <T style={{ color: c.orangeDark, fontFamily: fonts.bold, fontSize: 19 }}>
                        {money(meal.price)}
                      </T>
                      <IconButton
                        icon="plus"
                        label={`Add ${meal.name} to bag`}
                        color={c.white}
                        disabled={
                          soldOut ||
                          !data.settings.accepting_orders ||
                          !validSlots(data, [{ daily_menu_id: menu.id, quantity: 1 }]).length
                        }
                        onPress={() => add(menu)}
                        style={{
                          width: 31,
                          height: 31,
                          borderRadius: 10,
                          backgroundColor: c.orange,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={[s.row, { justifyContent: 'center', marginTop: 30, gap: 7 }]}>
            <Icon name="heart-outline" size={13} color={c.muted} />
            <T muted style={{ fontSize: 10 }}>
              Freshly prepared, fairly priced, made for campus life.
            </T>
          </View>
        </View>
        {withRail && (
          <View style={{ width: 285, gap: 19 }}>
            <BagPanel data={data} compact />
            <View style={{ borderRadius: 17, backgroundColor: c.greenLight, padding: 22, gap: 11 }}>
              <View style={[s.row, { gap: 9 }]}>
                <Icon name="shopping-outline" color={c.green} size={23} />
                <T bold style={{ fontSize: 14, color: '#4F6741' }}>
                  A better kind of takeaway.
                </T>
              </View>
              <T style={{ color: '#829174', fontSize: 11, lineHeight: 19 }}>
                Order between classes. Pick up at the counter. Get back to what matters.
              </T>
              <View style={{ height: 1, backgroundColor: '#DBE4D1', marginVertical: 3 }} />
              <View style={s.row}>
                <Icon name="map-marker-outline" color={c.green} size={17} />
                <T style={{ color: '#6D7D62', fontSize: 10, flex: 1 }}>
                  {data.settings.pickup_location}
                </T>
              </View>
            </View>
            <T muted style={{ fontSize: 9, textAlign: 'center', lineHeight: 16 }}>
              A full plate. A little more time.{'\n'}That’s the campusbite way.
            </T>
          </View>
        )}
      </View>
      <Sheet visible={!!selected} onClose={() => setSelected(null)} title="A closer look">
        {selectedMeal && currentMenu && (
          <>
            <FoodImage
              uri={selectedMeal.image_url}
              style={{ height: 230, width: '100%', borderRadius: 16 }}
            />
            <T style={[s.h1, { fontSize: 25, marginTop: 20 }]}>{selectedMeal.name}</T>
            <T
              style={{ color: c.orange, fontSize: 24, fontFamily: fonts.bold, marginVertical: 10 }}
            >
              {money(selectedMeal.price)}
            </T>
            <T muted style={{ lineHeight: 23 }}>
              {selectedMeal.description}
            </T>
            <View style={[s.row, { marginVertical: 18 }]}>
              <Icon name="clock-outline" color={c.orange} />
              <T>{selectedMeal.prep_minutes} min preparation</T>
              <T muted>· {remaining} available</T>
            </View>
            <T muted style={{ fontSize: 12, marginBottom: 20 }}>
              {formatDate(currentMenu.service_date)} ·{' '}
              {data.categories.find((cat) => cat.id === selectedMeal.category_id)?.name}
            </T>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
              <T bold>Quantity</T>
              <Quantity
                value={quantity}
                onChange={(v) => setQuantity(Math.max(1, v))}
                max={remaining}
              />
            </View>
            <Button
              disabled={
                quantity > remaining ||
                remaining < 1 ||
                !validSlots(data, [{ daily_menu_id: currentMenu.id, quantity }]).length
              }
              onPress={() => {
                add(currentMenu, quantity);
                setSelected(null);
              }}
              icon="shopping-outline"
            >
              Add to bag · {money(selectedMeal.price * quantity)}
            </Button>
          </>
        )}
      </Sheet>
    </Page>
  );
}
