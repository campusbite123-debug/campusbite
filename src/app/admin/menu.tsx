import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Switch } from 'react-native-paper';
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
  s,
} from '@/components/ui';
import { useAuth, useToast } from '@/contexts/app';
import { colors as c } from '@/constants/theme';
import { saveMeal, scheduleMeal } from '@/services/repository';
import { pickMealImage } from '@/services/media';
import type { Meal, Snapshot } from '@/types';
import { dayKey, formatDate, futureDay, money } from '@/utils/domain';
function MealEditor({
  meal,
  data,
  onClose,
}: {
  meal: Meal | null;
  data: Snapshot;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const toast = useToast();
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
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [date, setDate] = useState(dayKey());
  const existing = data.menus.find((m) => m.meal_id === meal.id && m.service_date === date);
  const [qty, setQty] = useState(String(existing?.quantity ?? 30));
  const [expectedQuantity, setExpectedQuantity] = useState(existing?.quantity);
  const [from, setFrom] = useState(existing?.available_from.slice(0, 5) ?? '07:00');
  const [until, setUntil] = useState(existing?.available_until.slice(0, 5) ?? '20:00');
  const [available, setAvailable] = useState(existing?.is_available ?? true);
  function selectDate(v: string) {
    setDate(v);
    const m = data.menus.find((m) => m.meal_id === meal.id && m.service_date === v);
    setQty(String(m?.quantity ?? 30));
    setExpectedQuantity(m?.quantity);
    setFrom(m?.available_from.slice(0, 5) ?? '07:00');
    setUntil(m?.available_until.slice(0, 5) ?? '20:00');
    setAvailable(m?.is_available ?? true);
  }
  return (
    <>
      <T style={[s.h2, { marginBottom: 18 }]}>{meal.name}</T>
      <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 17 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Pill key={i} selected={date === futureDay(i)} onPress={() => selectDate(futureDay(i))}>
            {i === 0 ? 'Today' : formatDate(futureDay(i))}
          </Pill>
        ))}
      </ScrollView>
      <Input label="Service date (YYYY-MM-DD)" value={date} onChangeText={selectDate} />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Input label="Available from (24-hour HH:MM)" value={from} onChangeText={setFrom} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Available until (HH:MM)" value={until} onChangeText={setUntil} />
        </View>
      </View>
      <Input
        label="Remaining quantity"
        keyboardType="number-pad"
        value={qty}
        onChangeText={setQty}
      />
      <T muted style={{ fontSize: 11, lineHeight: 19 }}>
        This replaces the remaining stock for this date. Existing orders keep their reserved
        quantities.
      </T>
      <View style={[s.row, { justifyContent: 'space-between', marginVertical: 18 }]}>
        <T>Available to order</T>
        <Switch value={available} color={c.orange} onValueChange={setAvailable} />
      </View>
      <Button
        loading={busy}
        onPress={() =>
          void run(
            async () => {
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(from) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(until)
              )
                throw new Error('Use a valid date and 24-hour times.');
              await scheduleMeal(
                {
                  meal_id: meal.id,
                  service_date: date,
                  available_from: from + ':00',
                  available_until: until + ':00',
                  quantity: Number(qty),
                  low_stock_threshold: existing?.low_stock_threshold ?? 8,
                  is_available: available,
                },
                user!,
                expectedQuantity,
              );
            },
            'Daily menu updated.',
            onClose,
          )
        }
      >
        Save daily menu
      </Button>
    </>
  );
}
export default function MenuManagement() {
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
