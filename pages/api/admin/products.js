import { getProfileFromRequest, getSupabaseAdminClient } from '../../../lib/supabase';
import { normalizeImagePath } from '../../../lib/images';

async function requireAdmin(req) {
  const profile = await getProfileFromRequest(req);
  return profile?.role === 'admin';
}

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req))) {
      return res.status(401).json({ error: 'Admin login required' });
    }

    const supabase = getSupabaseAdminClient();

    if (req.method === 'POST') {
      const payload = cleanProductPayload(req.body);
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json({ product: data });
    }

    if (req.method === 'PATCH') {
      const { id, ...body } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing product id' });
      const { data: before } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (!before) return res.status(404).json({ error: 'Product not found' });

      const fullBody = body.name !== undefined
        ? body
        : { ...before, ...body };

      const payload = cleanProductPayload(fullBody);
      const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
      if (error) throw error;
      if (Number(before.stock_quantity) !== Number(data.stock_quantity)) {
        await supabase.from('inventory_movements').insert({
          product_id: id,
          movement_type: 'adjustment',
          quantity_delta: Number(data.stock_quantity) - Number(before.stock_quantity),
          note: 'Manual admin stock adjustment',
        });
      }
      return res.status(200).json({ product: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing product id' });
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function cleanProductPayload(body) {
  return {
    name: String(body.name || '').trim(),
    slug: String(body.slug || body.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: String(body.description || '').trim(),
    price: Math.max(0, Number(body.price || 0)),
    stock_quantity: Math.max(0, Number(body.stock_quantity || 0)),
    inventory_category: normalizeCategory(body.inventory_category),
    is_ready_now: body.is_ready_now === true || body.is_ready_now === 'true',
    pickup_ready_minutes: normalizePickupMinutes(body.pickup_ready_minutes),
    low_stock_threshold: Math.max(0, Number(body.low_stock_threshold || 4)),
    active: body.active !== false && Number(body.stock_quantity || 0) > 0,
    badge: body.badge || null,
    accent: body.accent || '#9b4d24',
    image_url: normalizeImagePath(body.image_url),
    sort_order: Number(body.sort_order || 100),
    metadata: body.metadata || {},
  };
}

function normalizeCategory(category) {
  const value = String(category || 'pre_order');
  return ['fresh_today', 'leftover_stock', 'frozen', 'pre_order'].includes(value) ? value : 'pre_order';
}

function normalizePickupMinutes(value) {
  const minutes = Number(value || 0);
  return [0, 15, 60].includes(minutes) ? minutes : 0;
}
