import { getSupabaseAdminClient } from '../../lib/supabase';
import { PRODUCTS } from '../../lib/products';
import { normalizeImagePath } from '../../lib/images';
import { applyProductMedia } from '../../lib/product-media';

function normalizeSeedProduct(product, index) {
  return {
    id: product.id,
    name: product.name,
    slug: product.id,
    description: product.description,
    price: product.weeklyPrice,
    stock_quantity: 20,
    inventory_category: product.inventory_category || (product.category === 'Boxes & Bundles' ? 'pre_order' : 'fresh_today'),
    is_ready_now: product.is_ready_now !== undefined ? product.is_ready_now : product.category !== 'Boxes & Bundles',
    pickup_ready_minutes: product.pickup_ready_minutes || 0,
    low_stock_threshold: product.low_stock_threshold || 4,
    active: true,
    badge: product.badge,
    accent: product.accent,
    image_url: normalizeImagePath(product.image_url),
    gallery_images: (product.gallery_images || [product.image_url]).map(normalizeImagePath),
    sort_order: index + 1,
    metadata: product,
  };
}

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdminClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      const products = data?.length
        ? data.map((product) => {
            const withMedia = applyProductMedia(product);
            return {
              ...withMedia,
              image_url: normalizeImagePath(withMedia.image_url),
              gallery_images: (withMedia.gallery_images || [withMedia.image_url]).map(normalizeImagePath),
            };
          })
        : PRODUCTS.map(normalizeSeedProduct);
      return res.status(200).json({ products });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (req.method === 'GET') {
      return res.status(200).json({ products: PRODUCTS.map(normalizeSeedProduct), warning: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
}
