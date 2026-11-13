import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/contexts/app';
import { suspendStudent } from '@/services/repository';
import { AdminHeader, DataPage, useAction } from '@/components/admin';
import { Button, Empty, Input, Search, Sheet, StatusBadge, T, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { formatDate, money } from '@/utils/domain';
export default function Students() {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  return (
    <DataPage>
      {(data) => {
        const students = data.profiles.filter((p) =>
          `${p.full_name} ${p.student_id} ${p.email}`.toLowerCase().includes(search.toLowerCase()),
        );
        const profile = data.profiles.find((p) => p.id === selected);
        const orders = data.orders
          .filter((o) => o.customer_id === selected)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        return (
          <>
            <AdminHeader
              title="The people at our table."
              subtitle="Student accounts, order history and thoughtful account controls."
            />
            <Search
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, student ID or email"
            />
            <View style={{ gap: 12, marginTop: 22 }}>
              {students.map((p) => (
                <View key={p.id} style={[s.card, s.row, { flexWrap: 'wrap' }]}>
                  <View
                    style={{
                      height: 45,
                      width: 45,
                      borderRadius: 16,
                      backgroundColor: c.peach,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <T bold style={{ color: c.orange }}>
                      {p.full_name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')}
                    </T>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, gap: 5 }}>
                    <T bold>{p.full_name}</T>
                    <T muted style={{ fontSize: 11 }}>
                      {p.student_id} · {p.email}
                    </T>
                  </View>
                  <T style={{ fontSize: 11, color: p.is_suspended ? c.red : c.green }}>
                    {p.is_suspended ? 'Suspended' : 'Active'}
                  </T>
                  <Button
                    small
                    secondary
                    onPress={() => {
                      setSelected(p.id);
                      setReason('');
                    }}
                  >
                    View account
                  </Button>
                </View>
              ))}
            </View>
            {!students.length && (
              <Empty
                icon="account-search-outline"
                title="No accounts found"
                text="Try another name, student ID or email."
              />
            )}
            <Sheet visible={!!profile} title="Student account" onClose={() => setSelected('')}>
              {profile && (
                <>
                  <T style={s.h2}>{profile.full_name}</T>
                  <T muted style={{ fontSize: 12, marginTop: 7 }}>
                    {profile.student_id} · {profile.email}
                  </T>
                  <T muted style={{ fontSize: 11, marginTop: 7 }}>
                    Joined {formatDate(profile.created_at)}
                  </T>
                  <View style={s.divider} />
                  <T bold style={{ marginBottom: 15 }}>
                    Order history · {orders.length}
                  </T>
                  {orders.map((o) => (
                    <View key={o.id} style={{ marginBottom: 17, gap: 7 }}>
                      <View style={[s.row, { justifyContent: 'space-between' }]}>
                        <T bold style={{ fontSize: 12 }}>
                          {o.order_number}
                        </T>
                        <T style={{ fontSize: 12 }}>{money(o.total)}</T>
                      </View>
                      <StatusBadge status={o.status} />
                    </View>
                  ))}
                  {!orders.length && (
                    <T muted style={{ fontSize: 12 }}>
                      This account has no orders yet.
                    </T>
                  )}
                  {profile.id !== user?.id && (
                    <>
                      <View style={s.divider} />
                      <T bold style={{ fontSize: 13, marginBottom: 12 }}>
                        {profile.is_suspended ? 'Restore account access' : 'Suspend account access'}
                      </T>
                      <T muted style={{ fontSize: 11, lineHeight: 19, marginBottom: 15 }}>
                        Resolve active orders before suspending a student. Administrator accounts
                        are protected. Every change and its reason is recorded.
                      </T>
                      <Input
                        label="Reason for this account change"
                        value={reason}
                        onChangeText={setReason}
                        maxLength={500}
                      />
                      <Button
                        secondary
                        loading={busy}
                        disabled={reason.trim().length < 3}
                        onPress={() =>
                          void run(
                            () => suspendStudent(profile.id, !profile.is_suspended, reason, user!),
                            'Account status updated.',
                            () => setSelected(''),
                          )
                        }
                      >
                        {profile.is_suspended ? 'Restore account' : 'Suspend account'}
                      </Button>
                    </>
                  )}
                </>
              )}
            </Sheet>
          </>
        );
      }}
    </DataPage>
  );
}
