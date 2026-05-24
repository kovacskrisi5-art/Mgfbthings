import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { cartTotal, formatPrice, readCart } from '../lib/cart';
import { getSupabaseBrowserClient } from '../lib/supabase';

const DEFAULT_PICKUP = 'Address confirmed in your order confirmation email';

export default function Checkout() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('guest'); // 'guest' | 'login' | 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [session, setSession] = useState(null);
  const [supabase] = useState(() => { try { return getSupabaseBrowserClient(); } catch { return null; } });

  const subtotal = cartTotal(items);

  // Group items by bakery/pickup location
  const pickupLocations = [...new Map(
    items
      .filter((i) => i.pickup_address || i.bakery_name)
      .map((i) => [i.pickup_address || i.bakery_name, { bakery_name: i.bakery_name, zone: i.zone, pickup_address: i.pickup_address }])
  ).values()];

  useEffect(() => {
    setItems(readCart());
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      if (s?.user) {
        setForm((f) => ({
          ...f,
          customerEmail: s.user.email || f.customerEmail,
          customerName: s.user.user_metadata?.full_name || f.customerName,
        }));
        setAuthMode('guest');
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setForm((f) => ({
          ...f,
          customerEmail: s.user.email || f.customerEmail,
          customerName: s.user.user_metadata?.full_name || f.customerName,
        }));
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    if (!supabase) return;
    try {
      if (authMode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword(authForm);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { full_name: form.customerName } },
        });
        if (err) throw err;
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  async function submitCheckout(e) {
    e.preventDefault();
    setError('');
    if (!items.length) { setError('Your cart is empty.'); return; }
    if (!form.customerName.trim()) { setError('Please enter your name.'); return; }
    if (!form.customerEmail.trim()) { setError('Please enter your email.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          notes: form.notes,
          fulfillmentMethod: 'pickup',
          deliveryDay: '',
          productionDate: new Date().toISOString().slice(0, 10),
          items,
          deliveryFee: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head><title>Checkout | Gluten Free Save Club</title></Head>
      <Layout>
        <section className="section checkout-page">
          <div className="section-heading">
            <p className="eyebrow">Checkout</p>
            <h1>Complete your rescue order.</h1>
          </div>

          <div className="checkout-layout">
            <div>
              {/* Account section */}
              {supabase && (
                <div className="auth-panel">
                  {session ? (
                    <div className="auth-signed-in">
                      <span>Signed in as <strong>{session.user.email}</strong></span>
                      <button className="auth-link" onClick={handleSignOut} type="button">Sign out</button>
                    </div>
                  ) : (
                    <>
                      <div className="auth-tabs">
                        <button
                          className={authMode === 'guest' ? 'active' : ''}
                          onClick={() => setAuthMode('guest')}
                          type="button"
                        >
                          Guest checkout
                        </button>
                        <button
                          className={authMode === 'login' ? 'active' : ''}
                          onClick={() => setAuthMode('login')}
                          type="button"
                        >
                          Sign in
                        </button>
                        <button
                          className={authMode === 'register' ? 'active' : ''}
                          onClick={() => setAuthMode('register')}
                          type="button"
                        >
                          Register
                        </button>
                      </div>

                      {authMode !== 'guest' && (
                        <form className="auth-form" onSubmit={handleAuth}>
                          <div className="field-group">
                            <label htmlFor="auth-email">Email</label>
                            <input
                              id="auth-email"
                              type="email"
                              required
                              value={authForm.email}
                              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                            />
                          </div>
                          <div className="field-group">
                            <label htmlFor="auth-password">Password</label>
                            <input
                              id="auth-password"
                              type="password"
                              required
                              minLength={6}
                              value={authForm.password}
                              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            />
                          </div>
                          {authError && <div className="form-error">{authError}</div>}
                          <button className="checkout-button" type="submit">
                            {authMode === 'login' ? 'Sign in' : 'Create account'}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Order form */}
              <form className="checkout-form page-form" onSubmit={submitCheckout}>
                <div className="field-group">
                  <label htmlFor="customerName">Full name</label>
                  <input
                    id="customerName"
                    name="customerName"
                    required
                    type="text"
                    value={form.customerName}
                    onChange={updateField}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="customerEmail">Email</label>
                  <input
                    id="customerEmail"
                    name="customerEmail"
                    required
                    type="email"
                    value={form.customerEmail}
                    onChange={updateField}
                  />
                </div>

                <div className="pickup-info-box">
                  <span className="pickup-info-label">Pickup only</span>
                  {pickupLocations.length > 0 ? pickupLocations.map((loc, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      {loc.bakery_name && <p style={{ fontWeight: 700, marginBottom: 2 }}>{loc.bakery_name}{loc.zone ? ` · ${loc.zone}` : ''}</p>}
                      <p>{loc.pickup_address || DEFAULT_PICKUP}</p>
                    </div>
                  )) : (
                    <p style={{ marginTop: 6 }}>{DEFAULT_PICKUP}</p>
                  )}
                  <p className="field-hint">Collect today before 18:00.</p>
                </div>

                <div className="field-group">
                  <label htmlFor="notes">Notes (optional)</label>
                  <textarea id="notes" name="notes" onChange={updateField} value={form.notes} rows={2} />
                </div>

                {error && <div className="form-error">{error}</div>}
                <button className="checkout-button full" disabled={submitting || !items.length} type="submit">
                  {submitting ? 'Opening secure checkout...' : `Pay ${formatPrice(subtotal)} with Stripe`}
                </button>
              </form>
            </div>

            <aside className="cart-summary">
              <span>Your rescue order</span>
              <strong>{formatPrice(subtotal)}</strong>
              {items.map((item) => (
                <p key={item.product_id}>
                  {item.quantity}x {item.name}
                </p>
              ))}
              {!items.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your cart is empty.</p>}
              <div className="summary-row"><span>Pickup</span><strong>Free</strong></div>
              <div className="summary-row total"><span>Due today</span><strong>{formatPrice(subtotal)}</strong></div>
            </aside>
          </div>
        </section>
      </Layout>
    </>
  );
}
