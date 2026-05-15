export const HERO_IMAGE = '/assets/enhanced-1776080793134_d0af4968-bf39-4aa1-8bf8-f56ae2c44796.webp';

export const PRODUCT_MEDIA = {
  'boss-bagels': {
    image_url: '/assets/Boss_Bagels_Stack.webp',
    gallery_images: ['/assets/Boss_Bagels_Stack.webp', '/assets/Boss_Bagels_Detail.webp'],
  },
  'bagel-selection-box': {
    image_url: '/assets/Bagels_Multipack-01.webp',
    gallery_images: ['/assets/Bagels_Multipack-01.webp', '/assets/Classic_Bagels.webp', '/assets/Boss_Bagels_Stack.webp'],
  },
  'super-sourdough': {
    image_url: '/assets/Super_Sourdough-06.webp',
    gallery_images: ['/assets/Super_Sourdough-06.webp'],
  },
  'tinned-sandwich-loaf': {
    image_url: '/assets/Tinned_Loaf-01.webp',
    gallery_images: ['/assets/Tinned_Loaf-01.webp', '/assets/Tinned_Loaf-09.webp'],
  },
  'totally-seeded': {
    image_url: '/assets/TotallySeededWhole.webp',
    gallery_images: ['/assets/TotallySeededWhole.webp', '/assets/TotallySeededSliced.webp'],
  },
  'classic-bagels': {
    image_url: '/assets/Classic_Bagels.webp',
    gallery_images: ['/assets/Classic_Bagels.webp', '/assets/Bagels_Multipack-01.webp'],
  },
  'nigella-garlic-bagels': {
    image_url: '/assets/GAarlic_Nigella-15.webp',
    gallery_images: ['/assets/GAarlic_Nigella-15.webp', '/assets/GAarlic_Nigella-17.webp'],
  },
  baguette: {
    image_url: '/assets/Baguette-5.jpg',
    gallery_images: ['/assets/Baguette-5.jpg', '/assets/Baguette-2.jpg', '/assets/Baguette-3.jpg'],
  },
  'loaves-mixed-box': {
    image_url: '/assets/Bread_Multipack-1.webp',
    gallery_images: ['/assets/Bread_Multipack-1.webp', '/assets/Super_Sourdough-06.webp', '/assets/TotallySeededWhole.webp'],
  },
  'build-a-box': {
    image_url: '/assets/Breakfast-Edit-Yumbles.webp',
    gallery_images: ['/assets/Breakfast-Edit-Yumbles.webp', '/assets/Bread_Multipack-1.webp', '/assets/Bagels_Multipack-01.webp'],
  },
  granola: {
    image_url: '/assets/Granola-6.webp',
    gallery_images: ['/assets/Granola-6.webp'],
  },
  'breakfast-box': {
    image_url: '/assets/Breakfast-Edit-Yumbles.webp',
    gallery_images: ['/assets/Breakfast-Edit-Yumbles.webp', '/assets/Granola-6.webp', '/assets/Classic_Bagels.webp'],
  },
};

export function applyProductMedia(product) {
  const key = product.slug || product.id;
  const media = PRODUCT_MEDIA[key];
  if (!media) return product;
  return {
    ...product,
    image_url: media.image_url,
    gallery_images: media.gallery_images,
  };
}
