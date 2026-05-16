# Demo/Test Setup

This project is configured for demo use only. Use a separate Supabase development project and Stripe test-mode keys. Do not connect this demo to production payments or real customer data.

## Supabase Demo Project

1. Create a new Supabase project specifically for this demo.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a demo admin user in Supabase Auth.
4. Mark that user as an admin:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## Stripe Test Mode

In Stripe, turn on **Test mode** before copying keys.

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOW_LIVE_PAYMENTS=false
```

The app rejects `sk_live_...` keys unless `ALLOW_LIVE_PAYMENTS=true`, which should not be set for this demo.

Use Stripe test card `4242 4242 4242 4242`, any future expiry date, any CVC, and any postcode.

## Vercel Demo Environment Variables

Add these variables to the Vercel demo project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-demo-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-demo-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-demo-service-role-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOW_LIVE_PAYMENTS=false
NEXT_PUBLIC_BASE_URL=https://your-demo-site.vercel.app
CRON_SECRET=replace-with-a-long-random-string
```

Optional email settings:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=orders@your-demo-domain.example
```

## Stripe Webhook For Vercel

Create a Stripe test-mode webhook endpoint:

```text
https://your-demo-site.vercel.app/api/webhook
```

Send at least:

```text
checkout.session.completed
```

Copy the test-mode webhook signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

## Demo Safety Rules

- Use a dedicated Supabase development project.
- Use Stripe keys that start with `pk_test_` and `sk_test_`.
- Keep `ALLOW_LIVE_PAYMENTS=false`.
- Do not import production customers, orders, or payment data.
- Keep `.env.local` and Vercel project metadata out of git.
