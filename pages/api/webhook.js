import { buffer } from 'micro';
import { getStripe } from '../../lib/stripe';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { sendConfirmationEmail } from '../../lib/email';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (!webhookSecret) {
      return res.status(503).json({ error: 'Stripe webhook secret is not configured.' });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdminClient();
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const { data: order, error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            stripe_payment_intent_id: session.payment_intent || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select('*, order_items(*)')
          .single();

        if (error) throw error;

        await reduceStock(supabase, order.order_items || [], orderId);

        await sendConfirmationEmail({
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          productName: `Order ${String(order.id).slice(0, 8)}`,
          customerPreferences: (order.order_items || [])
            .map((item) => `${item.quantity}x ${item.product_name}`)
            .join(', '),
          billingInterval: 'once',
          deliveryDay: order.delivery_day || 'Pickup',
          weeklyPrice: order.total,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
}

async function reduceStock(supabase, items, orderId) {
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .single();

    const nextStock = Math.max(0, Number(product?.stock_quantity || 0) - Number(item.quantity || 0));

    await supabase
      .from('products')
      .update({ stock_quantity: nextStock, active: nextStock > 0 })
      .eq('id', item.product_id);

    await supabase.from('inventory_movements').insert({
      product_id: item.product_id,
      order_id: orderId,
      movement_type: 'sale',
      quantity_delta: -Number(item.quantity || 0),
      note: 'Stripe checkout completed',
    });
  }
}
