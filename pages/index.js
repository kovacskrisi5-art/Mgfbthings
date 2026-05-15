import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import ProductGallery from '../components/ProductGallery';
import ProductImage from '../components/ProductImage';
import { addToCart, formatPrice } from '../lib/cart';
import { categoryLabel, isAvailableNow, pickupReadyLabel, stockLabel } from '../lib/operations';
import { HERO_IMAGE } from '../lib/product-media';
import { PRODUCTS } from '../lib/products';

function seedProducts() {
  return PRODUCTS.map((product, index) => ({
    id: product.id,
    slug: product.id,
    name: product.name,
    description: product.description,
    price: product.weeklyPrice,
    stock_quantity: 20,
    inventory_category: product.inventory_category || (product.category === 'Boxes & Bundles' ? 'pre_order' : 'fresh_today'),
    is_ready_now: product.is_ready_now !== undefined ? product.is_ready_now : product.category !== 'Boxes & Bundles',
    pickup_ready_minutes: product.pickup_ready_minutes || 0,
    low_stock_threshold: product.low_stock_threshold || 4,
    active: true,
    badge: product.badge,
    accent: product.accent,
    image_url: product.image_url || '',
    gallery_images: product.gallery_images || [product.image_url].filter(Boolean),
    metadata: product,
    sort_order: index + 1,
  }));
}

