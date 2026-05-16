import { sendReminderEmail } from '../../../lib/email';
import { getSupabaseAdminClient } from '../../../lib/supabase';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function handler(req, res) {
  const { secret } = req.query;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowName = DAY_NAMES[tomorrow.getDay()];

  if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(tomorrowName)) {
    return res.status(200).json({ message: `No deliveries tomorrow (${tomorrowName})`, sent: 0 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('delivery_day', tomorrowName)
      .neq('status', 'delivered');

    if (error) throw error;

    let sent = 0;
    for (const order of orders || []) {
      await sendReminderEmail({
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        productName: (order.order_items || []).map((item) => item.product_name).join(', ') || 'bakery order',
        deliveryDay: order.delivery_day,
      });
      sent++;
    }

    return res.status(200).json({
      message: `Reminder emails sent for ${tomorrowName} deliveries`,
      sent,
      recipients: (orders || []).map((order) => order.customer_email),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
