import { groupProductionByDate } from '../../../lib/production';
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

    const { date } = req.query;
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .neq('status', 'cancelled')
      .order('production_date', { ascending: true });

    if (date) query = query.eq('production_date', date);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ production: groupProductionByDate(data || []) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
