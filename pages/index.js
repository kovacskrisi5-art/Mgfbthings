import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import ProductImage from '../components/ProductImage';
import { addToCart, formatPrice } from '../lib/cart';
import { isAvailableNow, stockLabel } from '../lib/operations';
import { PRODUCTS } from '../lib/products';

function seedProducts() {
  return PRODUCTS.map((product, index) => ({
    id: product.id,
    slug: product.id,
    name: product.name,
    description: product.description,
    price: product.weeklyPrice,
    original_price: product.originalPrice || null,
    stock_quantity: 5,
    inventory_category: product.inventory_category || 'leftover_stock',
    is_ready_now: product.is_ready_now !== undefined ? product.is_ready_now : true,
    pickup_ready_minutes: product.pickup_ready_minutes || 0,
    low_stock_threshold: product.low_stock_threshold || 3,
    active: true,
    badge: product.badge,
    accent: product.accent,
    image_url: product.image_url || '',
    gallery_images: product.gallery_images || [],
    bakery_name: product.bakery_name || '',
    zone: product.zone || '',
    pickup_address: product.pickup_address || '',
    metadata: product,
    sort_order: index + 1,
  }));
}

function getDeadlineToday() {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  return d;
}

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setTimeLeft('Closed for today');
        setUrgent(false);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setUrgent(h < 1);
      if (h > 0) {
        setTimeLeft(`${h}h ${m}m left`);
      } else if (m > 0) {
        setTimeLeft(`${m}m ${s}s left`);
      } else {
        setTimeLeft(`${s}s left`);
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { timeLeft, urgent };
}

