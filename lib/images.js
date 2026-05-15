export const FALLBACK_PRODUCT_IMAGE = '/assets/product-fallback.png';

export function normalizeImagePath(src) {
  if (!src || typeof src !== 'string') return FALLBACK_PRODUCT_IMAGE;
  if (src.includes(':\\') || src.startsWith('C:')) return FALLBACK_PRODUCT_IMAGE;
  if (/\.(webp|jpe?g|png)$/i.test(src) && src.startsWith('/assets/')) return src;
  if (src.startsWith('/assets/products/')) {
    return src.replace('/assets/products/', '/assets/').replace(/\.svg$/i, '.png');
  }
  if (!src.startsWith('/')) return FALLBACK_PRODUCT_IMAGE;
  return src.replace(/\.svg$/i, '.png');
}