export default function Home({ cancelled }) {
  const [products, setProducts] = useState(seedProducts);
  const [selectedId, setSelectedId] = useState(PRODUCTS[0].id);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => {
        if (mounted && data.products?.length) setProducts(data.products);
      })
      .catch(() => {
        if (mounted) setError('Live products are unavailable, so the starter menu is showing.');
      })
      .finally(() => mounted && setLoading(false));

    const interval = window.setInterval(() => {
      fetch('/api/products')
        .then((response) => response.json())
        .then((data) => {
          if (mounted && data.products?.length) setProducts(data.products);
        })
        .catch(() => {});
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false && product.stock_quantity > 0),
    [products]
  );
  const availableNow = useMemo(() => activeProducts.filter(isAvailableNow), [activeProducts]);
  const selected = activeProducts.find((product) => product.id === selectedId) || activeProducts[0];

  function handleAdd(product = selected) {
    if (!product || product.stock_quantity < 1) return;
    addToCart(product, 1);
    setNotice(`${product.name} added to your cart.`);
  }

  function handleReserve(product) {
    addToCart(product, 1, { instantPickup: true });
    setNotice(`${product.name} reserved for instant pickup. Opening checkout to pay online.`);
    window.location.assign('/checkout');
  }

  return (
    <>
      <Head>
        <title>My Gluten Free Bakery | Fresh gluten-free sourdough delivered</title>
        <meta
          name="description"
          content="Order gluten-free sourdough loaves, bagels, baguettes, and mixed boxes from My Gluten Free Bakery."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Layout>
        {cancelled && (
          <div className="notice" role="status">
            Checkout was cancelled. Your bakery cart is still here when you are ready.
          </div>
        )}
        {notice && <div className="notice" role="status">{notice}</div>}
        {error && <div className="form-error">{error}</div>}

        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">100% gluten-free sourdough bakes</p>
            <h1>Forget the restrictions.</h1>
            <p className="hero-text">
              Indulge in high-quality gluten-free bread, made without compromise. Shop sourdough loaves, chewy bagels, baguettes, and better-value boxes.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#boxes">Shop bread</a>
              <Link className="secondary-link" href="/build-box">Build your own box</Link>
              <Link className="secondary-link" href="/track">Track an order</Link>
            </div>
          </div>

          <div className="hero-image-board" aria-label="Fresh gluten-free bakery selection">
            <ProductImage src={HERO_IMAGE} alt="Fresh gluten-free bakery selection" priority />
            <div className="note-card hero-note">
              <strong>Fresh to order</strong>
              <span>Free UK delivery over £35</span>
            </div>
          </div>
        </section>

        <section className="section intro-grid" id="delivery">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Hand-made, fresh to order, easy to track.</h2>
          </div>
          <div className="steps">
            <Step number="01" title="Mix, match, munch" text="Pick from bagels, loaves, baguettes, and bundles inspired by the real bakery menu." />
            <Step number="02" title="Checkout securely" text="Enter delivery or pickup details and pay in Stripe test mode." />
            <Step number="03" title="Track status" text="Follow each order from received through delivered." />
          </div>
        </section>

        <section className="section" id="available-now">
          <div className="section-heading">
            <p className="eyebrow">Available now</p>
            <h2>Ready for instant pickup today.</h2>
          </div>

          {loading ? (
            <div className="admin-empty">Checking today’s live stock...</div>
          ) : availableNow.length === 0 ? (
            <div className="admin-empty">Nothing is ready for instant pickup right now.</div>
          ) : (
            <div className="available-grid">
              {availableNow.map((product) => (
                <article className="available-card" key={product.id} style={{ '--accent': product.accent || '#9b4d24' }}>
                  <ProductImage src={product.image_url} alt={product.name} />
                  <div>
                    <span className="product-badge">{categoryLabel(product.inventory_category)}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <strong>{formatPrice(product.price)}</strong>
                  </div>
                  <div className="availability-row">
                    <span className={product.stock_quantity <= 3 ? 'low-stock-text' : ''}>
                      {stockLabel(product.stock_quantity)}
                    </span>
                    <span>{pickupReadyLabel(product.pickup_ready_minutes)}</span>
                  </div>
                  <button className="checkout-button full" onClick={() => handleReserve(product)} type="button">
                    Reserve for pickup
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section" id="boxes">
          <div className="section-heading">
            <p className="eyebrow">Fresh from the oven</p>
            <h2>Bagels, loaves, baguettes, and boxes.</h2>
          </div>

          {loading ? (
            <div className="admin-empty">Loading the bakery menu...</div>
          ) : (
            <div className="product-layout">
              <div className="product-list" role="list">
                {activeProducts.map((product) => (
                  <button
                    className={`product-row ${selected?.id === product.id ? 'is-active' : ''}`}
                    key={product.id}
                    onClick={() => setSelectedId(product.id)}
                    style={{ '--accent': product.accent || '#9b4d24' }}
                    type="button"
                  >
                    <span>
                      <strong>{product.name}</strong>
                      <small>{stockLabel(product.stock_quantity)}</small>
                    </span>
                    <span>{formatPrice(product.price)}</span>
                  </button>
                ))}
              </div>

              {selected && (
                <article className="product-detail" style={{ '--accent': selected.accent || '#9b4d24' }}>
                  <ProductGallery primary={selected.image_url} images={selected.gallery_images} alt={selected.name} />
                  <div className="product-badge">{selected.badge || 'Fresh bake'}</div>
                  <div className="product-kicker">{selected.metadata?.shortName || 'Bakery item'}</div>
                  <h3>{selected.name}</h3>
                  <p>{selected.description}</p>

                  <dl className="product-facts">
                    <div>
                      <dt>Price</dt>
                      <dd>{formatPrice(selected.price)}</dd>
                    </div>
                    <div>
                      <dt>Stock</dt>
                      <dd>{selected.stock_quantity > 0 ? `${selected.stock_quantity} available` : 'Sold out'}</dd>
                    </div>
                  </dl>

                  {selected.metadata?.includes?.length > 0 && (
                    <div className="included">
                      <span>Included</span>
                      <ul>
                        {selected.metadata.includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="product-actions">
                    <button
                      className="checkout-button"
                      disabled={selected.stock_quantity < 1}
                      onClick={() => handleAdd(selected)}
                      type="button"
                    >
                      {selected.stock_quantity > 0 ? 'Add to cart' : 'Sold out'}
                    </button>
                    <Link className="secondary-link detail-link" href={`/products/${selected.slug || selected.id}`}>
                      View details
                    </Link>
                  </div>
                </article>
              )}
            </div>
          )}
        </section>

        <section className="section promise-band">
          <Promise title="Dedicated gluten-free kitchen" text="Every item is built around gluten-free sourdough baking and premium ingredients." />
          <Promise title="Fresh to order" text="The bakery bakes by rhythm, with UK delivery and pickup-style fulfilment built in." />
          <Promise title="Track every bake" text="Customers can follow every stage from received to delivered." />
        </section>
      </Layout>
    </>
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

export async function getServerSideProps({ query }) {
  return { props: { cancelled: query.cancelled === 'true' } };
}
