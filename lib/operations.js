/**
 * @typedef {'received'|'preparing'|'baking'|'ready_for_pickup'|'out_for_delivery'|'delivered'|'cancelled'} OrderStatus
 * @typedef {'not_required'|'pending'|'refunded'|'failed'} RefundStatus
 * @typedef {'fresh_today'|'leftover_stock'|'frozen'|'pre_order'} InventoryCategory
 *
 * @typedef {Object} OrderItem
 * @property {string} product_name
 * @property {number} quantity
 *
 * @typedef {Object} Order
 * @property {string} id
 * @property {OrderStatus} status
 * @property {'pickup'|'delivery'} fulfillment_method
 * @property {string=} production_date
 * @property {OrderItem[]=} order_items
 *
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} stock_quantity
 * @property {InventoryCategory} inventory_category
 * @property {boolean} is_ready_now
 * @property {number} low_stock_threshold
 */

export function isActiveOrder(order) {
  return order?.status !== 'cancelled';
}

export function isAvailableNow(product) {
  return (
    product?.active !== false &&
    product?.is_ready_now &&
    Number(product?.stock_quantity || 0) > 0 &&
    ['fresh_today', 'leftover_stock', 'frozen'].includes(product?.inventory_category)
  );
}

export function isLowStock(product) {
  const quantity = Number(product?.stock_quantity || 0);
  return quantity > 0 && quantity <= Number(product?.low_stock_threshold || 4);
}

export function stockLabel(quantity) {
  const count = Number(quantity || 0);
  if (count <= 0) return 'Sold out';
  return count <= 3 ? `Only ${count} left` : `${count} available now`;
}

export function pickupReadyLabel(minutes) {
  const value = Number(minutes || 0);
  if (value === 0) return 'Ready now';
  if (value === 15) return 'Ready in 15 min';
  if (value === 60) return 'Ready in 1 hour';
  return `Ready in ${value} min`;
}

export function categoryLabel(category) {
  const labels = {
    fresh_today: 'Fresh today',
    leftover_stock: 'Leftover stock',
    frozen: 'Frozen',
    pre_order: 'Pre-order',
  };
  return labels[category] || 'Pre-order';
}

export function orderLifecycle(order) {
  if (order.status === 'cancelled') {
    return {
      label: 'Cancelled',
      description: 'Kept in records, excluded from production totals.',
      action: 'Review cancellation and refund state',
    };
  }

  const states = {
    received: ['Received', 'Order is paid or pending and waiting for bakery review.', 'Confirm ingredients and production date'],
    preparing: ['Preparing', 'Order has moved into prep.', 'Prepare dough or reserve ready stock'],
    baking: ['Baking', 'Order is in active production.', 'Bake and cool'],
    ready_for_pickup: ['Ready for pickup', 'Packed and ready at the bakery.', 'Notify customer'],
    out_for_delivery: ['Out for delivery', 'Order has left the bakery.', 'Monitor delivery'],
    delivered: ['Delivered', 'Order is complete.', 'No action needed'],
  };
  const [label, description, action] = states[order.status] || states.received;
  return { label, description, action };
}

export function dailyProductTotals(orders, date) {
  const totals = new Map();
  orders
    .filter((order) => isActiveOrder(order) && (!date || order.production_date === date))
    .forEach((order) => {
      (order.order_items || []).forEach((item) => {
        totals.set(item.product_name, (totals.get(item.product_name) || 0) + Number(item.quantity || 0));
      });
    });

  return Array.from(totals, ([name, quantity]) => ({ name, quantity })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function upcomingWeekdays(start = new Date(), count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      iso: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      weekday: date.toLocaleDateString('en-GB', { weekday: 'long' }),
    };
  });
}
