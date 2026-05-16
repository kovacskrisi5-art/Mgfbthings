const Stripe = require('stripe');

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY first.');
  }

  assertDemoStripeKey(secretKey);

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

function assertDemoStripeKey(secretKey) {
  if (process.env.ALLOW_LIVE_PAYMENTS === 'true') return;

  if (secretKey.startsWith('sk_live_')) {
    throw new Error('Live Stripe keys are blocked for this demo. Use a Stripe test key that starts with sk_test_.');
  }

  if (!secretKey.startsWith('sk_test_')) {
    throw new Error('Stripe demo checkout requires a test secret key that starts with sk_test_.');
  }
}

module.exports = { getStripe };
