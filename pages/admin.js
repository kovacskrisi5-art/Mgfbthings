import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabase';
import { formatPrice } from '../lib/cart';
import { categoryLabel, isLowStock } from '../lib/operations';
import { REFUND_META, REFUND_STATUSES } from '../lib/status';

const emptyProduct = {
  name: '',
  description: '',
  price: 0,
  stock_quantity: 0,
  inventory_category: 'leftover_stock',
  is_ready_now: true,
  pickup_ready_minutes: 0,
  low_stock_threshold: 3,
  active: true,
  badge: '',
  accent: '#9b4d24',
  image_url: '',
};

export default function Admin() {
  const [supabase] = useState(() => {
    try { return getSupabaseBrowserClient(); } catch { return null; }
  });
  const [session, setSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('boxes');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const authHeaders = useCallback(async () => {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  const loadAdminData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/admin/orders?${params}`, { headers }),
        fetch('/api/products'),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      if (!ordersRes.ok) throw new Error(ordersData.error || 'Orders could not be loaded.');
      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, statusFilter, dateFilter, session]);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    if (!supabase) { setAuthError('Supabase is not configured yet.'); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword(authForm);
    if (loginError) setAuthError(loginError.message);
  }

  async function updateStatus(id, status, extra = {}) {
    const headers = await authHeaders();
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, ...extra }),
    });
    loadAdminData();
  }

  async function saveProduct(e) {
    e.preventDefault();
    const headers = await authHeaders();
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch('/api/admin/products', {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...productForm, id: editingId } : productForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Product could not be saved.'); return; }
    setProductForm(emptyProduct);
    setEditingId('');
    loadAdminData();
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    const headers = await authHeaders();
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE', headers });
    loadAdminData();
  }

  function editProduct(product) {
    setEditingId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      stock_quantity: product.stock_quantity || 0,
      inventory_category: product.inventory_category || 'leftover_stock',
      is_ready_now: Boolean(product.is_ready_now),
      pickup_ready_minutes: product.pickup_ready_minutes || 0,
      low_stock_threshold: product.low_stock_threshold || 3,
      active: product.active !== false,
      badge: product.badge || '',
      accent: product.accent || '#9b4d24',
      image_url: product.image_url || '',
    });
    setTab('products');
  }

  const todayStr = new Date().toDateString();
  const todaysOrders = useMemo(
    () => orders.filter((o) => new Date(o.created_at).toDateString() === todayStr && o.status !== 'cancelled'),
    [orders, todayStr]
  );
  const pickedUpToday = todaysOrders.filter((o) => o.status === 'delivered').length;
  const dailyRevenue = todaysOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const lowStockCount = products.filter(isLowStock).length;

  if (!session) {
    return (
      <>
        <Head><title>Admin | Gluten Free Save Club</title></Head>
        <main className="admin-login">
          <section className="admin-login-card">
            <div className="brand-mark">GF</div>
            <h1>Save Club Admin</h1>
            <form onSubmit={handleLogin}>
              <input autoFocus placeholder="Admin email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
              <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
              {authError && <p className="form-error">{authError}</p>}
              <button className="admin-primary" type="submit">Sign in</button>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head><title>Admin | Gluten Free Save Club</title></Head>
      <main className="admin-page">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Gluten Free Save Club</p>
            <h1>Admin</h1>
          </div>
          <div className="admin-header-actions">
            <Link href="/">View shop</Link>
            <button onClick={() => supabase.auth.signOut()} type="button">Sign out</button>
          </div>
        </header>

        <section className="admin-stats">
          <Stat label="Today's orders" value={todaysOrders.length} highlight />
          <Stat label="Picked up today" value={pickedUpToday} />
          <Stat label="Today's revenue" value={formatPrice(dailyRevenue)} />
          <Stat label="Low stock alerts" value={lowStockCount} warn={lowStockCount > 0} />
        </section>

        {error && <div className="admin-alert">{error}</div>}

        <section className="admin-toolbar">
          <button className={tab === 'boxes' ? 'active' : ''} onClick={() => setTab('boxes')} type="button">Box Manager</button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')} type="button">Orders</button>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')} type="button">Products</button>
          <button onClick={loadAdminData} type="button" style={{ marginLeft: 'auto' }}>Refresh</button>
        </section>

        {tab === 'orders' && (
          <section className="admin-filters">
            <label>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="active">Active</option>
                <option value="all">All</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              Date
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </label>
            <button
              className="secondary-link compact-button"
              onClick={() => { setStatusFilter('active'); setDateFilter(''); }}
              type="button"
            >
              Clear
            </button>
          </section>
        )}

        {loading ? (
          <div className="admin-empty">Loading...</div>
        ) : tab === 'boxes' ? (
          <BoxManager products={products} orders={orders} authHeaders={authHeaders} onSaved={loadAdminData} />
        ) : tab === 'orders' ? (
          <section className="admin-orders">
            {orders.length === 0
              ? <div className="admin-empty">No orders yet.</div>
              : orders.map((order) => (
                <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />
              ))
            }
          </section>
        ) : (
          <section className="admin-product-grid">
            <ProductForm
              form={productForm}
              setForm={setProductForm}
              onSubmit={saveProduct}
              editing={Boolean(editingId)}
              onCancel={() => { setEditingId(''); setProductForm(emptyProduct); }}
            />
            <div className="admin-orders">
              {products.map((product) => (
                <article className="admin-order" key={product.id}>
                  <div className="admin-order-top">
                    <div>
                      <h2>{product.name}</h2>
                      <p>{formatPrice(product.price)} &middot; {product.stock_quantity} in stock &middot; {categoryLabel(product.inventory_category)}</p>
                    </div>
                    <div className="order-badges">
                      {product.stock_quantity <= (product.low_stock_threshold || 3) && product.stock_quantity > 0 && (
                        <span className="warning-pill">Low stock</span>
                      )}
                      <span className="status-pill" style={{ background: product.active ? '#e8f5e9' : '#fff0ee', color: product.active ? '#2e6d32' : '#8d2118' }}>
                        {product.active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>{product.description}</p>
                  <div className="status-controls">
                    <div>
                      <button onClick={() => editProduct(product)} type="button">Edit</button>
                      <button onClick={() => deleteProduct(product.id)} type="button">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, highlight, warn }) {
  return (
    <article className={`admin-stat${highlight ? ' highlight' : ''}${warn ? ' warn' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function OrderCard({ order, onStatusChange }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(order.cancellation_reason || '');
  const [refundStatus, setRefundStatus] = useState(order.refund_status || 'not_required');

  const isPendingPickup = order.status !== 'delivered' && order.status !== 'cancelled';
  const isPickedUp = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  function submitCancellation(e) {
    e.preventDefault();
    onStatusChange(order.id, 'cancelled', {
      cancelledBy: 'bakery',
      cancellationReason: cancelReason,
      refundStatus,
    });
    setCancelOpen(false);
  }

  return (
    <article className={`admin-order${isCancelled ? ' is-cancelled' : ''}${isPickedUp ? ' is-done' : ''}`}>
      <div className="admin-order-top">
        <div>
          <h2>{order.customer_name || 'Guest'}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{order.customer_email}</p>
        </div>
        <div className="order-badges">
          {isPickedUp && <span className="status-pill" style={{ background: '#e8f5e9', color: '#2e6d32' }}>Picked up</span>}
          {isCancelled && <span className="status-pill" style={{ background: '#fff0ee', color: '#8d2118' }}>Cancelled</span>}
          {isPendingPickup && <span className="status-pill" style={{ background: '#fff3e0', color: '#9a4b00' }}>Waiting for pickup</span>}
        </div>
      </div>

      <div className="order-summary-row">
        <div className="included admin-items">
          <ul>
            {(order.order_items || []).map((item) => (
              <li key={item.id}><strong>{item.quantity}&times;</strong> {item.product_name}</li>
            ))}
          </ul>
        </div>
        <div className="order-meta-col">
          <span className="order-total">{formatPrice(order.total)}</span>
          {order.customer_address && order.customer_address !== 'Pickup' && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{order.customer_address}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {isCancelled && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Reason: {order.cancellation_reason || 'No reason given'}
        </p>
      )}

      {isPendingPickup && (
        <div className="order-actions">
          <button
            className="pickup-confirm-button"
            onClick={() => onStatusChange(order.id, 'delivered')}
            type="button"
          >
            Mark as picked up
          </button>
          <button
            className="danger-link"
            onClick={() => setCancelOpen(!cancelOpen)}
            type="button"
          >
            Cancel order
          </button>
        </div>
      )}

      {cancelOpen && (
        <form className="cancel-form" onSubmit={submitCancellation}>
          <div className="field-group">
            <label htmlFor={`cancel-${order.id}`}>Reason for cancellation</label>
            <textarea
              id={`cancel-${order.id}`}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer requested, stock issue..."
            />
          </div>
          <div className="field-group">
            <label htmlFor={`refund-${order.id}`}>Refund</label>
            <select
              id={`refund-${order.id}`}
              value={refundStatus}
              onChange={(e) => setRefundStatus(e.target.value)}
            >
              {REFUND_STATUSES.map((s) => (
                <option key={s} value={s}>{REFUND_META[s].label}</option>
              ))}
            </select>
          </div>
          <button className="admin-primary" type="submit">Confirm cancellation</button>
        </form>
      )}
    </article>
  );
}

function BoxManager({ products, orders, authHeaders, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');

  async function updateBox(productId, updates) {
    setSaving(true);
    setSavedId('');
    const headers = await authHeaders();
    const payload = { id: productId };
    for (const [field, value] of Object.entries(updates)) {
      payload[field] = typeof value === 'boolean' ? value : Number(value);
    }
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) { setSavedId(productId); onSaved(); }
  }

  const rescueBoxes = products.filter(
    (p) => p.inventory_category === 'leftover_stock' || p.metadata?.category === 'Rescue Boxes'
  );

  const todayStr = new Date().toDateString();
  const orderedTodayMap = useMemo(() => {
    const map = {};
    for (const order of orders) {
      if (new Date(order.created_at).toDateString() !== todayStr) continue;
      if (order.status === 'cancelled') continue;
      for (const item of (order.order_items || [])) {
        map[item.product_id] = (map[item.product_id] || 0) + Number(item.quantity || 0);
      }
    }
    return map;
  }, [orders, todayStr]);

  return (
    <section className="box-manager">
      <div className="section-heading" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Today&apos;s rescue boxes</p>
        <h2>Set daily stock</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          Each morning: enter how many boxes you have. Stock goes down automatically as orders come in.
          Set to 0 to hide a box from the shop.
        </p>
      </div>

      {rescueBoxes.length === 0 ? (
        <div className="admin-empty">
          No rescue boxes found. Add boxes in the Products tab with category &quot;Leftover stock&quot;.
        </div>
      ) : (
        <div className="box-manager-grid">
          {rescueBoxes.map((product) => (
            <BoxManagerCard
              key={product.id}
              product={product}
              orderedToday={orderedTodayMap[product.id] || 0}
              onUpdate={updateBox}
              saving={saving}
              justSaved={savedId === product.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BoxManagerCard({ product, orderedToday, onUpdate, saving, justSaved }) {
  const [stock, setStock] = useState(String(product.stock_quantity ?? 0));
  const [price, setPrice] = useState(String(product.price ?? 0));
  const remaining = product.stock_quantity ?? 0;
  const soldOut = remaining < 1;

  return (
    <article className="admin-order box-manager-card" style={{ '--accent': product.accent || '#835832' }}>
      <div className="admin-order-top">
        <div>
          <h2>{product.name}</h2>
          {(product.bakery_name || product.zone) && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {product.bakery_name}{product.zone ? ` · ${product.zone}` : ''}
            </p>
          )}
        </div>
        <span
          className="status-pill"
          style={{
            background: soldOut ? '#fff0ee' : '#e8f5e9',
            color: soldOut ? '#8d2118' : '#2e6d32',
          }}
        >
          {soldOut ? 'Sold out' : `${remaining} left`}
        </span>
      </div>

      <div className="box-stock-summary">
        <div className="box-stock-cell">
          <strong>{orderedToday}</strong>
          <span>ordered today</span>
        </div>
        <div className="box-stock-cell">
          <strong>{remaining}</strong>
          <span>remaining</span>
        </div>
        <div className="box-stock-cell">
          <strong>{formatPrice(product.price)}</strong>
          <span>rescue price</span>
        </div>
      </div>

      <div className="box-manager-fields">
        <div className="field-group">
          <label>Stock for today</label>
          <div className="box-manager-input-row">
            <input type="number" min="0" max="99" value={stock} onChange={(e) => setStock(e.target.value)} />
            <button
              className="checkout-button"
              disabled={saving}
              onClick={() => onUpdate(product.id, { stock_quantity: stock })}
              type="button"
            >
              Set
            </button>
          </div>
        </div>
        <div className="field-group">
          <label>Rescue price (pence)</label>
          <div className="box-manager-input-row">
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            <button
              className="checkout-button"
              disabled={saving}
              onClick={() => onUpdate(product.id, { price })}
              type="button"
            >
              Set
            </button>
          </div>
          <p className="field-hint">{formatPrice(Number(price))} &mdash; pence (699 = &pound;6.99)</p>
        </div>
      </div>

      <div className="box-frozen-toggle">
        <button
          className={`frozen-toggle-btn${product.is_ready_now ? ' toggle-fresh' : ' toggle-frozen'}`}
          disabled={saving}
          onClick={() => onUpdate(product.id, { is_ready_now: !product.is_ready_now })}
          type="button"
        >
          {product.is_ready_now ? 'Fresh — ready now' : 'Frozen — needs thawing'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>tap to toggle</span>
      </div>

      {justSaved && <p style={{ color: '#2e6d32', fontWeight: 700, fontSize: 13, marginTop: 8 }}>Saved.</p>}
    </article>
  );
}

function ProductForm({ form, setForm, onSubmit, editing, onCancel }) {
  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  return (
    <form className="checkout-form page-form admin-product-form" onSubmit={onSubmit}>
      <h2>{editing ? 'Edit product' : 'Add product'}</h2>
      <Field label="Name" name="name" value={form.name} onChange={update} />
      <div className="field-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" value={form.description} onChange={update} />
      </div>
      <Field label="Price in pence" name="price" type="number" value={form.price} onChange={update} />
      <Field label="Stock quantity" name="stock_quantity" type="number" value={form.stock_quantity} onChange={update} />
      <Field label="Low stock threshold" name="low_stock_threshold" type="number" value={form.low_stock_threshold} onChange={update} />
      <div className="field-group">
        <label htmlFor="inventory_category">Inventory category</label>
        <select id="inventory_category" name="inventory_category" value={form.inventory_category} onChange={update}>
          <option value="leftover_stock">Rescue Box (Leftover stock)</option>
          <option value="fresh_today">Fresh today</option>
          <option value="frozen">Frozen</option>
          <option value="pre_order">Pre-order</option>
        </select>
      </div>
      <Field label="Badge text (e.g. Save today)" name="badge" value={form.badge} onChange={update} />
      <Field label="Accent colour" name="accent" value={form.accent} onChange={update} />
      <Field label="Image path" name="image_url" value={form.image_url} onChange={update} />
      <label className="checkbox-row">
        <input checked={form.active} name="active" onChange={update} type="checkbox" />
        Visible in shop
      </label>
      <label className="checkbox-row">
        <input checked={form.is_ready_now} name="is_ready_now" onChange={update} type="checkbox" />
        Ready for instant pickup
      </label>
      <button className="checkout-button full" type="submit">{editing ? 'Save changes' : 'Add product'}</button>
      {editing && <button className="secondary-link detail-link" onClick={onCancel} type="button">Cancel edit</button>}
    </form>
  );
}

function Field({ label, name, type = 'text', value, onChange }) {
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} onChange={onChange} required type={type} value={value} />
    </div>
  );
}
