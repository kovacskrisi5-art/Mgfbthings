export function productionDateFor(dayName, fromDate = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const target = days.indexOf(dayName);
  if (target === -1) return fromDate.toISOString().slice(0, 10);

  const date = new Date(fromDate);
  date.setHours(12, 0, 0, 0);
  const delta = (target - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function isLastMinuteCancellation(order) {
  if (order.status !== 'cancelled' || !order.cancelled_at || !order.production_date) return false;
  const cancelledAt = new Date(order.cancelled_at);
  const productionAt = new Date(`${order.production_date}T12:00:00`);
  const hours = (productionAt.getTime() - cancelledAt.getTime()) / 36e5;
  return hours >= 0 && hours <= 48;
}

export function groupProductionByDate(orders) {
  const days = new Map();

  orders
    .filter((order) => order.status !== 'cancelled')
    .forEach((order) => {
      const date = order.production_date || order.created_at?.slice(0, 10) || 'Unscheduled';
      if (!days.has(date)) {
        days.set(date, {
          date,
          delivery: 0,
          pickup: 0,
          orders: 0,
          products: new Map(),
        });
      }

      const day = days.get(date);
      day.orders += 1;
      if (order.fulfillment_method === 'pickup') day.pickup += 1;
      else day.delivery += 1;

      (order.order_items || []).forEach((item) => {
        const current = day.products.get(item.product_name) || 0;
        day.products.set(item.product_name, current + Number(item.quantity || 0));
      });
    });

  return Array.from(days.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      ...day,
      products: Array.from(day.products, ([name, quantity]) => ({ name, quantity })).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      customBoxes: (orders || [])
        .filter((order) => order.status !== 'cancelled' && (order.production_date || order.created_at?.slice(0, 10) || 'Unscheduled') === day.date)
        .flatMap((order) => {
          const groups = new Map();
          (order.order_items || [])
            .filter((item) => item.is_custom_box)
            .forEach((item) => {
              const name = item.box_name || 'Build Your Own Box';
              if (!groups.has(name)) groups.set(name, []);
              groups.get(name).push(item);
            });
          return Array.from(groups, ([name, items]) => ({ orderId: order.id, name, items }));
        }),
    }));
}
