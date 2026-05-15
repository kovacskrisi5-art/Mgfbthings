import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CART_KEY } from '../lib/cart';

export default function Success({ orderId }) {
  useEffect(() => {
    window.localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event('cart:changed'));
  }, []);

  return (
    <>
      <Head>
        <title>Order confirmed | My Gluten Free Bakery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="success-page">
        <section className="success-card">
          <div className="success-mark">OK</div>
          <p className="eyebrow">Order confirmed</p>
          <h1>You are on the bake list.</h1>
          <p>
            Your Stripe test payment is complete. The bakery has your order and the tracking page will update as it moves through the bake.
          </p>
          <div className="success-next">
            <span>Status starts at received</span>
            <span>The bakery can update fulfilment in admin</span>
            <span>Keep your order ID for tracking</span>
          </div>
          <div className="hero-actions success-actions">
            {orderId && <Link className="primary-link" href={`/orders/${orderId}`}>Track this order</Link>}
            <Link className="secondary-link" href="/">Back to the shop</Link>
          </div>
        </section>
      </main>
    </>
  );
}

export function getServerSideProps({ query }) {
  return { props: { orderId: query.order_id || '' } };
}
