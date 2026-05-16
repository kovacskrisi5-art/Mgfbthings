import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import ProductImage from '../components/ProductImage';
import { addCustomBoxToCart, formatPrice } from '../lib/cart';

const MIN_ITEMS = 4;
const MAX_ITEMS = 12;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function BuildBox() {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [step, setStep] = useState(1);
  const [orderMode, setOrderMode] = useState('subscription');
  const [weekdays, setWeekdays] = useState(['Monday']);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('pickup');
  const [boxName, setBoxName] = useState('My custom bakery box');
  const [email, setEmail] = useState('');
  const [savedBoxes, setSavedBoxes] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => setProducts((data.products || []).filter(isBuilderProduct)));
  }, []);

  const selectedItems = useMemo(
    () =>
      products
        .map((product) => ({
          product_id: product.id,
          name: product.name,
          image_url: product.image_url,
          unit_price: product.price,
          quantity: Number(quantities[product.id] || 0),
        }))
        .filter((item) => item.quantity > 0),
    [products, quantities]
  );
  const itemCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = selectedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const valid = itemCount >= MIN_ITEMS && itemCount <= MAX_ITEMS;

  function updateQuantity(productId, delta) {
    setQuantities((current) => {
      const next = Math.max(0, Number(current[productId] || 0) + delta);
      const currentCount = Object.values(current).reduce((sum, value) => sum + Number(value || 0), 0);
      if (delta > 0 && currentCount >= MAX_ITEMS) return current;
      return { ...current, [productId]: next };
    });
  }

  function toggleWeekday(day) {
    setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  function addBoxToCart(box = null) {
    const payload = box
      ? {
          id: `saved-${box.id}-${Date.now()}`,
          saved_box_id: box.id,
          name: box.name,
          items: box.items,
          weekdays: box.weekdays,
          fulfillmentMethod: box.fulfillment_method || 'pickup',
          total: box.total,
          orderMode: box.order_mode,
        }
      : {
          name: boxName,
          items: selectedItems,
          weekdays,
          fulfillmentMethod,
          total,
          orderMode,
        };
    addCustomBoxToCart(payload, 1);
    setNotice(`${payload.name} added to cart.`);
  }

  async function saveBox() {
    if (!email || !valid) return;
    const response = await fetch('/api/custom-boxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_email: email,
        name: boxName,
        items: selectedItems,
        weekdays,
        fulfillment_method: fulfillmentMethod,
        min_items: MIN_ITEMS,
        max_items: MAX_ITEMS,
        total,
        order_mode: orderMode,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setSavedBoxes([data.box, ...savedBoxes]);
      setNotice('Custom box saved to this email.');
    } else {
      setNotice(data.error || 'Could not save box.');
    }
  }

  async function loadSavedBoxes(event) {
    event.preventDefault();
    if (!email) return;
    const response = await fetch(`/api/custom-boxes?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    setSavedBoxes(data.boxes || []);
  }

  return (
    <>
      <Head><title>Build Your Own Box | My Gluten Free Bakery</title></Head>
      <Layout>
        {notice && <div className="notice">{notice}</div>}
        <section className="section builder-page">
          <div className="builder-hero-panel">
            <div>
              <p className="eyebrow">Subscription builder</p>
              <h1>Build a recurring bakery box.</h1>
              <p className="hero-text builder-subtext">
                Choose the bakes, assign weekdays, then save the box as a custom bakery plan.
              </p>
            </div>
            <div className="builder-plan-card" aria-label="Subscription plan summary">
              <span>Custom plan</span>
              <strong>{orderMode === 'subscription' ? 'Recurring weekdays' : 'One-time custom box'}</strong>
              <small>
                {fulfillmentMethod === 'delivery' ? 'Local delivery' : 'Pickup'} · {orderMode === 'subscription' ? weekdays.join(', ') || 'Choose weekdays' : 'Checkout once'}
              </small>
            </div>
          </div>

          <div className="builder-steps">
            {['Choose bakes', 'Schedule', 'Save or checkout'].map((label, index) => (
              <button className={step === index + 1 ? 'active' : ''} key={label} onClick={() => setStep(index + 1)} type="button">
                {index + 2}. {label}
              </button>
            ))}
          </div>

          <div className="builder-layout">
            <section className="builder-main">
              {step === 1 && (
                <div className="builder-products">
                  {products.map((product) => (
                    <article className="builder-product-card" key={product.id}>
                      <ProductImage src={product.image_url} alt={product.name} />
                      <div>
                        <h2>{product.name}</h2>
                        <p>{product.description}</p>
                        <strong>{formatPrice(product.price)}</strong>
                      </div>
                      <div className="cart-quantity">
                        <button onClick={() => updateQuantity(product.id, -1)} type="button">-</button>
                        <strong>{quantities[product.id] || 0}</strong>
                        <button onClick={() => updateQuantity(product.id, 1)} type="button">+</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="page-form builder-schedule">
                  <div className="builder-panel-intro">
                    <p className="eyebrow">Recurring setup</p>
                    <h2>Assign this box to delivery days.</h2>
                    <p>Subscriptions can run on any weekday. Keep one-time only for special custom orders.</p>
                  </div>
                  <div className="field-group">
                    <label>Order type</label>
                    <div className="segmented">
                      <button className={orderMode === 'one_time' ? 'selected' : ''} onClick={() => setOrderMode('one_time')} type="button">One-time</button>
                      <button className={orderMode === 'subscription' ? 'selected' : ''} onClick={() => setOrderMode('subscription')} type="button">Subscription</button>
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Fulfilment</label>
                    <div className="segmented">
                      <button className={fulfillmentMethod === 'pickup' ? 'selected' : ''} onClick={() => setFulfillmentMethod('pickup')} type="button">Pickup</button>
                      <button className={fulfillmentMethod === 'delivery' ? 'selected' : ''} onClick={() => setFulfillmentMethod('delivery')} type="button">Local Delivery</button>
                    </div>
                  </div>
                  {orderMode === 'subscription' && (
                    <div className="field-group">
                      <label>Assign this box to weekdays</label>
                      <div className="weekday-selector">
                        {WEEKDAYS.map((day) => (
                          <button className={weekdays.includes(day) ? 'active' : ''} key={day} onClick={() => toggleWeekday(day)} type="button">
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="checkout-button" disabled={!valid} onClick={() => setStep(3)} type="button">Continue</button>
                </div>
              )}

              {step === 3 && (
                <div className="page-form builder-save">
                  <div className="builder-panel-intro">
                    <p className="eyebrow">Saved box</p>
                    <h2>Save and manage this plan.</h2>
                    <p>Saved boxes can be reordered later or used as the base for recurring subscriptions.</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="boxName">Box name</label>
                    <input id="boxName" value={boxName} onChange={(event) => setBoxName(event.target.value)} />
                  </div>
                  <form className="saved-box-login" onSubmit={loadSavedBoxes}>
                    <div className="field-group">
                      <label htmlFor="email">Email for saved boxes</label>
                      <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                    <button className="secondary-link" type="submit">Load saved boxes</button>
                  </form>
                  <div className="builder-actions">
                    <button className="secondary-link" disabled={!valid || !email} onClick={saveBox} type="button">Save box</button>
                    <button className="checkout-button" disabled={!valid} onClick={() => addBoxToCart()} type="button">
                      {orderMode === 'subscription' ? 'Add recurring box to cart' : 'Add one-time box to cart'}
                    </button>
                  </div>
                  {savedBoxes.length > 0 && (
                    <section className="saved-boxes">
                      <p className="eyebrow">Saved boxes</p>
                      {savedBoxes.map((box) => (
                        <article key={box.id}>
                          <div>
                            <strong>{box.name}</strong>
                            <span>{box.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items · {formatPrice(box.total)}</span>
                          </div>
                          <button onClick={() => addBoxToCart(box)} type="button">Reorder</button>
                        </article>
                      ))}
                    </section>
                  )}
                </div>
              )}
            </section>

            <aside className="builder-summary">
              <div className="builder-summary-main">
                <span>Plan summary</span>
                <strong>{formatPrice(total)}</strong>
              <p>{itemCount}/{MAX_ITEMS} selected · min {MIN_ITEMS}</p>
              </div>
              <div className="builder-mini-list">
              {selectedItems.slice(0, 5).map((item) => (
                <div className="summary-row" key={item.product_id}>
                  <span>{item.quantity}x {item.name}</span>
                </div>
              ))}
              {selectedItems.length > 5 && <p>+ {selectedItems.length - 5} more items</p>}
              </div>
              {!valid && <div className="form-error">Choose between {MIN_ITEMS} and {MAX_ITEMS} items.</div>}
              <Link className="secondary-link full-builder-link" href="/cart">View cart</Link>
            </aside>
          </div>
        </section>
      </Layout>
    </>
  );
}

function isBuilderProduct(product) {
  const category = product.metadata?.category || product.category;
  return product.active !== false && category !== 'Boxes & Bundles';
}
