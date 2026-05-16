import { getStripe } from '../../lib/stripe';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { productionDateFor } from '../../lib/production';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    items = [],
    customerName,
    customerEmail,
    fulfillmentMethod = 'delivery',
    customerAddress = '',
    deliveryDay = 'Monday',
    productionDate = '',
    deliveryFee = 0,
    notes = '',
  } = req.body;

  if (!customerName || !customerEmail || !items.length) {
    return res.status(400).json({ error: 'Add items and customer details before checkout.' });
  }

  if (fulfillmentMethod === 'delivery' && !customerAddress.trim()) {
    return res.status(400).json({ error: 'Delivery address is required.' });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const stripe = getStripe();
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const productIds = items.flatMap((item) =>
      item.custom_box ? (item.box_items || []).map((boxItem) => boxItem.product_id) : [item.product_id]
    );
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('active', true);

    if (productError) throw productError;

    const productMap = new Map((products || []).map((product) => [product.id, product]));
    const lineItems = [];
    const orderItems = [];
    const instantPickup = items.some((item) => item.instant_pickup);
    const maxPickupMinutes = Math.max(0, ...items.map((item) => Number(item.pickup_ready_minutes || 0)));
    let total = Math.max(0, Number(deliveryFee || 0));

    for (const item of items) {
      if (item.custom_box) {
        const boxItems = item.box_items || [];
        const boxQuantity = Number(item.quantity || 1);
        const boxTotal = boxItems.reduce((sum, boxItem) => {
          const product = productMap.get(boxItem.product_id);
          return sum + Number(product?.price || boxItem.unit_price || 0) * Number(boxItem.quantity || 0);
        }, 0);

        if (!boxItems.length) continue;

        for (const boxItem of boxItems) {
          const product = productMap.get(boxItem.product_id);
          const quantity = Number(boxItem.quantity || 0) * boxQuantity;
          if (!product || quantity < 1) continue;
          if (product.stock_quantity < quantity) {
            return res.status(409).json({ error: `${product.name} only has ${product.stock_quantity} left.` });
          }
          orderItems.push({
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity,
            line_total: product.price * quantity,
            is_custom_box: true,
            box_name: item.name || 'Build Your Own Box',
            custom_box_id: item.custom_box_id || null,
          });
        }

        total += boxTotal * boxQuantity;
        lineItems.push({
          price_data: {
            currency: 'gbp',
            unit_amount: boxTotal,
            product_data: {
              name: item.name || 'Build Your Own Box',
              description: boxItems.map((boxItem) => `${boxItem.quantity}x ${boxItem.name}`).join(', '),
            },
          },
          quantity: boxQuantity,
        });
        continue;
      }

      const product = productMap.get(item.product_id);
      const quantity = Number(item.quantity || 0);
      if (!product || quantity < 1) continue;
      if (product.stock_quantity < quantity) {
        return res.status(409).json({ error: `${product.name} only has ${product.stock_quantity} left.` });
      }
      if (item.instant_pickup) {
        const availableNow = product.is_ready_now && ['fresh_today', 'leftover_stock', 'frozen'].includes(product.inventory_category);
        if (!availableNow) {
          return res.status(409).json({ error: `${product.name} is not available for instant pickup right now.` });
        }
      }

      total += product.price * quantity;
      lineItems.push({
        price_data: {
          currency: 'gbp',
          unit_amount: product.price,
          product_data: { name: product.name, description: product.description || undefined },
        },
        quantity,
      });
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity,
        line_total: product.price * quantity,
      });
    }

    if (!lineItems.length) {
      return res.status(400).json({ error: 'Your cart does not contain available products.' });
    }

    if (Number(deliveryFee || 0) > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          unit_amount: Number(deliveryFee),
          product_data: { name: 'Delivery' },
        },
        quantity: 1,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_address: customerAddress,
        fulfillment_method: instantPickup ? 'pickup' : fulfillmentMethod,
        delivery_day: deliveryDay,
        production_date: instantPickup ? new Date().toISOString().slice(0, 10) : productionDate || productionDateFor(deliveryDay),
        pickup_ready_at: instantPickup ? pickupReadyAt(maxPickupMinutes) : null,
        notes: instantPickup ? `${notes ? `${notes} - ` : ''}Instant pickup reservation` : notes,
        status: 'received',
        payment_status: 'pending',
        refund_status: 'not_required',
        total,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemError) throw itemError;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${BASE_URL}/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cart?cancelled=true`,
      metadata: { orderId: order.id },
    });

    await supabase
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);

    return res.status(200).json({ url: session.url, orderId: order.id });
  } catch (err) {
    console.error('Checkout error:', err);
    const isConfigError =
      err.message.includes('Supabase') ||
      err.message.includes('Stripe is not configured') ||
      err.message.includes('Stripe demo checkout') ||
      err.message.includes('Live Stripe keys are blocked');
    return res.status(isConfigError ? 503 : 500).json({
      error: isConfigError
        ? 'Demo checkout is not configured yet. Add a development Supabase project and Stripe test environment variables.'
        : err.message,
    });
  }
}

function pickupReadyAt(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date.toISOString();
}
