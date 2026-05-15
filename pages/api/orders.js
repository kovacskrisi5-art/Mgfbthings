import { getSupabaseAdminClient } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdminClient();

    if (req.method === 'GET') {
      const { id, email } = req.query;
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (id) query = query.eq('id', id);
      if (email) query = query.ilike('customer_email', email);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ orders: data || [] });
    }

    if (req.method === 'PATCH') {
      const { id, customerEmail, cancellationReason = '' } = req.body;
      if (!id || !customerEmail) {
        return res.status(400).json({ error: 'Order ID and email are required.' });
      }

      const { data: before, error: beforeError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .ilike('customer_email', customerEmail)
        .single();

      if (beforeError || !before) {
        return res.status(404).json({ error: 'Order not found for that email.' });
      }

      if (before.status === 'cancelled') {
        return res.status(200).json({ order: before });
      }

      const patch = {
        status: 'cancelled',
        cancelled_by: 'customer',
        cancellation_reason: String(cancellationReason || 'Cancelled by customer').trim(),
        cancelled_at: new Date().toISOString(),
        refund_status: before.payment_status === 'paid' ? 'pending' : 'not_required',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', id)
        .select('*, order_items(*), order_audit_log(*)')
        .single();

      if (error) throw error;

      await supabase.from('order_audit_log').insert({
        order_id: id,
        actor_type: 'customer',
        actor_email: before.customer_email,
        from_status: before.status,
        to_status: 'cancelled',
        from_refund_status: before.refund_status,
        to_refund_status: patch.refund_status,
        note: patch.cancellation_reason,
      });

      return res.status(200).json({ order: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
