import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProductGallery from '../../components/ProductGallery';
import { addToCart, formatPrice } from '../../lib/cart';

export default function ProductDetail({ slug }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => {
        const match = (data.products || []).find((item) => item.slug === slug || item.id === slug);
        setProduct(match || null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  function handleAdd() {
    addToCart(product, 1);
    setNotice(`${product.name} added to your cart.`);
  }

  return (
    <>
      <Head>
        <title>{product ? `${product.name} | My Gluten Free Bakery` : 'Product details'}</title>
      </Head>
      <Layout>
        {notice && <div className="notice">{notice}</div>}
        {loading ? (
          <div className="admin-empty">Loading product details...</div>
        ) : !product ? (
          <div className="admin-empty">This product could not be found.</div>
        ) : (
          <article className="product-detail standalone-detail" style={{ '--accent': product.accent || '#9b4d24' }}>
            <ProductGallery primary={product.image_url} images={product.gallery_images} alt={product.name} />
            <div className="product-badge">{product.badge || 'Fresh bake'}</div>
            <div className="product-kicker">Product details</div>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <dl className="product-facts">
              <div>
                <dt>Price</dt>
                <dd>{formatPrice(product.price)}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>{product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Sold out'}</dd>
              </div>
            </dl>
            {product.metadata?.includes?.length > 0 && (
              <div className="included">
                <span>Included</span>
                <ul>
                  {product.metadata.includes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <div className="product-actions">
              <button className="checkout-button" disabled={product.stock_quantity < 1} onClick={handleAdd} type="button">
                {product.stock_quantity > 0 ? 'Add to cart' : 'Sold out'}
              </button>
              <Link className="secondary-link detail-link" href="/cart">Go to cart</Link>
            </div>
          </article>
        )}
      </Layout>
    </>
  );
}

export function getServerSideProps({ params }) {
  return { props: { slug: params.slug } };
}
