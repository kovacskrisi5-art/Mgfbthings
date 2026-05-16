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

  return (
    <>
      <Head><title>Cart | My Gluten Free Bakery</title></Head>
      <Layout>
        {cancelled && <div className="notice">Checkout was cancelled. Your cart is still saved.</div>}
        <section className="section cart-page">
          <div className="section-heading">
            <p className="eyebrow">Your cart</p>
            <h1>Review your bakery order.</h1>
          </div>

          {items.length === 0 ? (
            <div className="admin-empty">
              Your cart is empty. <Link href="/#boxes">Browse the menu</Link>.
            </div>
          ) : (
            <div className="cart-layout">
              <section className="cart-lines">
                {items.map((item) => (
                  <article className="cart-line" key={item.product_id}>
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.custom_box ? `${item.box_items?.length || 0} bakery lines` : `${formatPrice(item.unit_price)} each`}</p>
                      {item.custom_box && (
                        <ul className="cart-breakdown">
                          {(item.box_items || []).map((boxItem) => (
                            <li key={boxItem.product_id}>{boxItem.quantity}x {boxItem.name}</li>
                          ))}
                        </ul>
                      )}
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
                <span>Pricing summary</span>
                <SummaryRows items={items} />
                <Link className="checkout-button full" href="/checkout">Checkout</Link>
              </aside>
            </div>
          )}
        </section>
      </Layout>
    </>
  );
}

function SummaryRows({ items }) {
  const subtotal = cartTotal(items);
  const instantPickup = items.some((item) => item.instant_pickup);
  const delivery = instantPickup || subtotal >= 3500 ? 0 : 399;
  const total = subtotal + delivery;

  return (
    <>
      <div className="summary-row"><span>Items</span><strong>{formatPrice(subtotal)}</strong></div>
      <div className="summary-row"><span>{instantPickup ? 'Pickup' : 'Delivery'}</span><strong>{delivery ? formatPrice(delivery) : 'Free'}</strong></div>
      <div className="summary-row total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
      {instantPickup && <p>Instant pickup items are reserved through checkout.</p>}
    </>
  );
}

export function getServerSideProps({ query }) {
  return { props: { cancelled: query.cancelled === 'true' } };
}
