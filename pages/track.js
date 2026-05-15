import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { formatPrice } from '../lib/cart';
import { ORDER_STATUSES, STATUS_META } from '../lib/status';

export default function Track() {
  const [lookup, setLookup] = useState({ id: '', email: '' });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lookup.id) params.set('id', lookup.id);
      if (lookup.email) params.set('email', lookup.email);
      const response = await fetch(`/api/orders?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Orders could not be loaded.');
      setOrders(data.orders || []);
      if (!data.orders?.length) setError('No orders matched those details.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Track order | My Gluten Free Bakery</title></Head>
      <Layout>
        <section className="section checkout-page">
          <div className="section-heading">
            <p className="eyebrow">Order tracking</p>
            <h1>Follow your bake.</h1>
          </div>
          <form className="checkout-form page-form lookup-form" onSubmit={search}>
            <div className="field-group">
              <label htmlFor="id">Order ID</label>
              <input id="id" value={lookup.id} onChange={(event) => setLookup({ ...lookup, id: event.target.value })} />
            </div>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={lookup.email} onChange={(event) => setLookup({ ...lookup, email: event.target.value })} />
            </div>
            <button className="checkout-button full" disabled={loading || (!lookup.id && !lookup.email)} type="submit">
              {loading ? 'Checking...' : 'Track order'}
            </button>
          </form>
          {error && <div className="form-error">{error}</div>}
          <section className="admin-orders tracking-results">
            {orders.map((order) => <TrackingCard key={order.id} order={order} />)}
          </section>
        </section>
      </Layout>
    </>
  );
}

export function TrackingCard({ order }) {
  return (
    <article className="admin-order">
      <div className="admin-order-top">
        <div>
          <h2>Order {String(order.id).slice(0, 8)}</h2>
          <p>{order.customer_email}</p>
        </div>
        <span className="status-pill" style={STATUS_META[order.status]}>
          {STATUS_META[order.status]?.label || order.status}
        </span>
      </div>
      <StatusTimeline current={order.status} />
      <dl className="order-grid">
        <div><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        <div><dt>Payment</dt><dd>{order.payment_status}</dd></div>
        <div><dt>Date</dt><dd>{order.production_date || order.delivery_day || 'Unscheduled'}</dd></div>
        {order.status === 'cancelled' && (
          <div><dt>Cancelled</dt><dd>{order.cancelled_by || 'Unknown'} · {order.cancellation_reason || 'No reason provided'}</dd></div>
        )}
      </dl>
      <footer>
        <Link href={`/orders/${order.id}`}>Open order details</Link>
      </footer>
    </article>
  );
}

export function StatusTimeline({ current }) {
  if (current === 'cancelled') {
    return (
      <ol className="status-timeline">
        <li className="complete cancelled-step">
          <span />
          <strong>{STATUS_META.cancelled.label}</strong>
        </li>
      </ol>
    );
  }

  const productionStatuses = ORDER_STATUSES.filter((status) => status !== 'cancelled');
  const currentIndex = Math.max(0, productionStatuses.indexOf(current));
  return (
    <ol className="status-timeline">
      {productionStatuses.map((status, index) => (
        <li className={index <= currentIndex ? 'complete' : ''} key={status}>
          <span />
          <strong>{STATUS_META[status].label}</strong>
        </li>
      ))}
    </ol>
  );
}
