import React, { useState } from 'react';
import { View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useAuth } from '@/contexts/app';
import { saveSettings, saveSlot } from '@/services/repository';
import { AdminHeader, DataPage, useAction } from '@/components/admin';
import { Button, Input, Pill, Sheet, T, useStyles } from '@/components/ui';
import { useColors } from '@/contexts/appearance';
import type { Settings, Slot, Snapshot } from '@/types';
import { clockTime, dayKey, formatDate, futureDay, time, upcomingSlotsOnDay } from '@/utils/domain';
import { useLayout } from '@/hooks/use-layout';
import { PalettePicker } from '@/components/palette-picker';
function SettingsForm({ settings }: { settings: Settings }) {
  const c = useColors();
  const s = useStyles();
  const { isPhone } = useLayout();
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
      <View
        style={[
          s.row,
          {
            flexDirection: isPhone ? 'column' : 'row',
            alignItems: 'stretch',
            gap: isPhone ? 0 : 12,
          },
        ]}
      >
        <View style={{ flex: isPhone ? undefined : 1 }}>
          <Input
            label="Opening time (HH:MM)"
            value={form.opens_at.slice(0, 5)}
            onChangeText={(opens_at) => setForm({ ...form, opens_at })}
          />
        </View>
        <View style={{ flex: isPhone ? undefined : 1 }}>
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
function SlotEditor({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const c = useColors();
  const s = useStyles();
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [active, setActive] = useState(slot.is_active);
  return (
    <>
      <T style={{ marginBottom: 15 }}>
        {formatDate(slot.starts_at)} · {time(slot.starts_at)} – {time(slot.ends_at)} (Manila time)
      </T>
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
      {!!slot.reserved && (
        <T muted style={{ fontSize: 11, lineHeight: 19, marginBottom: 17 }}>
          This slot has {slot.reserved} reservations. You can close it to new orders or adjust
          capacity; booked pickup times are protected.
        </T>
      )}
      <Button
        loading={busy}
        onPress={() =>
          void run(
            () => saveSlot(slot, Number(capacity), active, user!),
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
  const c = useColors();
  const s = useStyles();
  const [date, setDate] = useState(dayKey());
  const [edit, setEdit] = useState<Slot | null>(null);
  const slots = upcomingSlotsOnDay(data.slots, date);
  return (
    <View style={[s.card, { marginTop: 23 }]}>
      <T style={[s.h2, { marginBottom: 12 }]}>Pickup schedules</T>
      <T muted style={{ marginBottom: 15 }}>
        Pickup slots are scheduled automatically every day from {clockTime(data.settings.opens_at)}{' '}
        to {clockTime(data.settings.closes_at)} (Manila time), in 30-minute intervals.
      </T>
      <View style={[s.wrap, { marginBottom: 18 }]}>
        {Array.from({ length: 7 }, (_, i) => (
          <Pill key={i} selected={date === futureDay(i)} onPress={() => setDate(futureDay(i))}>
            {i === 0 ? 'Today' : formatDate(futureDay(i))}
          </Pill>
        ))}
      </View>
      {!slots.length && <T>No upcoming pickup times for this date.</T>}
      {slots.map((slot) => (
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
      <Sheet visible={!!edit} title="Edit pickup slot" onClose={() => setEdit(null)}>
        {edit && <SlotEditor key={edit.id} slot={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </View>
  );
}
export default function AdminSettings() {
  const s = useStyles();
  return (
    <DataPage>
      {(data) => (
        <>
          <AdminHeader
            title="Your canteen, your way."
            subtitle="Operating hours, pickup schedules and the details that keep things running."
          />
          <View style={[s.card, { maxWidth: 700, marginBottom: 24 }]}>
            <PalettePicker />
          </View>
          <SettingsForm settings={data.settings} />
          <Slots data={data} />
        </>
      )}
    </DataPage>
  );
}
