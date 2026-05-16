import { getSupabaseAdminClient } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdminClient();

    if (req.method === 'GET') {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Email is required.' });

      const { data, error } = await supabase
        .from('custom_boxes')
        .select('*')
        .ilike('customer_email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ boxes: data || [] });
    }

    if (req.method === 'POST') {
      const payload = cleanPayload(req.body);
      const { data, error } = await supabase
        .from('custom_boxes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ box: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function cleanPayload(body) {
  return {
    customer_email: String(body.customer_email || '').trim(),
    name: String(body.name || 'My custom bakery box').trim(),
    items: Array.isArray(body.items) ? body.items : [],
    weekdays: Array.isArray(body.weekdays) ? body.weekdays : [],
    min_items: Number(body.min_items || 4),
    max_items: Number(body.max_items || 12),
    total: Math.max(0, Number(body.total || 0)),
    fulfillment_method: body.fulfillment_method === 'delivery' ? 'delivery' : 'pickup',
    order_mode: body.order_mode === 'subscription' ? 'subscription' : 'one_time',
  };
}
