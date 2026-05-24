import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { cartTotal, formatPrice, readCart, writeCart } from '../lib/cart';

export default function Cart({ cancelled }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  function updateQuantity(productId, quantity) {
    const next = items
      .map((item) => item.product_id === productId ? { ...item, quantity: Math.max(0, quantity) } : item)
      .filter((item) => item.quantity > 0);
    setItems(next);
    writeCart(next);
  }

  const subtotal = cartTotal(items);

  return (
    <>
      <Head><title>Cart | Gluten Free Save Club</title></Head>
      <Layout>
        {cancelled && <div className="notice">Checkout was cancelled. Your cart is still saved.</div>}
        <section className="section cart-page">
          <div className="section-heading">
            <p className="eyebrow">Your cart</p>
            <h1>Your rescue order.</h1>
          </div>

          {items.length === 0 ? (
            <div className="admin-empty">
              Your cart is empty. <Link href="/#rescue-boxes">See today&apos;s boxes</Link>.
            </div>
          ) : (
            <div className="cart-layout">
              <section className="cart-lines">
                {items.map((item) => (
                  <article className="cart-line" key={item.product_id}>
                    <div>
                      <h2>{item.name}</h2>
                      {item.bakery_name && (
                        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                          {item.bakery_name}{item.zone ? ` · ${item.zone}` : ''}
                        </p>
                      )}
                      <p>{formatPrice(item.unit_price)} each</p>
                    </div>
                    <div className="cart-quantity">
                      <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} type="button">-</button>
                      <strong>{item.quantity}</strong>
                      <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} type="button">+</button>
                    </div>
                    <strong>{formatPrice(item.unit_price * item.quantity)}</strong>
                  </article>
                ))}
              </section>
              <aside className="cart-summary">
                <span>Order summary</span>
                <div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
                <div className="summary-row"><span>Pickup</span><strong>Free</strong></div>
                <div className="summary-row total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div>
                <Link className="checkout-button full" href="/checkout">Checkout</Link>
              </aside>
            </div>
          )}
        </section>
      </Layout>
    </>
  );
}

export function getServerSideProps({ query }) {
  return { props: { cancelled: query.cancelled === 'true' } };
}
