# Stripe payment setup

The app already uses Stripe Checkout for weekly subscriptions.

## What the checkout does

- Creates a Stripe customer.
- Creates a weekly recurring price for the selected box.
- Starts a Stripe Checkout subscription session.
- Sends the customer to Stripe-hosted payment.
- Uses the webhook to save the paid subscription into the admin order list.

## Local test setup

Create `.env.local` in this folder:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=changeme123
DATABASE_PATH=./bakery-data.json
```

You only need `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if you later build a custom card form. The current app redirects to Stripe Checkout from the server, so `STRIPE_SECRET_KEY` is the important key.

## Stripe webhook for local testing

Install and run the Stripe CLI:

```powershell
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

Copy the `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Test card

Use Stripe test card:

```text
4242 4242 4242 4242
```

Use any future expiry date, any CVC, and any postcode.

## Vercel production setup

In the Vercel dashboard, open the project:

```text
bakery-subscription
```

Go to:

```text
Settings -> Environment Variables
```

Add:

```env
NEXT_PUBLIC_BASE_URL=https://bakery-subscription.vercel.app
STRIPE_SECRET_KEY=sk_test_or_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=your-admin-password
DATABASE_PATH=/tmp/bakery-data.json
```

Then redeploy:

```powershell
npx vercel --prod
```

## Stripe webhook for Vercel

In Stripe Dashboard:

```text
Developers -> Webhooks -> Add endpoint
```

Endpoint URL:

```text
https://bakery-subscription.vercel.app/api/webhook
```

Events:

```text
checkout.session.completed
customer.subscription.deleted
invoice.payment_failed
```

Copy the webhook signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

## Important note

The current JSON database works for demos, but Vercel `/tmp` storage is temporary. For a real bakery taking real paid orders, move subscriptions to a hosted database before launch.
