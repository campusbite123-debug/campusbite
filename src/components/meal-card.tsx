import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors as c, fonts } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import type { DailyMenu, Meal } from '@/types';
import { money } from '@/utils/domain';
import { FoodImage, Icon, T } from './ui';

export function MealCard({
  meal,
  menu,
  category,
  width,
  inBag,
  acceptingOrders,
  orderable,
  onView,
  onAdd,
}: {
  meal: Meal;
  menu: DailyMenu;
  category: string;
  width: number;
  inBag: number;
  acceptingOrders: boolean;
  orderable: boolean;
  onView: () => void;
  onAdd: () => void;
}) {
  const { fontScale } = useLayout();
  const roomy = width >= 240;
  const soldOut = menu.quantity <= 0;
  const atLimit = inBag >= Math.min(menu.quantity, 99);
  const disabled = soldOut || !acceptingOrders || !orderable || atLimit;
  const status = soldOut
    ? 'Sold out today'
    : !acceptingOrders
      ? 'Pre-orders paused'
      : !orderable
        ? 'Pickup unavailable'
        : `${menu.quantity} left today`;
  const statusColor = soldOut
    ? c.red
    : !acceptingOrders || !orderable
      ? '#7C8077'
      : menu.quantity <= menu.low_stock_threshold
        ? c.orangeDark
        : '#53763E';
  const addLabel = soldOut
    ? 'Sold out'
    : !acceptingOrders
      ? 'Paused'
      : !orderable
        ? 'Closed'
        : atLimit
          ? 'Added'
          : 'Add';

  return (
    <View testID="meal-card" style={[styles.card, { width }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${meal.name}`}
        accessibilityHint="View meal details and choose a quantity."
        onPress={onView}
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View style={[styles.photo, { aspectRatio: roomy ? 1.35 : 1.2 }]}>
          <FoodImage
            uri={meal.image_url}
            style={{ width: '100%', height: '100%', opacity: soldOut ? 0.5 : 1 }}
          />
          {meal.featured && !soldOut && (
            <View style={styles.favorite}>
              <Icon name="star-four-points" size={11} color={c.orangeDark} />
              <T style={styles.favoriteText}>Campus pick</T>
            </View>
          )}
          {inBag > 0 && (
            <View style={styles.inBag} accessibilityLabel={`${inBag} in your bag`}>
              <Icon name="shopping-outline" size={12} color={c.white} />
              <T testID="meal-in-bag-count" style={styles.inBagText}>
                {inBag}
              </T>
            </View>
          )}
          <View style={styles.prep}>
            <Icon name="clock-outline" size={12} color="#5C6356" />
            <T style={styles.prepText}>{meal.prep_minutes} min</T>
          </View>
        </View>
        <View style={styles.details}>
          <T numberOfLines={1} style={styles.category}>
            {category}
          </T>
          <T
            numberOfLines={2}
            style={[
              styles.name,
              { fontSize: roomy ? 16 : 14, minHeight: 40 * Math.max(1, fontScale) },
            ]}
          >
            {meal.name}
          </T>
          {roomy && (
            <T
              muted
              numberOfLines={2}
              style={[styles.description, { minHeight: 36 * Math.max(1, fontScale) }]}
            >
              {meal.description}
            </T>
          )}
          <View style={styles.status}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <T style={[styles.statusText, { color: statusColor }]}>{status}</T>
          </View>
        </View>
      </Pressable>
      <View style={styles.footer}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.price, { fontSize: roomy ? 23 : 20 }]}
          >
            {money(meal.price)}
          </T>
          <T style={styles.priceCaption}>per serving</T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${meal.name} to bag`}
          accessibilityHint={inBag > 0 ? `${inBag} already in your bag.` : undefined}
          disabled={disabled}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            {
              backgroundColor: disabled ? '#F0F0EA' : c.orange,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {!disabled && <Icon name="plus" size={16} color={c.white} />}
          {atLimit && !soldOut && acceptingOrders && orderable && (
            <Icon name="check" size={15} color="#72786B" />
          )}
          <T style={[styles.addText, disabled && { color: '#72786B' }]}>{addLabel}</T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 8,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#EDE9E1',
    backgroundColor: c.white,
    boxShadow: '0px 3px 14px rgba(36, 43, 36, 0.045)',
  },
  photo: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: c.line },
  favorite: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFCF5',
  },
  favoriteText: { fontFamily: fonts.semibold, color: c.orangeDark, fontSize: 9, lineHeight: 12 },
  inBag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: c.orange,
  },
  inBagText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, color: c.white },
  prep: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: '#FFFEF8F2',
  },
  prepText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 12, color: '#5C6356' },
  details: { paddingHorizontal: 5, paddingTop: 12 },
  category: {
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 13,
    color: '#818579',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: fonts.semibold,
    color: c.ink,
    lineHeight: 20,
    letterSpacing: -0.25,
    marginTop: 5,
  },
  description: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  status: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 8 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, flexShrink: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 5,
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderColor: '#F1F0E9',
  },
  price: {
    fontFamily: fonts.bold,
    lineHeight: 28,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    color: c.ink,
  },
  priceCaption: { fontSize: 9, lineHeight: 12, color: '#818579' },
  add: {
    minWidth: 70,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: c.white },
});
