import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { formatPrice } from '../../lib/cart';
import { REFUND_META, STATUS_META } from '../../lib/status';
import { StatusTimeline } from '../track';

export default function OrderDetails({ id }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders?id=${id}`)
      .then((response) => response.json())
      .then((data) => setOrder(data.orders?.[0] || null))
      .finally(() => setLoading(false));
  }, [id]);

  async function cancelOrder(event) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: order.id,
        customerEmail: order.customer_email,
        cancellationReason: cancelReason,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Order could not be cancelled.');
      return;
    }
    setOrder(data.order);
  }

  return (
    <>
      <Head><title>Order details | My Gluten Free Bakery</title></Head>
      <Layout>
        {loading ? (
          <div className="admin-empty">Loading order...</div>
        ) : !order ? (
          <div className="admin-empty">Order not found.</div>
        ) : (
          <article className="admin-order order-detail-page">
            <div className="admin-order-top">
              <div>
                <p className="eyebrow">Order confirmation</p>
                <h1>Order {String(order.id).slice(0, 8)}</h1>
                <p>{order.customer_name} · {order.customer_email}</p>
              </div>
              <span className="status-pill" style={STATUS_META[order.status]}>
                {STATUS_META[order.status]?.label || order.status}
              </span>
            </div>
            <StatusTimeline current={order.status} />
            <dl className="order-grid">
              <div><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
              <div><dt>Payment</dt><dd>{order.payment_status}</dd></div>
              <div><dt>Refund</dt><dd>{REFUND_META[order.refund_status || 'not_required']?.label || order.refund_status}</dd></div>
              <div><dt>Fulfilment</dt><dd>{order.fulfillment_method}</dd></div>
              <div><dt>Production date</dt><dd>{order.production_date || order.delivery_day || 'Pickup'}</dd></div>
              {order.pickup_ready_at && <div><dt>Pickup ready</dt><dd>{new Date(order.pickup_ready_at).toLocaleString('en-GB')}</dd></div>}
              {order.status === 'cancelled' && (
                <>
                  <div><dt>Cancelled by</dt><dd>{order.cancelled_by || 'Unknown'}</dd></div>
                  <div><dt>Cancelled at</dt><dd>{order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('en-GB') : 'Not recorded'}</dd></div>
                  <div><dt>Reason</dt><dd>{order.cancellation_reason || 'No reason provided'}</dd></div>
                </>
              )}
            </dl>
            <div className="included">
              <span>Items</span>
              <ul>
                {(order.order_items || []).map((item) => (
                  <li key={item.id}>{item.quantity}x {item.product_name}</li>
                ))}
              </ul>
            </div>
            {error && <div className="form-error">{error}</div>}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <form className="cancel-form customer-cancel" onSubmit={cancelOrder}>
                <div className="field-group">
                  <label htmlFor="cancel-reason">Cancel this order</label>
                  <textarea
                    id="cancel-reason"
                    required
                    placeholder="Please tell the bakery why you are cancelling."
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                  />
                </div>
                <button className="danger-button" type="submit">Cancel order</button>
              </form>
            )}
          </article>
        )}
      </Layout>
    </>
  );
}

export function getServerSideProps({ params }) {
  return { props: { id: params.id } };
}
