# My Gluten Free Bakery MVP

A mobile-first bakery ordering platform built with Next.js, Supabase, and Stripe Checkout. It uses My Gluten Free Bakery / The Gluten Free Bakery branding cues and realistic product content from `mygfbakery.com`, extended into a working MVP with customer ordering, order tracking, and an auth-protected bakery admin.

## Features

Customer:
- Browse bakery boxes and products
- See an Available Now section for live instant-pickup stock
- Build custom bakery boxes with min/max item rules, live pricing, and weekday assignment
- Save custom boxes by email and reorder them later
- View product details
- Add products to cart and change quantities
- Checkout with Stripe test mode
- Reserve ready-now stock, pay online, and choose instant pickup
- Order confirmation and tracking pages
- Status timeline: received, preparing, baking, ready for pickup, out for delivery, delivered

Bakery admin:
- Supabase email/password login
- View all orders and daily order totals
- View order items and order details
- Update order status
- Cancel orders without deleting them
- Capture who cancelled, reason, cancellation time, refund status, and audit history
- Filter active, cancelled, refunded, pickup, delivery, and dated orders
- Daily production view grouped by delivery or pickup date
- Production totals automatically exclude cancelled orders
- Custom boxes appear in production with their full item breakdown
- Live inventory controls: stock quantity, fresh today, leftover stock, frozen, pre-order
- Mark products baked/ready now and set pickup timing: ready now, 15 minutes, or 1 hour
- Low-stock warnings and automatic customer-side hiding for sold out products
- Add, edit, delete, hide, and restock products

Data:
- Supabase tables for `profiles`, `bakeries`, `products`, `orders`, `order_items`, `inventory_movements`, and `subscriptions`
- `custom_boxes` stores saved build-your-own boxes for reorder/subscription use
- `order_audit_log` records order status and refund-state changes
- SQL schema lives at `supabase/schema.sql`

Brand/content:
- Bakery name: My Gluten Free Bakery / The Gluten Free Bakery
- Public product data used for Boss Bagels, Super Sourdough, Totally Seeded, Tinned Sandwich Loaf, Classic Bagels, Nigella Seed and Garlic Bagels, Bagel Selection Box, Loaves Mixed Box, Baguette, and Build-a-Box
- Local visual assets live in `public/assets`; images are not hotlinked
- Uploaded bakery images are mapped into product galleries and served through public web paths such as `/assets/Super_Sourdough-06.webp`

## Local Setup

This app is currently intended for testing/demo use only. Use a dedicated Supabase development project and Stripe test-mode keys. Do not connect this demo to live payments or production customer data.

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Create a Supabase development/test project, open the SQL editor, and run:

```sql
-- paste the contents of supabase/schema.sql
```

4. Add Supabase keys to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Create an admin user in Supabase Auth, then mark the profile as admin:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

6. Add Stripe test keys to `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOW_LIVE_PAYMENTS=false
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Live Stripe secret keys are blocked by default for this demo. Keep `ALLOW_LIVE_PAYMENTS=false`.

7. Start the app:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Stripe Webhooks

For local testing, install the Stripe CLI and forward webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

The webhook marks orders as paid, reduces product stock, and records inventory movements after `checkout.session.completed`.

## Test Payments

Use Stripe test card `4242 4242 4242 4242`, any future expiry date, any CVC, and any postcode.

## Demo Deployment

For Vercel demo setup, see `DEMO_SETUP.md`. Add only demo Supabase credentials and Stripe test-mode keys to the Vercel project environment variables.

## Main Routes

- `/` customer shop
- `/products/[slug]` product detail
- `/cart` cart
- `/checkout` checkout form
- `/success` order confirmation
- `/track` customer order lookup
- `/orders/[id]` order details and status timeline
- `/admin` bakery dashboard

## Notes

The product list falls back to the bundled My Gluten Free Bakery-inspired menu when Supabase is not configured, so the storefront still renders during setup. Checkout and admin actions require Supabase and Stripe environment variables.
