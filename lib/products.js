const PRODUCTS = [
  {
    id: 'bread-box-peckham',
    name: 'Bread Box',
    shortName: 'Bread rescue box',
    description:
      'A mixed selection of today\'s fresh gluten-free sourdough loaves — rescued from going to waste. Contents vary by day.',
    weeklyPrice: 699,
    originalPrice: 1400,
    serves: '2–3 loaves',
    bestFor: 'Stocking the freezer, everyday toast, and saving great bread',
    includes: ['2–3 assorted GF sourdough loaves', 'May include: Super Sourdough, Tinned Loaf, Totally Seeded', 'Vegan friendly', 'Suitable for freezing'],
    accent: '#835832',
    badge: 'Save today',
    image_url: '/assets/Bread_Multipack-1.webp',
    gallery_images: ['/assets/Bread_Multipack-1.webp', '/assets/Super_Sourdough-06.webp', '/assets/TotallySeededWhole.webp'],
    category: 'Rescue Boxes',
    inventory_category: 'leftover_stock',
    is_ready_now: true,
    pickup_ready_minutes: 0,
    low_stock_threshold: 3,
    bakery_name: 'The Gluten Free Bakery',
    zone: 'Peckham',
    pickup_address: 'Peckham, SE15 4PU',
  },
  {
    id: 'bagel-mix-peckham',
    name: 'Bagel Mix',
    shortName: 'Bagel rescue box',
    description:
      'A surprise mix of today\'s fresh gluten-free sourdough bagels — different flavours, rescued at end of day.',
    weeklyPrice: 499,
    originalPrice: 950,
    serves: '4–6 bagels',
    bestFor: 'Breakfasts, freezing, and discovering new flavours',
    includes: ['4–6 assorted GF sourdough bagels', 'May include: Classic, Boss, Nigella & Garlic', 'Vegan friendly', 'Freezer friendly'],
    accent: '#c08a2d',
    badge: 'Mystery mix',
    image_url: '/assets/Bagels_Multipack-01.webp',
    gallery_images: ['/assets/Bagels_Multipack-01.webp', '/assets/Boss_Bagels_Stack.webp', '/assets/Classic_Bagels.webp'],
    category: 'Rescue Boxes',
    inventory_category: 'leftover_stock',
    is_ready_now: true,
    pickup_ready_minutes: 0,
    low_stock_threshold: 3,
    bakery_name: 'The Gluten Free Bakery',
    zone: 'Peckham',
    pickup_address: 'Peckham, SE15 4PU',
  },
];

const DELIVERY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const BUILD_YOUR_BOX_ITEMS = PRODUCTS.map((product) => ({
  id: product.id,
  name: product.name,
  type: product.category,
}));

function getProductById(id) {
  return PRODUCTS.find((product) => product.id === id) || null;
}

function formatPrice(pence) {
  return `GBP ${(pence / 100).toFixed(2)}`;
}

module.exports = { PRODUCTS, DELIVERY_DAYS, BUILD_YOUR_BOX_ITEMS, getProductById, formatPrice };
