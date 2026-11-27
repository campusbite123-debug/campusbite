import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSnapshot, useToast } from '@/contexts/app';
import type { SessionUser } from '@/types';
import { orderNotifications } from '@/utils/order-notifications';

async function savedReadIds(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  const ids: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
    throw new Error('Invalid saved notification state');
  return ids.slice(-2000);
}

// The header mounts this hook in a component keyed by account ID. Storage is
// scoped to that same account, so read state cannot follow another sign-in.
export function useNotificationInbox(user: SessionUser) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const writes = useRef(Promise.resolve());
  const storageKey = `notification-reads-v1:${user.id}`;
  const notifications = useMemo(
    () => orderNotifications(snapshot.data?.orders ?? [], user),
    [snapshot.data?.orders, user],
  );
  useEffect(() => {
    let active = true;
    void savedReadIds(storageKey)
      .then((ids) => {
        if (active) setReadIds(new Set(ids));
      })
      .catch(() => {
        if (active) toast('Saved notification read status could not be loaded on this device.');
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey, toast]);
  function markRead(ids: string[]) {
    const unread = ids.filter((id) => !readIds.has(id));
    if (!hydrated || !unread.length) return;
    setReadIds((previous) => new Set([...previous, ...unread]));
    // Only an explicit read writes to storage. Merge with the saved IDs so
    // even a failed initial load cannot clear this account's earlier reads.
    writes.current = writes.current
      .then(async () => {
        const saved = await savedReadIds(storageKey);
        const merged = [...new Set([...saved, ...unread])].slice(-2000);
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      })
      .catch(() => toast('Notification read status could not be saved on this device.'));
  }
  return {
    notifications,
    unreadCount: hydrated
      ? notifications.filter((notification) => !readIds.has(notification.id)).length
      : 0,
    isRead: (id: string) => readIds.has(id),
    markRead,
    markAllRead: () => markRead(notifications.map((notification) => notification.id)),
    loading: !hydrated || snapshot.isLoading,
    error: snapshot.error,
    hasData: !!snapshot.data,
    refresh: () => void snapshot.refetch(),
  };
}
