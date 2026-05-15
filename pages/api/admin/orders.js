import { ORDER_STATUSES, REFUND_STATUSES } from '../../../lib/status';
import { getProfileFromRequest, getSupabaseAdminClient } from '../../../lib/supabase';

async function requireAdmin(req) {
  const profile = await getProfileFromRequest(req);
  return profile?.role === 'admin' ? profile : null;
}

export default async function handler(req, res) {
  try {
    const profile = await requireAdmin(req);
    if (!profile) {
      return res.status(401).json({ error: 'Admin login required' });
    }

    const supabase = getSupabaseAdminClient();

    if (req.method === 'GET') {
      const { status, fulfillment, date, refund } = req.query;
      let query = supabase
        .from('orders')
        .select('*, order_items(*), order_audit_log(*)')
        .order('created_at', { ascending: false })
        .order('created_at', { foreignTable: 'order_audit_log', ascending: false });

      if (status === 'active') query = query.neq('status', 'cancelled');
      else if (status === 'cancelled') query = query.eq('status', 'cancelled');
      else if (ORDER_STATUSES.includes(status)) query = query.eq('status', status);

      if (fulfillment === 'pickup' || fulfillment === 'delivery') {
        query = query.eq('fulfillment_method', fulfillment);
      }

      if (refund && REFUND_STATUSES.includes(refund)) {
        query = query.eq('refund_status', refund);
      } else if (status === 'refunded') {
        query = query.eq('refund_status', 'refunded');
      }

      if (date) query = query.eq('production_date', date);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ orders: data || [] });
    }

    if (req.method === 'PATCH') {
      const {
        id,
        status,
        cancellationReason = '',
        cancelledBy = 'bakery',
        refundStatus,
      } = req.body;

      if (!id || !ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid order id or status' });
      }

      if (refundStatus && !REFUND_STATUSES.includes(refundStatus)) {
        return res.status(400).json({ error: 'Invalid refund status' });
      }

      const { data: before, error: beforeError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (beforeError) throw beforeError;

      const patch = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'cancelled') {
        patch.cancelled_by = cancelledBy === 'customer' ? 'customer' : 'bakery';
        patch.cancellation_reason = String(cancellationReason || 'Cancelled by bakery').trim();
        patch.cancelled_at = before.cancelled_at || new Date().toISOString();
        patch.refund_status = refundStatus || before.refund_status || 'pending';
      } else if (refundStatus) {
        patch.refund_status = refundStatus;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', id)
        .select('*, order_items(*), order_audit_log(*)')
        .single();

      if (error) throw error;

      await supabase.from('order_audit_log').insert({
        order_id: id,
        actor_type: 'bakery',
        actor_id: profile.id,
        actor_email: profile.email,
        from_status: before.status,
        to_status: status,
        from_refund_status: before.refund_status,
        to_refund_status: patch.refund_status || before.refund_status,
        note: status === 'cancelled' ? patch.cancellation_reason : '',
      });

      return res.status(200).json({ order: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
