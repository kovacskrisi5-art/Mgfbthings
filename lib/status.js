export const ORDER_STATUSES = [
  'received',
  'preparing',
  'baking',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const STATUS_META = {
  received: { label: 'Received', bg: '#fff3e0', color: '#9a4b00' },
  preparing: { label: 'Preparing', bg: '#fff8e1', color: '#8a6500' },
  baking: { label: 'Baking', bg: '#fff1cf', color: '#7a4a00' },
  ready_for_pickup: { label: 'Ready for pickup', bg: '#e8f5e9', color: '#2e6d32' },
  out_for_delivery: { label: 'Out for delivery', bg: '#e3f2fd', color: '#15599a' },
  delivered: { label: 'Delivered', bg: '#ede7f6', color: '#5e3a98' },
  cancelled: { label: 'Cancelled', bg: '#fff0ee', color: '#8d2118' },
};

export const PRODUCTION_STATUSES = ORDER_STATUSES.filter((status) => status !== 'cancelled');

export const REFUND_STATUSES = ['not_required', 'pending', 'refunded', 'failed'];

export const REFUND_META = {
  not_required: { label: 'Not required', bg: '#f5ead9', color: '#765f50' },
  pending: { label: 'Refund pending', bg: '#fff8e1', color: '#8a6500' },
  refunded: { label: 'Refunded', bg: '#e8f5e9', color: '#2e6d32' },
  failed: { label: 'Refund failed', bg: '#fff0ee', color: '#8d2118' },
};

export function statusLabel(status) {
  return STATUS_META[status]?.label || status;
}
