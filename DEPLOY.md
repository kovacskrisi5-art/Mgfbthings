# Deploy to Vercel

This project is ready to deploy as a mobile-installable PWA.

## 1. Deploy

Run these commands in a normal Windows PowerShell or Command Prompt:

```powershell
cd C:\Users\kovac\Downloads\bakery-subscription
npx vercel
```

Follow the prompts:

- Log in to Vercel if asked.
- Set up and deploy: `Y`
- Which scope: choose your account.
- Link to existing project: `N`
- Project name: `gluten-free-bread-club`
- Directory: press Enter.

After the preview deploy works, publish production:

```powershell
npx vercel --prod
```

## 2. Environment variables

In Vercel project settings, add:

```env
ADMIN_PASSWORD=change-this-password
DATABASE_PATH=/tmp/bakery-data.json
NEXT_PUBLIC_BASE_URL=https://your-vercel-url.vercel.app
```

Add these when Stripe/email are ready:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=orders@yourdomain.com
```

## 3. Install on phone

Open the production URL on the phone.

Android Chrome:

- Menu
- Install app

iPhone Safari:

- Share
- Add to Home Screen
