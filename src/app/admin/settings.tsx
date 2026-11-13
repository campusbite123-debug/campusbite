import React, { useState } from 'react';
import { View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useAuth } from '@/contexts/app';
import { saveSettings, saveSlot } from '@/services/repository';
import { AdminHeader, DataPage, useAction } from '@/components/admin';
import { Button, Input, Pill, Sheet, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import type { Settings, Slot, Snapshot } from '@/types';
import { dayKey, formatDate, futureDay, time } from '@/utils/domain';
function SettingsForm({ settings }: { settings: Settings }) {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [form, setForm] = useState(settings);
  return (
    <View style={[s.card, { maxWidth: 700 }]}>
      <T style={[s.h2, { marginBottom: 22 }]}>The canteen essentials</T>
      <Input
        label="Canteen name"
        value={form.name}
        onChangeText={(name) => setForm({ ...form, name })}
      />
      <Input
        label="Pickup instructions / location"
        value={form.pickup_location}
        onChangeText={(pickup_location) => setForm({ ...form, pickup_location })}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Input
            label="Opening time (HH:MM)"
            value={form.opens_at.slice(0, 5)}
            onChangeText={(opens_at) => setForm({ ...form, opens_at })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Closing time (HH:MM)"
            value={form.closes_at.slice(0, 5)}
            onChangeText={(closes_at) => setForm({ ...form, closes_at })}
          />
        </View>
      </View>
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
        <T>Accept new pre-orders</T>
        <Switch
          value={form.accepting_orders}
          color={c.orange}
          onValueChange={(accepting_orders) => setForm({ ...form, accepting_orders })}
        />
      </View>
      <Button
        loading={busy}
        onPress={() =>
          void run(async () => {
            if (
              ![form.opens_at, form.closes_at].every((v) =>
                /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(v),
              )
            )
              throw new Error('Use valid 24-hour times, for example 07:00.');
            await saveSettings(
              {
                ...form,
                opens_at: form.opens_at.slice(0, 5) + ':00',
                closes_at: form.closes_at.slice(0, 5) + ':00',
              },
              user!,
            );
          }, 'Canteen settings updated.')
        }
      >
        Save canteen settings
      </Button>
    </View>
  );
}
function SlotEditor({ slot, onClose }: { slot: Slot | null; onClose: () => void }) {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [date, setDate] = useState(slot ? dayKey(new Date(slot.starts_at)) : futureDay(1));
  const [start, setStart] = useState(
    slot
      ? new Date(slot.starts_at).toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '12:00',
  );
  const [end, setEnd] = useState(
    slot
      ? new Date(slot.ends_at).toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '12:30',
  );
  const [capacity, setCapacity] = useState(String(slot?.capacity ?? 20));
  const [active, setActive] = useState(slot?.is_active ?? true);
  return (
    <>
      <Input label="Pickup date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Input label="Starts (HH:MM)" value={start} onChangeText={setStart} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Ends (HH:MM)" value={end} onChangeText={setEnd} />
        </View>
      </View>
      <Input
        label="Maximum orders (1–500)"
        keyboardType="number-pad"
        value={capacity}
        onChangeText={setCapacity}
      />
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
        <T>Slot open for new orders</T>
        <Switch value={active} color={c.orange} onValueChange={setActive} />
      </View>
      {!!slot?.reserved && (
        <T muted style={{ fontSize: 11, lineHeight: 19, marginBottom: 17 }}>
          This slot has {slot.reserved} reservations. You can close it to new orders or adjust
          capacity; booked pickup times are protected.
        </T>
      )}
      <Button
        loading={busy}
        onPress={() =>
          void run(
            async () => {
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                ![start, end].every((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v))
              )
                throw new Error('Check the date and 24-hour times.');
              await saveSlot(
                {
                  id: slot?.id,
                  starts_at: `${date}T${start}:00+08:00`,
                  ends_at: `${date}T${end}:00+08:00`,
                  capacity: Number(capacity),
                  is_active: active,
                },
                user!,
              );
            },
            'Pickup slot saved.',
            onClose,
          )
        }
      >
        Save pickup slot
      </Button>
    </>
  );
}
function Slots({ data }: { data: Snapshot }) {
  const [date, setDate] = useState(dayKey());
  const [edit, setEdit] = useState<Slot | null | undefined>(undefined);
  return (
    <View style={[s.card, { marginTop: 23 }]}>
      <View
        style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 20 }]}
      >
        <T style={s.h2}>Pickup schedules</T>
        <Button small secondary icon="plus" onPress={() => setEdit(null)}>
          Add time slot
        </Button>
      </View>
      <View style={[s.wrap, { marginBottom: 18 }]}>
        {Array.from({ length: 7 }, (_, i) => (
          <Pill key={i} selected={date === futureDay(i)} onPress={() => setDate(futureDay(i))}>
            {i === 0 ? 'Today' : formatDate(futureDay(i))}
          </Pill>
        ))}
      </View>
      {data.slots
        .filter((slot) => dayKey(new Date(slot.starts_at)) === date)
        .map((slot) => (
          <View
            key={slot.id}
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                paddingVertical: 13,
                flexWrap: 'wrap',
                borderTopWidth: 1,
                borderColor: c.line,
              },
            ]}
          >
            <T bold style={{ fontSize: 12 }}>
              {time(slot.starts_at)} – {time(slot.ends_at)}
            </T>
            <T muted style={{ fontSize: 11 }}>
              {slot.reserved} / {slot.capacity} orders · {slot.is_active ? 'Open' : 'Closed'}
            </T>
            <Button small secondary onPress={() => setEdit(slot)}>
              Edit slot
            </Button>
          </View>
        ))}
      <Sheet
        visible={edit !== undefined}
        title={edit ? 'Edit pickup slot' : 'New pickup slot'}
        onClose={() => setEdit(undefined)}
      >
        {edit !== undefined && (
          <SlotEditor key={edit?.id ?? 'new'} slot={edit} onClose={() => setEdit(undefined)} />
        )}
      </Sheet>
    </View>
  );
}
export default function AdminSettings() {
  return (
    <DataPage>
      {(data) => (
        <>
          <AdminHeader
            title="Your canteen, your way."
            subtitle="Operating hours, pickup schedules and the details that keep things running."
          />
          <SettingsForm settings={data.settings} />
          <Slots data={data} />
        </>
      )}
    </DataPage>
  );
}
