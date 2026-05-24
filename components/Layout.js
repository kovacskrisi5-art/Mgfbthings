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
        <Link className="brand" href="/" aria-label="Gluten Free Save Club home">
          <img
            src="/assets/brand/gfsc-logo.svg"
            alt="Gluten Free Save Club"
            className="brand-logo-full"
          />
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/#rescue-boxes">Rescue boxes</Link>
          <Link className="cart-link" href="/cart" aria-label={`Cart with ${count} items`}>
            Cart <span>{count}</span>
          </Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>
      {children}
      <nav className="bottom-nav" aria-label="Mobile app navigation">
        <Link className={router.pathname === '/' ? 'active' : ''} href="/">Boxes</Link>
        <Link className={router.pathname === '/cart' ? 'active' : ''} href="/cart">Cart <span>{count}</span></Link>
      </nav>
    </main>
  );
}
