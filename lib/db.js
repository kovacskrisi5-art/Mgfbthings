// lib/db.js
// JSON-alapú adatbázis - nem igényel fordítást, Windowson is működik

const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'bakery-data.json'));

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const empty = { subscriptions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

function createSubscription(data) {
  const db = readDb();
  const sub = {
    id: nextId(db.subscriptions),
    ...data,
    status: 'active',
    order_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.subscriptions.push(sub);
  writeDb(db);
  return sub;
}

function getSubscriptionByStripeId(stripeSubscriptionId) {
  const db = readDb();
  return db.subscriptions.find((s) => s.stripe_subscription_id === stripeSubscriptionId) || null;
}

function getAllActiveSubscriptions() {
  const db = readDb();
  return db.subscriptions
    .filter((s) => s.status === 'active')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getSubscriptionsByDeliveryDay(day) {
  const db = readDb();
  return db.subscriptions
    .filter((s) => s.status === 'active' && s.delivery_day === day)
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name));
}

function updateSubscriptionOrderStatus(id, orderStatus) {
  const db = readDb();
  const sub = db.subscriptions.find((s) => s.id === parseInt(id));
  if (sub) {
    sub.order_status = orderStatus;
    sub.updated_at = new Date().toISOString();
    writeDb(db);
  }
}

function cancelSubscription(stripeSubscriptionId) {
  const db = readDb();
  const sub = db.subscriptions.find((s) => s.stripe_subscription_id === stripeSubscriptionId);
  if (sub) {
    sub.status = 'cancelled';
    sub.updated_at = new Date().toISOString();
    writeDb(db);
  }
}

module.exports = {
  createSubscription,
  getSubscriptionByStripeId,
  getAllActiveSubscriptions,
  getSubscriptionsByDeliveryDay,
  updateSubscriptionOrderStatus,
  cancelSubscription,
};
