import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { cartCount, readCart } from '../lib/cart';

export default function Layout({ children }) {
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      setCount(cartCount(readCart()));
    }

    refresh();
    window.addEventListener('cart:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cart:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <main className="shop-shell app-transition">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="The Gluten Free Bakery home">
          <img className="brand-logo" src="/assets/brand/the-gluten-free-bakery-logo.svg" alt="" />
          <span>
            <strong>My Gluten Free Bakery</strong>
            <small>Fresh sourdough bakes, without compromise</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/#boxes">Shop bread</Link>
          <Link href="/#available-now">Available now</Link>
          <Link href="/build-box">Build a box</Link>
          <Link href="/track">Track</Link>
          <Link className="cart-link" href="/cart" aria-label={`Cart with ${count} items`}>
            Cart <span>{count}</span>
          </Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>
      {children}
      <nav className="bottom-nav" aria-label="Mobile app navigation">
        <Link className={router.pathname === '/' ? 'active' : ''} href="/">Shop</Link>
        <Link href="/#available-now">Now</Link>
        <Link className={router.pathname === '/build-box' ? 'active' : ''} href="/build-box">Build</Link>
        <Link className={router.pathname === '/cart' ? 'active' : ''} href="/cart">Cart <span>{count}</span></Link>
      </nav>
    </main>
  );
}
