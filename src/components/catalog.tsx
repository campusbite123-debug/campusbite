import { MotionPressable as Pressable, Reveal } from '@/components/motion';
import React, { useDeferredValue, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useCart, useSnapshot, useToast } from '@/contexts/app';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import {
  cartTotal,
  dayKey,
  errorMessage,
  formatDate,
  futureDay,
  isActive,
  mealFor,
  money,
  upcomingSlotsOnDay,
  validSlots,
} from '@/utils/domain';
import type { Category, DailyMenu, Snapshot } from '@/types';
import {
  Button,
  Empty,
  ErrorState,
  FoodImage,
  Icon,
  Loading,
  Pill,
  Quantity,
  Search,
  Sheet,
  StatusBadge,
  T,
  useStyles,
} from './ui';
import { Page } from './shell';
import { useLayout } from '@/hooks/use-layout';
import { MealCard } from './meal-card';
import { IngredientView } from './ingredient-view';
import { FeaturedBanner } from './featured-banner';
import { PageHeading } from './page-heading';
import { useCartMotion } from '@/contexts/cart-motion';

export function BagPanel({ data, compact = false }: { data: Snapshot; compact?: boolean }) {
  const c = useColors();
  const s = useStyles();

  const { lines, setQuantity } = useCart();
  return (
    <View style={[s.card, { padding: compact ? 18 : 24 }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T style={s.h2}>Your bag</T>
        <View style={{ padding: 7, backgroundColor: c.softAccent, borderRadius: 9 }}>
          <T bold style={{ color: c.ink, fontSize: 11 }}>
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
                    <T bold style={{ color: c.ink, fontSize: 12 }}>
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
              backgroundColor: c.peach,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shopping-outline" size={30} color={c.ink} />
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
        <T style={{ fontSize: 11, color: c.ink }}>Always free</T>
      </View>
      <View style={s.divider} />
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
        <T bold>Total</T>
        <T style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'], fontSize: 23 }}>
          {money(cartTotal(lines, data))}
        </T>
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
function MealCategories({ categories }: { categories: Category[] }) {
  const c = useColors();
  const s = useStyles();

  const { width, fontScale } = useLayout();
  if (!categories.length) return null;
  return (
    <View style={{ marginBottom: 24, gap: 8 }}>
      <PageHeading
        title="Meal categories"
        compact
        style={{ marginBottom: 8 }}
        action={
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View all meals"
            onPress={() => router.push('/menu')}
            style={[s.row, { minHeight: 44, gap: 2 }]}
          >
            <T style={{ color: c.ink, fontSize: 10 }}>View full menu</T>
            <Icon name="arrow-right" size={16} color={c.ink} />
          </Pressable>
        }
      />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 10,
        }}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            accessibilityRole="link"
            accessibilityLabel={cat.name}
            onPress={() => router.push({ pathname: '/menu', params: { category: cat.id } })}
            style={({ pressed }) => [
              s.row,
              {
                width: width / fontScale < 320 ? '100%' : '48.7%',
                minHeight: 51,
                padding: 8,
                gap: 7,
                borderRadius: 13,
                borderWidth: 1,
                backgroundColor: pressed ? c.greenLight : c.white,
                borderColor: c.line,
              },
            ]}
          >
            <View style={{ backgroundColor: c.greenLight, padding: 5, borderRadius: 9 }}>
              <Icon name={cat.icon} color={c.green} size={19} />
            </View>
            <T bold style={{ flex: 1, fontSize: 11 }}>
              {cat.name}
            </T>
            <Icon name="chevron-right" color={c.ink} size={15} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Catalog({
  home = false,
  initialCategory = 'all',
}: {
  home?: boolean;
  initialCategory?: string;
}) {
  const c = useColors();
  const s = useStyles();

  const { isPhone, hasSidebar, contentWidth, fontScale } = useLayout();
  const { user } = useAuth();
  const { data, isLoading, error, refetch, dataUpdatedAt, fetchStatus } = useSnapshot();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const { add, lines } = useCart();
  const { flyToCart } = useCartMotion();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [date, setDate] = useState(dayKey());
  const [sort, setSort] = useState(0);
  const [selected, setSelected] = useState<DailyMenu | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [measuredGridWidth, setMeasuredGridWidth] = useState(0);
  const deferredSearch = useDeferredValue(search);
  const mealIndex = useMemo(
    () => new Map(data?.meals.map((meal) => [meal.id, meal]) ?? []),
    [data?.meals],
  );
  const popularity = useMemo(
    () => new Map(data?.popularity.map((item) => [item.meal_id, item.quantity]) ?? []),
    [data?.popularity],
  );
  const availableMenus = useMemo(
    () =>
      new Set(
        data?.menus
          .filter(
            (menu) =>
              validSlots(data, [{ daily_menu_id: menu.id, quantity: 1 }], dataUpdatedAt).length > 0,
          )
          .map((menu) => menu.id) ?? [],
      ),
    [data, dataUpdatedAt],
  );
  const menus = useMemo(() => {
    if (!data) return [];
    const query = deferredSearch.trim().toLowerCase();
    return data.menus
      .filter((menu) => {
        const meal = mealIndex.get(menu.meal_id);
        return (
          meal &&
          menu.service_date === date &&
          menu.is_available &&
          meal.is_active &&
          (category === 'all' || meal.category_id === category) &&
          (!query || (meal.name + ' ' + meal.description).toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const aa = mealIndex.get(a.meal_id)!,
          bb = mealIndex.get(b.meal_id)!;
        return sort === 1
          ? aa.price - bb.price
          : sort === 2
            ? bb.price - aa.price
            : sort === 3
              ? aa.prep_minutes - bb.prep_minutes
              : (popularity.get(bb.id) ?? 0) - (popularity.get(aa.id) ?? 0) ||
                Number(bb.featured) - Number(aa.featured);
      });
  }, [data, mealIndex, popularity, deferredSearch, category, date, sort]);
  if (isLoading) return <Loading inShell hero={home} label="Loading the menu" />;
  if (!data || (!home && error))
    return <ErrorState message={errorMessage(error)} retry={() => void refetch()} />;
  async function refreshHome() {
    setRefreshing(true);
    try {
      await refetch({ cancelRefetch: false, throwOnError: true });
    } catch {
      toast('Couldn’t refresh Home. Pull down to try again.', { tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  }
  const withRail = home && contentWidth >= 1000;
  const gridWidth = measuredGridWidth || contentWidth - (withRail ? 313 : 0);
  const gridGap = isPhone ? 12 : 16;
  const textScale = Math.max(1, Math.min(fontScale, 1.5));
  const columns =
    gridWidth < 340 * textScale
      ? 1
      : gridWidth < 660 * textScale
        ? 2
        : gridWidth < 1000 * textScale
          ? 3
          : 4;
  const cardWidth = Math.floor((gridWidth - gridGap * (columns - 1)) / columns);
  const active = data.orders
    .filter(isActive)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const daySlots = upcomingSlotsOnDay(data.slots, date, dataUpdatedAt);
  const openSlots = daySlots.filter((slot) => slot.is_active);
  const pickupIssue = !daySlots.length
    ? 'No upcoming pickup times'
    : !openSlots.length
      ? 'Pickup slots closed'
      : openSlots.every((slot) => slot.reserved >= slot.capacity)
        ? 'Pickup slots full'
        : 'Pickup unavailable';
  function viewMeal(menu: DailyMenu) {
    setShowIngredients(false);
    setSelected(menu);
    setDetailsOpen(true);
    setQuantity(1);
  }
  const selectedMeal = selected ? mealFor(selected, data) : null;
  const currentMenu = selected ? data.menus.find((m) => m.id === selected.id) : null;
  const remaining = Math.max(
    0,
    (currentMenu?.quantity ?? 0) -
      (lines.find((l) => l.daily_menu_id === selected?.id)?.quantity ?? 0),
  );
  return (
    <Page
      style={home && !hasSidebar ? { paddingTop: 14 } : undefined}
      refreshControl={
        home ? (
          <RefreshControl
            refreshing={refreshing && fetchStatus !== 'paused'}
            onRefresh={refreshHome}
            colors={[c.ink]}
            tintColor={c.ink}
          />
        ) : undefined
      }
    >
      <View
        style={{
          flexDirection: withRail ? 'row' : 'column',
          gap: 28,
          alignItems: withRail ? 'flex-start' : undefined,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {home ? (
            !search.trim() && (
              <FeaturedBanner
                meals={data.meals.filter((meal) =>
                  data.menus.some(
                    (menu) =>
                      menu.meal_id === meal.id && menu.service_date === date && menu.is_available,
                  ),
                )}
                onExplore={() => router.push('/menu')}
                onView={(meal) => {
                  const menu = data.menus.find(
                    (item) =>
                      item.meal_id === meal.id && item.service_date === date && item.is_available,
                  );
                  if (menu) viewMeal(menu);
                }}
              />
            )
          ) : (
            <PageHeading
              eyebrow={`Hey ${user?.full_name.split(' ')[0]}, let’s eat something good 👋`}
              title="Fresh picks. Happy breaks."
              action={
                gridWidth > 700 && (
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
                    <View
                      style={{ height: 5, width: 5, backgroundColor: c.green, borderRadius: 4 }}
                    />
                    <T style={{ fontSize: 10, color: c.green }}>
                      {data.settings.accepting_orders
                        ? 'Accepting pre-orders'
                        : 'Pre-orders paused'}
                    </T>
                  </View>
                )
              }
            />
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
                color={c.ink}
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
          {home ? (
            !search.trim() && <MealCategories categories={data.categories} />
          ) : (
            <>
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
            </>
          )}
          {home && (
            <View style={{ marginBottom: 18 }}>
              <Search placeholder="Search for a meal" value={search} onChangeText={setSearch} />
            </View>
          )}
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', marginTop: 3, marginBottom: 18, flexWrap: 'wrap' },
            ]}
          >
            <View>
              <T style={s.h2}>
                {home
                  ? search.trim()
                    ? 'Search results'
                    : 'What are you craving today?'
                  : 'The campus menu'}
              </T>
              <T muted style={{ fontSize: 10, marginTop: 5 }}>
                {home && !data.settings.accepting_orders ? 'Pre-orders paused · ' : ''}
                {menus.length}{' '}
                {home
                  ? menus.length === 1
                    ? 'meal'
                    : 'meals'
                  : 'delicious reasons to take a break'}
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSort((sort + 1) % 4)}
              style={[s.row, { gap: 4, minHeight: 44, paddingHorizontal: 6 }]}
            >
              <Icon name="sort-variant" size={16} color={c.muted} />
              <T style={{ fontSize: 10, color: c.muted }}>
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
            <View
              testID="meal-grid"
              onLayout={({ nativeEvent: { layout } }) =>
                setMeasuredGridWidth((current) =>
                  Math.abs(current - layout.width) > 1 ? layout.width : current,
                )
              }
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}
            >
              {menus.map((menu) => {
                const meal = mealFor(menu, data);
                return (
                  <MealCard
                    key={menu.id}
                    width={cardWidth}
                    meal={meal}
                    menu={menu}
                    category={
                      data.categories.find((category) => category.id === meal.category_id)?.name ??
                      'Campus kitchen'
                    }
                    inBag={lines.find((line) => line.daily_menu_id === menu.id)?.quantity ?? 0}
                    acceptingOrders={data.settings.accepting_orders}
                    pickupIssue={availableMenus.has(menu.id) ? null : pickupIssue}
                    onView={() => viewMeal(menu)}
                    onAdd={(from) => {
                      if (add(menu)) flyToCart(meal.image_url, from);
                    }}
                  />
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
                <Icon name="shopping-outline" color={c.ink} size={23} />
                <T bold style={{ fontSize: 14, color: c.ink }}>
                  A better kind of takeaway.
                </T>
              </View>
              <T style={{ color: c.ink, fontSize: 11, lineHeight: 19 }}>
                Order between classes. Pick up at the counter. Get back to what matters.
              </T>
              <View style={{ height: 1, backgroundColor: c.line, marginVertical: 3 }} />
              <View style={s.row}>
                <Icon name="map-marker-outline" color={c.ink} size={17} />
                <T style={{ color: c.ink, fontSize: 10, flex: 1 }}>
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
      <Sheet
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={showIngredients ? 'Ingredients' : 'A closer look'}
        footer={
          showIngredients && selectedMeal ? (
            <Button
              icon="arrow-left"
              style={{ backgroundColor: c.teal, borderColor: c.teal, borderRadius: 14 }}
              onPress={() => setShowIngredients(false)}
            >
              Back to meal
            </Button>
          ) : selectedMeal && currentMenu ? (
            <View style={{ gap: 14 }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <T bold>Quantity</T>
                <Quantity
                  value={quantity}
                  onChange={(value) => setQuantity(Math.max(1, value))}
                  max={remaining}
                />
              </View>
              <Button
                disabled={
                  quantity > remaining ||
                  remaining < 1 ||
                  !validSlots(data, [{ daily_menu_id: currentMenu.id, quantity }]).length
                }
                onPress={(event) => {
                  if (add(currentMenu, quantity)) {
                    flyToCart(selectedMeal.image_url, {
                      x: event.nativeEvent.pageX,
                      y: event.nativeEvent.pageY,
                    });
                    setDetailsOpen(false);
                  }
                }}
                icon="shopping-outline"
              >
                Add to bag · {money(selectedMeal.price * quantity)}
              </Button>
            </View>
          ) : undefined
        }
      >
        {selectedMeal && showIngredients ? (
          <IngredientView meal={selectedMeal} />
        ) : (
          selectedMeal &&
          currentMenu && (
            <Reveal>
              <FoodImage
                uri={selectedMeal.image_url}
                style={{ height: isPhone ? 180 : 230, width: '100%', borderRadius: 16 }}
              />
              <T style={[s.h1, { color: c.ink, fontSize: 25, lineHeight: 34, marginTop: 20 }]}>
                {selectedMeal.name}
              </T>
              <T
                style={{
                  color: c.ink,
                  fontSize: 24,
                  fontFamily: fonts.bold,
                  marginVertical: 10,
                }}
              >
                {money(selectedMeal.price)}
              </T>
              <T muted style={{ lineHeight: 23 }}>
                {selectedMeal.description}
              </T>
              <Button
                small
                secondary
                icon="layers-outline"
                style={{ alignSelf: 'flex-start', marginTop: 12 }}
                onPress={() => setShowIngredients(true)}
              >
                See ingredients
              </Button>
              <View style={[s.row, { marginVertical: 18, flexWrap: 'wrap' }]}>
                <Icon name="clock-outline" color={c.ink} />
                <T>{selectedMeal.prep_minutes} min preparation</T>
                <T muted>· {remaining} available</T>
              </View>
              <T muted style={{ fontSize: 12, marginBottom: 20 }}>
                {formatDate(currentMenu.service_date)} ·{' '}
                {data.categories.find((cat) => cat.id === selectedMeal.category_id)?.name}
              </T>
            </Reveal>
          )
        )}
      </Sheet>
    </Page>
  );
}
