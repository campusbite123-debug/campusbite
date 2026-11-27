import React, { useState } from 'react';
import { View } from 'react-native';
import { Switch } from 'react-native-paper';
import { z } from 'zod';
import { AdminHeader, DataPage, useAction } from '@/components/admin';
import {
  Button,
  Empty,
  FoodImage,
  IconButton,
  Input,
  Pill,
  Search,
  Sheet,
  T,
  useStyles,
} from '@/components/ui';
import { useAuth, useToast } from '@/contexts/app';
import { useColors } from '@/contexts/appearance';
import { saveMeal, scheduleMealDates } from '@/services/repository';
import { pickMealImage } from '@/services/media';
import { mealIngredients } from '@/constants/meal-ingredients';
import type { DailyMenu, Meal, Snapshot } from '@/types';
import { bookablePickup, dayKey, formatDate, futureDay, money } from '@/utils/domain';
function MealEditor({
  meal,
  data,
  onClose,
}: {
  meal: Meal | null;
  data: Snapshot;
  onClose: () => void;
}) {
  const c = useColors();
  const s = useStyles();
  const { user } = useAuth();
  const { busy, run } = useAction();
  const toast = useToast();
  const originalIngredients = meal ? mealIngredients(meal).join('\n') : '';
  const [ingredients, setIngredients] = useState(originalIngredients);
  const [form, setForm] = useState({
    name: meal?.name ?? '',
    description: meal?.description ?? '',
    category_id: meal?.category_id ?? data.categories[0]?.id ?? '',
    price: meal ? String(meal.price / 100) : '',
    prep: String(meal?.prep_minutes ?? 10),
    image_url: meal?.image_url ?? '',
    is_active: meal?.is_active ?? true,
    featured: meal?.featured ?? false,
  });
  const field = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <>
      <Input label="Meal name" value={form.name} onChangeText={(v) => field('name', v)} />
      <Input
        label="Description"
        value={form.description}
        onChangeText={(v) => field('description', v)}
        multiline
      />
      {data.meals.some((item) => 'ingredients' in item) && (
        <Input
          label="Ingredients (one per line)"
          multiline
          value={ingredients}
          onChangeText={setIngredients}
        />
      )}
      <T bold style={{ fontSize: 12, marginBottom: 10 }}>
        Category
      </T>
      <View style={[s.wrap, { marginBottom: 18 }]}>
        {data.categories.map((cat) => (
          <Pill
            key={cat.id}
            selected={form.category_id === cat.id}
            onPress={() => field('category_id', cat.id)}
          >
            {cat.name}
          </Pill>
        ))}
      </View>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Input
            label="Price (PHP)"
            keyboardType="decimal-pad"
            value={form.price}
            onChangeText={(v) => field('price', v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Preparation (minutes)"
            keyboardType="number-pad"
            value={form.prep}
            onChangeText={(v) => field('prep', v)}
          />
        </View>
      </View>
      <Input
        label="Meal photo URL (HTTPS)"
        value={
          form.image_url.startsWith('data:') ? '(Selected photo stored locally)' : form.image_url
        }
        onChangeText={(v) => field('image_url', v)}
        autoCapitalize="none"
      />
      <Button
        secondary
        small
        icon="image-plus"
        onPress={() =>
          void run(async () => {
            const url = await pickMealImage(user!);
            if (url) field('image_url', url);
          }, 'Photo selected.')
        }
      >
        Choose / upload photo
      </Button>
      {!!form.image_url && (
        <FoodImage uri={form.image_url} style={{ height: 140, borderRadius: 12, marginTop: 15 }} />
      )}
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 17 }]}>
        <T>Active on the menu</T>
        <Switch
          color={c.orange}
          value={form.is_active}
          onValueChange={(v) => field('is_active', v)}
        />
      </View>
      <View style={[s.row, { justifyContent: 'space-between', marginVertical: 15 }]}>
        <T>Campus favorite</T>
        <Switch
          color={c.orange}
          value={form.featured}
          onValueChange={(v) => field('featured', v)}
        />
      </View>
      <Button
        loading={busy}
        onPress={() => {
          if (!/^\d+(\.\d{1,2})?$/.test(form.price)) {
            toast('Enter a valid price with up to two decimal places.');
            return;
          }
          void run(
            () =>
              saveMeal(
                {
                  id: meal?.id,
                  name: form.name,
                  description: form.description,
                  ...(ingredients !== originalIngredients ||
                  (meal && 'ingredients' in meal && originalIngredients)
                    ? {
                        ingredients: ingredients
                          .split('\n')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      }
                    : {}),
                  category_id: form.category_id,
                  price: Math.round(Number(form.price) * 100),
                  prep_minutes: Number(form.prep),
                  image_url: form.image_url,
                  is_active: form.is_active,
                  featured: form.featured,
                },
                user!,
              ),
            'Meal saved. Schedule it to offer it to students.',
            onClose,
          );
        }}
      >
        Save meal
      </Button>
    </>
  );
}
function ScheduleEditor({
  meal,
  data,
  onClose,
}: {
  meal: Meal;
  data: Snapshot;
  onClose: () => void;
}) {
  const c = useColors();
  const s = useStyles();
  const { user } = useAuth();
  const { busy, run } = useAction();
  const today = dayKey();
  const menuFor = (date: string) =>
    data.menus.find((m) => m.meal_id === meal.id && m.service_date === date) ?? null;
  // Keep the stock observed when each date was selected, even after a live refresh.
  const [selected, setSelected] = useState<Record<string, DailyMenu | null>>(() => ({
    [today]: menuFor(today),
  }));
  const dates = Object.keys(selected);
  const week = Array.from({ length: 7 }, (_, i) => futureDay(i));
  const choices = [...new Set([...week, ...dates])].sort();
  const [customDate, setCustomDate] = useState('');
  const [dateError, setDateError] = useState('');
  const first = selected[dates[0]];
  const [draft, setDraft] = useState<{
    qty?: string;
    from?: string;
    until?: string;
    available?: boolean;
  }>({});
  const qty = draft.qty ?? String(first?.quantity ?? 30);
  const from =
    draft.from ?? first?.available_from.slice(0, 5) ?? data.settings.opens_at.slice(0, 5);
  const until =
    draft.until ?? first?.available_until.slice(0, 5) ?? data.settings.closes_at.slice(0, 5);
  const available = draft.available ?? first?.is_available ?? true;
  // The pickup RPC returns the upcoming week. Later dates can be planned before their slots are visible.
  const datesWithoutPickup = [...dates].sort().filter((date) => {
    if (!available || !week.includes(date)) return false;
    const service = {
      service_date: date,
      available_from: from + ':00',
      available_until: until + ':00',
      is_available: true,
    };
    return !data.slots.some((slot) =>
      bookablePickup(service, slot, meal.prep_minutes, data.settings),
    );
  });
  function toggleDate(date: string) {
    setSelected((previous) => {
      const next = { ...previous };
      if (date in next) delete next[date];
      else next[date] = menuFor(date);
      return next;
    });
  }
  function addDate() {
    const date = customDate.trim();
    if (!z.iso.date().safeParse(date).success || date < today) {
      setDateError('Enter today or a future date in YYYY-MM-DD format.');
      return;
    }
    if (!(date in selected)) toggleDate(date);
    setCustomDate('');
    setDateError('');
  }
  return (
    <>
      <T style={[s.h2, { marginBottom: 18 }]}>{meal.name}</T>
      <T bold style={{ fontSize: 12, marginBottom: 10 }}>
        Select one or more service dates
      </T>
      <View style={[s.wrap, { marginBottom: 16 }]}>
        {choices.map((date) => (
          <Pill
            key={date}
            selected={date in selected}
            icon={date in selected ? 'check' : undefined}
            onPress={() => toggleDate(date)}
          >
            {date === today
              ? 'Today'
              : formatDate(
                  date,
                  date.slice(0, 4) === today.slice(0, 4) ? undefined : { year: 'numeric' },
                )}
          </Pill>
        ))}
      </View>
      <View style={[s.row, { alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Input
            label="Another service date"
            placeholder="YYYY-MM-DD"
            value={customDate}
            autoCapitalize="none"
            onChangeText={(value) => {
              setCustomDate(value);
              setDateError('');
            }}
            onSubmitEditing={addDate}
            error={dateError}
          />
        </View>
        <Button secondary small disabled={!customDate.trim() || busy} onPress={addDate}>
          Add date
        </Button>
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Input
            label="Available from (24-hour HH:MM)"
            value={from}
            onChangeText={(from) => setDraft({ ...draft, from })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Available until (HH:MM)"
            value={until}
            onChangeText={(until) => setDraft({ ...draft, until })}
          />
        </View>
      </View>
      <Input
        label="Remaining quantity"
        keyboardType="number-pad"
        value={qty}
        onChangeText={(qty) => setDraft({ ...draft, qty })}
      />
      <T muted style={{ fontSize: 11, lineHeight: 19 }}>
        Each selected date gets these hours and this remaining quantity. Existing orders keep their
        reserved quantities.
      </T>
      {datesWithoutPickup.length > 0 && (
        <T style={{ marginTop: 12 }}>
          No pickup time is available for this meal on{' '}
          {datesWithoutPickup.map((date) => formatDate(date)).join(', ')}. You can save this menu.
          For students to order, the meal hours must include an open slot in Settings → Pickup
          schedules.
        </T>
      )}
      <View style={[s.row, { justifyContent: 'space-between', marginVertical: 18 }]}>
        <T>Available to order</T>
        <Switch
          value={available}
          color={c.orange}
          onValueChange={(available) => setDraft({ ...draft, available })}
        />
      </View>
      <Button
        loading={busy}
        disabled={!dates.length || !!customDate.trim()}
        onPress={() =>
          void run(
            async () => {
              if (
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(from) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(until) ||
                from >= until
              )
                throw new Error('Use 24-hour times with an end time after the start time.');
              if (!/^\d+$/.test(qty) || Number(qty) > 10000)
                throw new Error('Enter a whole remaining quantity from 0 to 10,000.');
              await scheduleMealDates(
                {
                  meal_id: meal.id,
                  available_from: from + ':00',
                  available_until: until + ':00',
                  quantity: Number(qty),
                  is_available: available,
                  dates: dates.map((date) => ({
                    service_date: date,
                    expected_quantity: selected[date]?.quantity ?? null,
                    low_stock_threshold: menuFor(date)?.low_stock_threshold ?? 8,
                  })),
                },
                user!,
                (savedDates) => {
                  setDraft({ qty, from, until, available });
                  setSelected((previous) => {
                    const remaining = { ...previous };
                    for (const date of savedDates) delete remaining[date];
                    return remaining;
                  });
                },
              );
            },
            dates.length === 1
              ? 'Daily menu updated.'
              : `Daily menu updated for ${dates.length} dates.`,
            onClose,
          )
        }
      >
        {dates.length > 1 ? `Save for ${dates.length} dates` : 'Save daily menu'}
      </Button>
    </>
  );
}
export default function MenuManagement() {
  const c = useColors();
  const s = useStyles();
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Meal | null | undefined>(undefined);
  const [schedule, setSchedule] = useState<Meal | null>(null);
  return (
    <DataPage>
      {(data) => (
        <>
          <AdminHeader
            title="Good food, on the menu."
            subtitle="Manage your meals and plan what’s cooking each day."
            action={
              <Button small icon="plus" onPress={() => setEdit(null)}>
                Add a meal
              </Button>
            }
          />
          <Search
            value={search}
            onChangeText={setSearch}
            placeholder="Search meals or descriptions"
          />
          <View style={{ gap: 13, marginTop: 22 }}>
            {data.meals
              .filter((m) =>
                `${m.name} ${m.description}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((meal) => (
                <View key={meal.id} style={[s.card, s.row, { flexWrap: 'wrap' }]}>
                  <FoodImage
                    uri={meal.image_url}
                    style={{ width: 76, height: 76, borderRadius: 13 }}
                  />
                  <View style={{ flex: 1, minWidth: 130, gap: 5 }}>
                    <T bold>{meal.name}</T>
                    <T muted style={{ fontSize: 11 }}>
                      {data.categories.find((c) => c.id === meal.category_id)?.name} ·{' '}
                      {meal.prep_minutes} min
                    </T>
                    <T style={{ fontSize: 10, color: meal.is_active ? c.green : c.red }}>
                      {meal.is_active ? 'Active' : 'Archived'} ·{' '}
                      {
                        data.menus.filter(
                          (m) =>
                            m.meal_id === meal.id && m.service_date >= dayKey() && m.is_available,
                        ).length
                      }{' '}
                      days scheduled
                    </T>
                  </View>
                  <T bold style={{ color: c.orange }}>
                    {money(meal.price)}
                  </T>
                  <View style={s.row}>
                    <Button small secondary onPress={() => setSchedule(meal)}>
                      Schedule
                    </Button>
                    <IconButton
                      icon="pencil-outline"
                      label={`Edit ${meal.name}`}
                      onPress={() => setEdit(meal)}
                    />
                  </View>
                </View>
              ))}
          </View>
          {!data.meals.length && (
            <Empty
              title="Let’s put something on the menu"
              text="Add your first meal, then schedule its availability."
            />
          )}
          <Sheet
            visible={edit !== undefined}
            title={edit ? 'Edit meal' : 'Create a new meal'}
            onClose={() => setEdit(undefined)}
          >
            {edit !== undefined && (
              <MealEditor
                key={edit?.id ?? 'new'}
                meal={edit}
                data={data}
                onClose={() => setEdit(undefined)}
              />
            )}
          </Sheet>
          <Sheet visible={!!schedule} title="Plan the daily menu" onClose={() => setSchedule(null)}>
            {schedule && (
              <ScheduleEditor
                key={schedule.id}
                meal={schedule}
                data={data}
                onClose={() => setSchedule(null)}
              />
            )}
          </Sheet>
        </>
      )}
    </DataPage>
  );
}