export default function Home({ cancelled }) {
  const [products, setProducts] = useState(seedProducts);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [zoneSearch, setZoneSearch] = useState('');
  const deadline = getDeadlineToday();
  const { timeLeft, urgent } = useCountdown(deadline.getTime());

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data.products?.length) {
          setProducts(
            data.products.map((p) => ({
              ...p,
              original_price: p.metadata?.originalPrice || null,
              bakery_name: p.bakery_name || p.metadata?.bakery_name || '',
              zone: p.zone || p.metadata?.zone || '',
              pickup_address: p.pickup_address || p.metadata?.pickup_address || '',
            }))
          );
        }
      })
      .catch(() => mounted && setError('Could not load live stock — showing today\'s default boxes.'))
      .finally(() => {});

    return () => { mounted = false; };
  }, []);

  const allBoxes = products.filter((p) => p.active !== false);
  const zones = [...new Set(allBoxes.map((p) => p.zone).filter(Boolean))].sort();
  const rescueBoxes = zoneSearch.trim()
    ? allBoxes.filter((p) => {
        const q = zoneSearch.toLowerCase();
        return p.zone?.toLowerCase().includes(q) || p.bakery_name?.toLowerCase().includes(q);
      })
    : allBoxes;

  function handleGrab(product) {
    if (!product || product.stock_quantity < 1) return;
    addToCart(product, 1, {
      instantPickup: true,
      bakery_name: product.bakery_name,
      zone: product.zone,
      pickup_address: product.pickup_address,
    });
    setNotice(`${product.name} added — head to cart to complete your pickup order.`);
  }

  return (
    <>
      <Head>
        <title>Gluten Free Save Club | Rescue fresh gluten-free bakes today</title>
        <meta
          name="description"
          content="Grab a rescue box of fresh gluten-free sourdough bread or bagels at a big discount. Pick up locally before they're gone."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Layout>
        {cancelled && (
          <div className="notice" role="status">
            Checkout was cancelled. Your rescue box is still waiting for you.
          </div>
        )}
        {notice && <div className="notice" role="status">{notice}</div>}
        {error && <div className="form-error">{error}</div>}

        <section className="hero rescue-hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Gluten Free Save Club</p>
            <h1>Rescue today&apos;s fresh bakes.</h1>
            <p className="hero-text">
              Fresh gluten-free sourdough bread and bagels — available at a big discount before the day ends.
              Pick up locally, freeze what you don&apos;t eat today.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#rescue-boxes">See today&apos;s boxes</a>
            </div>
          </div>
          <div className="rescue-hero-board" aria-hidden="true">
            <div className="rescue-badge-large">
              <span className="rescue-percent">50%</span>
              <span>off retail</span>
            </div>
            <div className="rescue-points">
              <RescuePoint icon="🌱" text="Less food waste" />
              <RescuePoint icon="🍞" text="100% gluten-free" />
              <RescuePoint icon="📦" text="Local pickup" />
            </div>
          </div>
        </section>

        <section className="section" id="rescue-boxes">
          <div className="zone-filter-row">
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <p className="eyebrow">Today&apos;s rescue boxes</p>
              <h2>Grab a box before they&apos;re gone.</h2>
            </div>
            <div className="zone-search-wrap">
              <input
                className="zone-search"
                type="search"
                placeholder="Search by area or bakery…"
                value={zoneSearch}
                onChange={(e) => setZoneSearch(e.target.value)}
                aria-label="Filter by area or bakery"
              />
              {zones.length > 0 && (
                <div className="zone-chips">
                  <button
                    className={`zone-chip${!zoneSearch ? ' active' : ''}`}
                    onClick={() => setZoneSearch('')}
                    type="button"
                  >
                    All areas
                  </button>
                  {zones.map((z) => (
                    <button
                      key={z}
                      className={`zone-chip${zoneSearch === z ? ' active' : ''}`}
                      onClick={() => setZoneSearch(zoneSearch === z ? '' : z)}
                      type="button"
                    >
                      {z}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`deadline-bar${urgent ? ' deadline-urgent' : ''}`} role="timer" aria-live="polite">
            <span className="deadline-dot" />
            <span>Collection closes at 18:00 today &mdash; <strong>{timeLeft}</strong></span>
          </div>

          {rescueBoxes.length === 0 ? (
            <div className="admin-empty">
              {zoneSearch ? `No boxes found in "${zoneSearch}" — try a different area.` : 'No rescue boxes available today. Check back tomorrow!'}
            </div>
          ) : (
            <div className="rescue-grid">
              {rescueBoxes.map((product) => (
                <RescueCard
                  key={product.id}
                  product={product}
                  onGrab={handleGrab}
                  timeLeft={timeLeft}
                  urgent={urgent}
                />
              ))}
            </div>
          )}
        </section>

        <section className="section how-it-works">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Simple as that.</h2>
          </div>
          <div className="steps">
            <Step number="01" title="Pick your box" text="Choose a Bread Box or Bagel Mix from today's available stock." />
            <Step number="02" title="Pay online" text="Quick checkout with Stripe — no account required, though you can save your details." />
            <Step number="03" title="Pick up locally" text="Come by before 18:00 to collect your box. You'll get a confirmation with the address." />
          </div>
        </section>

        <section className="section promise-band">
          <Promise title="Always gluten-free" text="Every item in every box is 100% gluten-free, vegan-friendly, and free from major allergens." />
          <Promise title="Up to 50% off" text="Rescue prices are set well below retail — you save money, we save perfectly good food." />
          <Promise title="Fresh every day" text="Boxes are filled the same morning. What's in them depends on the day's bake — always a pleasant surprise." />
        </section>
      </Layout>
    </>
  );
}

function RescueCard({ product, onGrab, urgent }) {
  const available = isAvailableNow(product);
  const sold = product.stock_quantity < 1;

  return (
    <article
      className={`rescue-card${sold ? ' rescue-card--sold' : ''}${urgent && !sold ? ' rescue-card--urgent' : ''}`}
      style={{ '--accent': product.accent || '#835832' }}
    >
      <div className="rescue-card-image">
        <ProductImage src={product.image_url} alt={product.name} />
        {product.badge && <span className="rescue-badge-pill">{product.badge}</span>}
        {product.original_price && (
          <span className="rescue-discount-pill">
            -{Math.round((1 - product.price / product.original_price) * 100)}%
          </span>
        )}
      </div>

      <div className="rescue-card-body">
        {(product.bakery_name || product.zone) && (
          <div className="rescue-card-bakery">
            {product.bakery_name && <span className="rescue-bakery-name">{product.bakery_name}</span>}
            {product.zone && <span className="rescue-zone-tag">{product.zone}</span>}
          </div>
        )}
        <h3>{product.name}</h3>
        <p className="rescue-card-desc">{product.description}</p>

        {product.metadata?.includes?.length > 0 && (
          <ul className="rescue-includes">
            {product.metadata.includes.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <div className="rescue-price-row">
          <div>
            <span className="rescue-price">{formatPrice(product.price)}</span>
            {product.original_price && (
              <span className="rescue-original-price">{formatPrice(product.original_price)}</span>
            )}
          </div>
          <span className={`rescue-stock${product.stock_quantity <= product.low_stock_threshold ? ' rescue-stock--low' : ''}`}>
            {stockLabel(product.stock_quantity)}
          </span>
        </div>

        <button
          className={`checkout-button full${sold ? ' disabled' : ''}`}
          disabled={sold}
          onClick={() => onGrab(product)}
          type="button"
        >
          {sold ? 'Sold out today' : 'Grab this box'}
        </button>
      </div>
    </article>
  );
}

function Step({ number, title, text }) {
  return (
    <article className="step-card">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Promise({ title, text }) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function RescuePoint({ icon, text }) {
  return (
    <div className="rescue-point">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  return { props: { cancelled: query.cancelled === 'true' } };
}
