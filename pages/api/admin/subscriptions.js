import { getProfileFromRequest, getSupabaseAdminClient } from '../../../lib/supabase';

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

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ subscriptions: data || [] });
    }

    if (req.method === 'POST') {
      const payload = cleanSubscriptionPayload(req.body);
      const { data, error } = await supabase.from('subscriptions').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json({ subscription: data });
    }

    if (req.method === 'PATCH') {
      const { id, ...body } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing subscription id' });
      const payload = cleanSubscriptionPayload(body);
      const { data, error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ subscription: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function cleanSubscriptionPayload(body) {
  return {
    customer_email: String(body.customer_email || '').trim(),
    fulfillment_method: body.fulfillment_method === 'delivery' ? 'delivery' : 'pickup',
    status: body.status || 'active',
    cadence: body.cadence || 'weekly',
    weekdays: Array.isArray(body.weekdays) ? body.weekdays : [],
    product_ids: Array.isArray(body.product_ids) ? body.product_ids : [],
    skipped_dates: Array.isArray(body.skipped_dates) ? body.skipped_dates : [],
    paused_dates: Array.isArray(body.paused_dates) ? body.paused_dates : [],
    next_order_date: body.next_order_date || null,
    notes: body.notes || '',
  };
}
