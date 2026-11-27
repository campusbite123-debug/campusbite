import type { History, Order, SessionUser, Status } from '@/types';

export type OrderNotification = {
  id: string;
  orderId: string;
  orderNumber: string;
  title: string;
  message: string;
  icon: string;
  createdAt: string;
  status: Status;
};

const content: Record<Status, { title: string; icon: string; message: string }> = {
  Pending: {
    title: 'Order received',
    icon: 'receipt-text-outline',
    message: 'has been received. You can follow its progress here.',
  },
  Confirmed: {
    title: 'Order confirmed',
    icon: 'check-circle-outline',
    message: 'has been confirmed by the canteen.',
  },
  Preparing: {
    title: 'Your meal is being prepared',
    icon: 'chef-hat',
    message: 'is being freshly prepared.',
  },
  'Ready for Pickup': {
    title: 'Ready for pickup',
    icon: 'bell-ring-outline',
    message: 'is ready. Open your order for pickup details.',
  },
  Completed: {
    title: 'Pickup completed',
    icon: 'check-circle-outline',
    message: 'has been picked up. Enjoy your meal!',
  },
  Cancelled: {
    title: 'Order cancelled',
    icon: 'close-circle-outline',
    message: 'was cancelled.',
  },
};

const statusRank: Record<Status, number> = {
  Pending: 0,
  Confirmed: 1,
  Preparing: 2,
  'Ready for Pickup': 3,
  Completed: 4,
  Cancelled: 4,
};

const timestamp = (value: string) => Date.parse(value) || 0;

export function orderNotifications(orders: Order[], user: SessionUser): OrderNotification[] {
  const events = new Map<string, OrderNotification>();
  for (const order of orders) {
    // Keep this check even when RLS has already scoped the snapshot.
    if (user.role !== 'ADMIN' && order.customer_id !== user.id) continue;
    const history: History[] = [...order.history];
    if (!history.some((event) => event.status === order.status)) {
      // Older/incomplete snapshots may omit the current status history row.
      // Use the last known event time rather than inventing a new time each fetch.
      const latest = history.reduce(
        (date, event) => (timestamp(event.created_at) > timestamp(date) ? event.created_at : date),
        order.created_at,
      );
      history.push({ status: order.status, created_at: latest });
    }
    for (const event of history) {
      const { status, created_at } = event;
      if (user.role === 'ADMIN' && status !== 'Pending' && status !== 'Cancelled') continue;
      const copy = content[status];
      const id = `${order.id}:${status}:${created_at}`;
      const reason =
        status === 'Cancelled' ? event.reason?.trim() || order.cancellation_reason?.trim() : '';
      const isNewPreorder = user.role === 'ADMIN' && status === 'Pending';
      events.set(id, {
        id,
        orderId: order.id,
        orderNumber: order.order_number,
        title: isNewPreorder ? 'New pre-order' : copy.title,
        message: isNewPreorder
          ? `${order.customer_name} placed order ${order.order_number}. Open it to review the pre-order.`
          : `Order ${order.order_number} ${copy.message}${reason ? ` ${reason}` : ''}`,
        icon: copy.icon,
        createdAt: created_at,
        status,
      });
    }
  }
  return [...events.values()]
    .sort(
      (a, b) =>
        timestamp(b.createdAt) - timestamp(a.createdAt) ||
        statusRank[b.status] - statusRank[a.status] ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 100);
}
