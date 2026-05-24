export const CART_KEY = 'bakery_cart_v1';

export function readCart() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeCart(items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart:changed'));
}

export function cartCount(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function cartTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
}

export function addToCart(product, quantity = 1, options = {}) {
  const items = readCart();
  const existing = items.find((item) => item.product_id === product.id);
  const next = existing
    ? items.map((item) =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + quantity,
              instant_pickup: item.instant_pickup || Boolean(options.instantPickup),
              pickup_ready_minutes: Number(product.pickup_ready_minutes || item.pickup_ready_minutes || options.pickupReadyMinutes || 0),
              inventory_category: product.inventory_category || item.inventory_category || 'pre-order',
            }
          : item
      )
    : [
        ...items,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.price || product.weeklyPrice || 0,
          image_url: product.image_url || '',
          quantity,
          instant_pickup: Boolean(options.instantPickup),
          pickup_ready_minutes: Number(product.pickup_ready_minutes || options.pickupReadyMinutes || 0),
          inventory_category: product.inventory_category || 'pre-order',
          bakery_name: options.bakery_name || product.bakery_name || '',
          zone: options.zone || product.zone || '',
          pickup_address: options.pickup_address || product.pickup_address || '',
        },
      ];

  writeCart(next);
  return next;
}

export function addCustomBoxToCart(box, quantity = 1) {
  const items = readCart();
  const id = box.id || `custom-box-${Date.now()}`;
  const next = [
    ...items,
    {
      product_id: id,
      custom_box: true,
      custom_box_id: box.saved_box_id || null,
      name: box.name || 'Build Your Own Box',
      unit_price: Number(box.total || 0),
      image_url: '/assets/build-a-box.png',
      quantity,
      box_items: box.items || [],
      box_weekdays: box.weekdays || [],
      fulfillment_method: box.fulfillmentMethod || 'pickup',
      order_mode: box.orderMode || 'one_time',
      instant_pickup: false,
      pickup_ready_minutes: 60,
      inventory_category: 'pre_order',
    },
  ];

  writeCart(next);
  return next;
}

export function formatPrice(pence) {
  return `GBP ${(Number(pence || 0) / 100).toFixed(2)}`;
}
