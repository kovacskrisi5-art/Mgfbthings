import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { cartTotal, formatPrice, readCart } from '../lib/cart';
import { pickupReadyLabel } from '../lib/operations';
import { DELIVERY_DAYS } from '../lib/products';

const emptyForm = {
  customerName: '',
  customerEmail: '',
  customerAddress: '',
  fulfillmentMethod: 'delivery',
  deliveryDay: DELIVERY_DAYS[0],
  productionDate: '',
  notes: '',
};

export default function Checkout() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const instantPickup = items.some((item) => item.instant_pickup);
  const fulfillmentOptions = instantPickup ? ['pickup'] : ['delivery', 'pickup'];
  const subtotal = cartTotal(items);
  const deliveryFee = instantPickup || form.fulfillmentMethod === 'pickup' || subtotal >= 3500 ? 0 : 399;
  const orderTotal = subtotal + deliveryFee;

  useEffect(() => {
    const cartItems = readCart();
    setItems(cartItems);
    if (cartItems.some((item) => item.instant_pickup)) {
      setForm((current) => ({
        ...current,
        fulfillmentMethod: 'pickup',
        productionDate: new Date().toISOString().slice(0, 10),
        notes: current.notes || 'Instant pickup reservation',
      }));
    }
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitCheckout(event) {
    event.preventDefault();
    setError('');

    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, deliveryFee }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head><title>Checkout | My Gluten Free Bakery</title></Head>
      <Layout>
        <section className="section checkout-page">
          <div className="section-heading">
            <p className="eyebrow">Checkout</p>
            <h1>Confirm your bakery order.</h1>
          </div>
          <div className="checkout-progress">
            <span className="active">Details</span>
            <span className={form.fulfillmentMethod ? 'active' : ''}>Fulfilment</span>
            <span className={items.length ? 'active' : ''}>Payment</span>
          </div>

          <div className="checkout-layout">
            <form id="checkout-form" className="checkout-form page-form" onSubmit={submitCheckout}>
              <Field label="Full name" name="customerName" value={form.customerName} onChange={updateField} />
              <Field label="Email" name="customerEmail" type="email" value={form.customerEmail} onChange={updateField} />
              <div className="field-group">
                <label>Fulfilment</label>
                <div className="segmented">
                  {fulfillmentOptions.map((method) => (
                    <button
                      className={form.fulfillmentMethod === method ? 'selected' : ''}
                      key={method}
                      onClick={() => setForm({ ...form, fulfillmentMethod: method })}
                      type="button"
                    >
                      {method === 'delivery' ? 'Delivery' : 'Pickup'}
                    </button>
                  ))}
                </div>
                {!instantPickup && <p className="field-hint">Delivery is available Monday to Friday. Pickup is free.</p>}
                {instantPickup && <p className="field-hint">Instant pickup carts are collected from the bakery.</p>}
              </div>
              {form.fulfillmentMethod === 'delivery' && (
                <Field label="Delivery address" name="customerAddress" value={form.customerAddress} onChange={updateField} />
              )}
              <div className="field-group">
                <label>Preferred day</label>
                <div className="segmented weekday-selector">
                  {DELIVERY_DAYS.map((day) => (
                    <button className={form.deliveryDay === day ? 'selected' : ''} key={day} onClick={() => setForm({ ...form, deliveryDay: day })} type="button">
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Delivery or pickup date" name="productionDate" type="date" value={form.productionDate} onChange={updateField} />
              <div className="field-group">
                <label htmlFor="notes">Order notes</label>
                <textarea id="notes" name="notes" onChange={updateField} value={form.notes} />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="checkout-button full" disabled={submitting} type="submit">
                {submitting ? 'Opening secure checkout...' : 'Pay with Stripe'}
              </button>
            </form>

            <aside className="cart-summary">
              <span>Order total</span>
              <strong>{formatPrice(orderTotal)}</strong>
              {items.map((item) => (
                <p key={item.product_id}>
                  {item.quantity}x {item.name}
                  {item.instant_pickup ? ` · ${pickupReadyLabel(item.pickup_ready_minutes).toLowerCase()}` : ''}
                </p>
              ))}
              <div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <div className="summary-row"><span>{form.fulfillmentMethod === 'pickup' ? 'Pickup' : 'Delivery'}</span><strong>{deliveryFee ? formatPrice(deliveryFee) : 'Free'}</strong></div>
              <div className="summary-row total"><span>Due today</span><strong>{formatPrice(orderTotal)}</strong></div>
            </aside>
          </div>
        </section>
      </Layout>
    </>
  );
}

function Field({ label, name, type = 'text', value, onChange }) {
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} onChange={onChange} required type={type} value={value} />
    </div>
  );
}
