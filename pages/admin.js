import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabase';
import { formatPrice } from '../lib/cart';
import { categoryLabel, dailyProductTotals, isAvailableNow, isLowStock, upcomingWeekdays } from '../lib/operations';
import { ORDER_STATUSES, REFUND_META, REFUND_STATUSES, STATUS_META } from '../lib/status';
import { groupProductionByDate, isLastMinuteCancellation } from '../lib/production';

const emptyProduct = {
  name: '',
  description: '',
  price: 0,
  stock_quantity: 0,
  inventory_category: 'pre_order',
  is_ready_now: false,
  pickup_ready_minutes: 0,
  low_stock_threshold: 4,
  active: true,
  badge: '',
  accent: '#9b4d24',
  image_url: '',
};

export default function Admin() {
  const [supabase] = useState(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('orders');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: 'active', fulfillment: 'all', refund: 'all', date: '' });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
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
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.fulfillment !== 'all') params.set('fulfillment', filters.fulfillment);
      if (filters.refund !== 'all') params.set('refund', filters.refund);
      if (filters.date) params.set('date', filters.date);
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch(`/api/admin/orders?${params}`, { headers }),
        fetch('/api/products'),
      ]);
      const subscriptionsResponse = await fetch('/api/admin/subscriptions', { headers });
      const ordersData = await ordersResponse.json();
      const productsData = await productsResponse.json();
      const subscriptionsData = await subscriptionsResponse.json();
      if (!ordersResponse.ok) throw new Error(ordersData.error || 'Orders could not be loaded.');
      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
      if (subscriptionsResponse.ok) setSubscriptions(subscriptionsData.subscriptions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, filters, session]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError('');
    if (!supabase) {
      setAuthError('Supabase is not configured yet.');
      return;
    }
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

  async function saveProduct(event) {
    event.preventDefault();
    const headers = await authHeaders();
    const method = editingId ? 'PATCH' : 'POST';
    const response = await fetch('/api/admin/products', {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...productForm, id: editingId } : productForm),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Product could not be saved.');
      return;
    }
    setProductForm(emptyProduct);
    setEditingId('');
    loadAdminData();
  }

  async function deleteProduct(id) {
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
      inventory_category: product.inventory_category || 'pre_order',
      is_ready_now: Boolean(product.is_ready_now),
      pickup_ready_minutes: product.pickup_ready_minutes || 0,
      low_stock_threshold: product.low_stock_threshold || 4,
      active: product.active !== false,
      badge: product.badge || '',
      accent: product.accent || '#9b4d24',
      image_url: product.image_url || '',
    });
    setTab('products');
  }

  const todaysOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((order) => new Date(order.created_at).toDateString() === today && order.status !== 'cancelled');
  }, [orders]);
  const dailyRevenue = todaysOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeOrders = orders.filter((order) => order.status !== 'cancelled');
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled');
  const productionDays = useMemo(() => groupProductionByDate(orders), [orders]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysProduction = dailyProductTotals(orders, todayIso);
  const lowStockProducts = products.filter(isLowStock);
  const availableNowProducts = products.filter(isAvailableNow);
  const leftoverProducts = products.filter((product) => product.inventory_category === 'leftover_stock' && product.stock_quantity > 0);

  if (!session) {
    return (
      <>
        <Head><title>Admin | My Gluten Free Bakery</title></Head>
        <main className="admin-login">
          <section className="admin-login-card">
            <div className="brand-mark">GF</div>
            <h1>Bakery Admin</h1>
            <form onSubmit={handleLogin}>
              <input autoFocus placeholder="Admin email" type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
              <input placeholder="Password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
              {authError && <p>{authError}</p>}
              <button className="admin-primary" type="submit">Login</button>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head><title>Admin | My Gluten Free Bakery</title></Head>
      <main className="admin-page">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Fulfilment</p>
            <h1>Bakery Admin</h1>
          </div>
          <div className="admin-header-actions">
            <Link href="/">View shop</Link>
            <button onClick={() => supabase.auth.signOut()} type="button">Sign out</button>
          </div>
        </header>

        <section className="admin-stats">
          <Stat label="Active orders" value={activeOrders.length} />
          <Stat label="Today production" value={todaysProduction.reduce((sum, item) => sum + item.quantity, 0)} highlight />
          <Stat label="Low stock alerts" value={lowStockProducts.length} />
        </section>

        {error && <div className="admin-alert">{error}</div>}

        <section className="admin-toolbar">
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')} type="button">Orders</button>
          <button className={tab === 'production' ? 'active' : ''} onClick={() => setTab('production')} type="button">Production</button>
          <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')} type="button">Inventory</button>
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => setTab('subscriptions')} type="button">Subscriptions</button>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')} type="button">Products</button>
          <button onClick={loadAdminData} type="button">Refresh</button>
        </section>

        <section className="admin-filters">
          <label>
            Status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              {ORDER_STATUSES.filter((status) => status !== 'cancelled').map((status) => (
                <option key={status} value={status}>{STATUS_META[status].label}</option>
              ))}
            </select>
          </label>
          <label>
            Fulfilment
            <select value={filters.fulfillment} onChange={(event) => setFilters({ ...filters, fulfillment: event.target.value })}>
              <option value="all">All</option>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </label>
          <label>
            Refund
            <select value={filters.refund} onChange={(event) => setFilters({ ...filters, refund: event.target.value })}>
              <option value="all">All</option>
              {REFUND_STATUSES.map((status) => (
                <option key={status} value={status}>{REFUND_META[status].label}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
          </label>
          <button className="secondary-link compact-button" onClick={() => setFilters({ status: 'active', fulfillment: 'all', refund: 'all', date: '' })} type="button">Clear</button>
        </section>

        {loading ? (
          <div className="admin-empty">Loading admin dashboard...</div>
        ) : tab === 'orders' ? (
          <section className="admin-orders">
            {orders.length === 0 ? <div className="admin-empty">No orders yet.</div> : orders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />
            ))}
          </section>
        ) : tab === 'production' ? (
          <ProductionView days={productionDays} cancellations={cancelledOrders} />
        ) : tab === 'inventory' ? (
          <InventoryOps products={products} lowStock={lowStockProducts} availableNow={availableNowProducts} leftovers={leftoverProducts} onEdit={editProduct} />
        ) : tab === 'subscriptions' ? (
          <SubscriptionPlanner products={products} subscriptions={subscriptions} authHeaders={authHeaders} onSaved={loadAdminData} />
        ) : (
          <section className="admin-product-grid">
            <ProductForm form={productForm} setForm={setProductForm} onSubmit={saveProduct} editing={Boolean(editingId)} onCancel={() => { setEditingId(''); setProductForm(emptyProduct); }} />
            <div className="admin-orders">
              {products.map((product) => (
                <article className="admin-order" key={product.id}>
                  <div className="admin-order-top">
                    <div>
                      <h2>{product.name}</h2>
                      <p>
                        {formatPrice(product.price)} · {product.stock_quantity} in stock · {categoryLabel(product.inventory_category)}
                      </p>
                    </div>
                    <div className="order-badges">
                      {product.stock_quantity <= (product.low_stock_threshold || 4) && product.stock_quantity > 0 && (
                        <span className="warning-pill">Low stock</span>
                      )}
                      <span className="status-pill" style={{ background: product.is_ready_now ? '#e8f5e9' : '#fff8e1', color: product.is_ready_now ? '#2e6d32' : '#8a6500' }}>
                        {product.is_ready_now ? 'Ready now' : 'Not ready'}
                      </span>
                      <span className="status-pill" style={{ background: product.active ? '#e8f5e9' : '#fff0ee', color: product.active ? '#2e6d32' : '#8d2118' }}>
                        {product.active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <p>{product.description}</p>
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

function Stat({ label, value, highlight }) {
  return (
    <article className={`admin-stat ${highlight ? 'highlight' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function OrderCard({ order, onStatusChange }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    cancellationReason: order.cancellation_reason || '',
    refundStatus: order.refund_status || 'pending',
  });
  const status = STATUS_META[order.status] || STATUS_META.received;
  const refund = REFUND_META[order.refund_status || 'not_required'];
  const lastMinute = isLastMinuteCancellation(order);

  function submitCancellation(event) {
    event.preventDefault();
    onStatusChange(order.id, 'cancelled', {
      cancelledBy: 'bakery',
      cancellationReason: cancelForm.cancellationReason,
      refundStatus: cancelForm.refundStatus,
    });
    setCancelOpen(false);
  }

  return (
    <article className={`admin-order ${order.status === 'cancelled' ? 'is-cancelled' : ''}`}>
      <div className="admin-order-top">
        <div>
          <h2>{order.customer_name}</h2>
          <p>{order.customer_email}</p>
        </div>
        <div className="order-badges">
          {lastMinute && <span className="warning-pill">Last-minute cancellation</span>}
          <span className="status-pill" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
          <span className="status-pill" style={{ background: refund.bg, color: refund.color }}>
            {refund.label}
          </span>
        </div>
      </div>
      <dl className="order-grid">
        <div><dt>Order</dt><dd>{String(order.id).slice(0, 8)}</dd></div>
        <div><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        <div><dt>Fulfilment</dt><dd>{order.fulfillment_method}</dd></div>
        <div><dt>Production date</dt><dd>{order.production_date || 'Unscheduled'}</dd></div>
        {order.pickup_ready_at && <div><dt>Pickup ready</dt><dd>{formatDateTime(order.pickup_ready_at)}</dd></div>}
        <div><dt>Address</dt><dd>{order.customer_address || 'Pickup'}</dd></div>
        {order.status === 'cancelled' && (
          <>
            <div><dt>Cancelled by</dt><dd>{order.cancelled_by || 'Unknown'}</dd></div>
            <div><dt>Cancelled at</dt><dd>{formatDateTime(order.cancelled_at)}</dd></div>
            <div><dt>Reason</dt><dd>{order.cancellation_reason || 'No reason provided'}</dd></div>
          </>
        )}
      </dl>
      <div className="included admin-items">
        <span>Items</span>
        <ul>{(order.order_items || []).map((item) => <li key={item.id}>{item.quantity}x {item.product_name}</li>)}</ul>
      </div>
      <div className="status-controls">
        <span>Update status</span>
        <div>
          {ORDER_STATUSES.filter((option) => option !== 'cancelled').map((option) => (
            <button className={order.status === option ? 'active' : ''} key={option} onClick={() => onStatusChange(order.id, option)} type="button">
              {STATUS_META[option].label}
            </button>
          ))}
        </div>
      </div>
      <div className="status-controls">
        <span>Refund status</span>
        <div>
          {REFUND_STATUSES.map((option) => (
            <button
              className={(order.refund_status || 'not_required') === option ? 'active' : ''}
              key={option}
              onClick={() => onStatusChange(order.id, order.status, { refundStatus: option })}
              type="button"
            >
              {REFUND_META[option].label}
            </button>
          ))}
        </div>
      </div>
      {order.status !== 'cancelled' && (
        <div className="status-controls">
          <button className="danger-button" onClick={() => setCancelOpen(!cancelOpen)} type="button">
            Cancel order
          </button>
          {cancelOpen && (
            <form className="cancel-form" onSubmit={submitCancellation}>
              <div className="field-group">
                <label htmlFor={`cancel-${order.id}`}>Cancellation reason</label>
                <textarea
                  id={`cancel-${order.id}`}
                  required
                  value={cancelForm.cancellationReason}
                  onChange={(event) => setCancelForm({ ...cancelForm, cancellationReason: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor={`refund-${order.id}`}>Refund status</label>
                <select
                  id={`refund-${order.id}`}
                  value={cancelForm.refundStatus}
                  onChange={(event) => setCancelForm({ ...cancelForm, refundStatus: event.target.value })}
                >
                  {REFUND_STATUSES.map((option) => (
                    <option key={option} value={option}>{REFUND_META[option].label}</option>
                  ))}
                </select>
              </div>
              <button className="admin-primary" type="submit">Keep visible and cancel</button>
            </form>
          )}
        </div>
      )}
      {order.order_audit_log?.length > 0 && (
        <details className="audit-log">
          <summary>Audit log</summary>
          {order.order_audit_log.map((entry) => (
            <p key={entry.id}>
              {formatDateTime(entry.created_at)}: {entry.actor_type} changed {entry.from_status || 'new'} to {entry.to_status}
              {entry.note ? ` - ${entry.note}` : ''}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}

function ProductionView({ days, cancellations }) {
  return (
    <section className="production-view">
      {days.length === 0 ? (
        <div className="admin-empty">No active production needed for the current filters.</div>
      ) : (
        days.map((day) => (
          <article className="admin-order production-day" key={day.date}>
            <div className="admin-order-top">
              <div>
                <p className="eyebrow">Production</p>
                <h2>{formatProductionDate(day.date)}</h2>
                <p>{day.orders} active orders · {day.delivery} delivery · {day.pickup} pickup</p>
              </div>
            </div>
            <div className="production-list">
              {day.products.map((product) => (
                <div key={product.name}>
                  <strong>{product.name}</strong>
                  <span>x {product.quantity}</span>
                </div>
              ))}
            </div>
            {day.customBoxes?.length > 0 && (
              <div className="custom-box-production">
                <span>Custom box breakdown</span>
                {day.customBoxes.map((box) => (
                  <details key={`${box.orderId}-${box.name}`}>
                    <summary>{box.name} · order {String(box.orderId).slice(0, 8)}</summary>
                    <ul>
                      {box.items.map((item) => (
                        <li key={item.id}>{item.quantity}x {item.product_name}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </article>
        ))
      )}

      {cancellations.length > 0 && (
        <section className="admin-orders">
          <div className="section-heading">
            <p className="eyebrow">Cancellation watch</p>
            <h2>Cancelled orders kept out of production totals.</h2>
          </div>
          {cancellations.map((order) => (
            <article className="admin-order is-cancelled" key={order.id}>
              <div className="admin-order-top">
                <div>
                  <h2>Order {String(order.id).slice(0, 8)}</h2>
                  <p>{order.customer_name} · {order.production_date || 'Unscheduled'}</p>
                </div>
                {isLastMinuteCancellation(order) && <span className="warning-pill">Last-minute cancellation</span>}
              </div>
              <dl className="order-grid">
                <div><dt>Cancelled by</dt><dd>{order.cancelled_by || 'Unknown'}</dd></div>
                <div><dt>Cancelled at</dt><dd>{formatDateTime(order.cancelled_at)}</dd></div>
                <div><dt>Refund</dt><dd>{REFUND_META[order.refund_status || 'not_required'].label}</dd></div>
                <div><dt>Reason</dt><dd>{order.cancellation_reason || 'No reason provided'}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

function formatProductionDate(value) {
  if (!value || value === 'Unscheduled') return 'Unscheduled';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDateTime(value) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InventoryOps({ products, lowStock, availableNow, leftovers, onEdit }) {
  return (
    <section className="ops-grid">
      <article className="admin-order">
        <div className="admin-order-top">
          <div>
            <p className="eyebrow">Available now</p>
            <h2>{availableNow.length} ready for pickup</h2>
            <p>These items are visible in the customer Available Now section.</p>
          </div>
        </div>
        <InventoryList products={availableNow} onEdit={onEdit} empty="Nothing is ready right now." />
      </article>
      <article className="admin-order">
        <div className="admin-order-top">
          <div>
            <p className="eyebrow">Low stock</p>
            <h2>{lowStock.length} alerts</h2>
            <p>Products at or below their configured warning threshold.</p>
          </div>
        </div>
        <InventoryList products={lowStock} onEdit={onEdit} empty="No low stock alerts." warning />
      </article>
      <article className="admin-order">
        <div className="admin-order-top">
          <div>
            <p className="eyebrow">Leftovers</p>
            <h2>{leftovers.length} leftover lines</h2>
            <p>Sell these as available-now stock or freeze them before closing.</p>
          </div>
        </div>
        <InventoryList products={leftovers} onEdit={onEdit} empty="No leftover stock recorded." />
      </article>
      <article className="admin-order">
        <div className="admin-order-top">
          <div>
            <p className="eyebrow">All inventory</p>
            <h2>{products.length} products</h2>
            <p>Manual adjustments sync to product availability and stock movement history.</p>
          </div>
        </div>
        <InventoryList products={products} onEdit={onEdit} empty="No products." />
      </article>
    </section>
  );
}

function InventoryList({ products, onEdit, empty, warning }) {
  if (!products.length) return <div className="admin-empty compact-empty">{empty}</div>;
  return (
    <div className="inventory-list">
      {products.map((product) => (
        <div key={product.id}>
          <span>
            <strong>{product.name}</strong>
            <small>{categoryLabel(product.inventory_category)} · {product.is_ready_now ? 'ready' : 'not ready'}</small>
          </span>
          <span className={warning ? 'low-stock-text' : ''}>{product.stock_quantity}</span>
          <button onClick={() => onEdit(product)} type="button">Adjust</button>
        </div>
      ))}
    </div>
  );
}

function SubscriptionPlanner({ products, subscriptions, authHeaders, onSaved }) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const [form, setForm] = useState({
    customer_email: '',
    weekdays: ['Monday'],
    product_ids: [],
    next_order_date: '',
    skipped_dates: [],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  function toggleValue(field, value) {
    const values = form[field];
    setForm({
      ...form,
      [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const headers = await authHeaders();
    await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ customer_email: '', weekdays: ['Monday'], product_ids: [], next_order_date: '', skipped_dates: [], notes: '' });
    setSaving(false);
    onSaved();
  }

  return (
    <section className="subscription-grid">
      <form className="checkout-form page-form" onSubmit={save}>
        <h2>Schedule subscription</h2>
        <Field label="Customer email" name="customer_email" type="email" value={form.customer_email} onChange={(event) => setForm({ ...form, customer_email: event.target.value })} />
        <div className="field-group">
          <label>Weekdays</label>
          <div className="chip-grid">
            {weekdays.map((day) => (
              <button className={form.weekdays.includes(day) ? 'active' : ''} key={day} onClick={() => toggleValue('weekdays', day)} type="button">{day.slice(0, 3)}</button>
            ))}
          </div>
        </div>
        <div className="field-group">
          <label>Products by weekday</label>
          <div className="subscription-products">
            {products.slice(0, 8).map((product) => (
              <label key={product.id}>
                <input checked={form.product_ids.includes(product.id)} onChange={() => toggleValue('product_ids', product.id)} type="checkbox" />
                {product.name}
              </label>
            ))}
          </div>
        </div>
        <Field label="Next delivery date" name="next_order_date" type="date" value={form.next_order_date} onChange={(event) => setForm({ ...form, next_order_date: event.target.value })} />
        <div className="field-group">
          <label htmlFor="skip-date">Skip or pause a specific day</label>
          <input
            id="skip-date"
            type="date"
            onChange={(event) => {
              if (event.target.value && !form.skipped_dates.includes(event.target.value)) {
                setForm({ ...form, skipped_dates: [...form.skipped_dates, event.target.value] });
              }
            }}
          />
        </div>
        {form.skipped_dates.length > 0 && <p className="fine-print">Skipped: {form.skipped_dates.join(', ')}</p>}
        <div className="field-group">
          <label htmlFor="sub-notes">Notes</label>
          <textarea id="sub-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>
        <button className="checkout-button full" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save schedule'}</button>
      </form>
      <section className="admin-orders">
        <article className="admin-order">
          <p className="eyebrow">Upcoming calendar</p>
          <div className="calendar-strip">
            {upcomingWeekdays().map((day) => (
              <span key={day.iso}>{day.label}</span>
            ))}
          </div>
        </article>
        {subscriptions.length === 0 ? (
          <div className="admin-empty">No subscriptions scheduled yet.</div>
        ) : (
          subscriptions.map((subscription) => (
            <article className="admin-order" key={subscription.id}>
              <div className="admin-order-top">
                <div>
                  <h2>{subscription.customer_email}</h2>
                  <p>{(subscription.weekdays || []).join(', ') || 'No weekdays'} · next {subscription.next_order_date || 'not set'}</p>
                </div>
                <span className="status-pill" style={{ background: '#e8f5e9', color: '#2e6d32' }}>{subscription.status}</span>
              </div>
              {(subscription.skipped_dates || []).length > 0 && <p>Skipped dates: {subscription.skipped_dates.join(', ')}</p>}
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function ProductForm({ form, setForm, onSubmit, editing, onCancel }) {
  function update(event) {
    const { name, value, type, checked } = event.target;
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
          <option value="fresh_today">Fresh today</option>
          <option value="leftover_stock">Leftover stock</option>
          <option value="frozen">Frozen</option>
          <option value="pre_order">Pre-order</option>
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="pickup_ready_minutes">Pickup ready time</label>
        <select id="pickup_ready_minutes" name="pickup_ready_minutes" value={form.pickup_ready_minutes} onChange={update}>
          <option value="0">Ready now</option>
          <option value="15">Ready in 15 min</option>
          <option value="60">Ready in 1 hour</option>
        </select>
      </div>
      <Field label="Badge" name="badge" value={form.badge} onChange={update} />
      <Field label="Accent colour" name="accent" value={form.accent} onChange={update} />
      <Field label="Image path" name="image_url" value={form.image_url} onChange={update} />
      <label className="checkbox-row">
        <input checked={form.active} name="active" onChange={update} type="checkbox" />
        Active on shop
      </label>
      <label className="checkbox-row">
        <input checked={form.is_ready_now} name="is_ready_now" onChange={update} type="checkbox" />
        Baked and ready for instant pickup
      </label>
      <button className="checkout-button full" type="submit">{editing ? 'Save product' : 'Add product'}</button>
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
