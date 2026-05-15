const { Resend } = require('resend');

const FROM = process.env.EMAIL_FROM || 'orders@yourbakery.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function formatPrice(weeklyPrice) {
  return `GBP ${(weeklyPrice / 100).toFixed(2)}`;
}

async function sendConfirmationEmail({
  customerName,
  customerEmail,
  productName,
  customerPreferences,
  billingInterval = 'week',
  deliveryDay,
  weeklyPrice,
}) {
  const price = formatPrice(weeklyPrice);
  const rhythm = billingInterval === 'month' ? 'month' : 'week';
  const resend = getResend();

  if (!resend) {
    console.warn('Skipping confirmation email: RESEND_API_KEY is not set.');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: customerEmail,
      subject: `Your gluten-free subscription is confirmed: ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #25160f; background: #fffaf2;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #1c1714; color: #fff; border-radius: 8px; padding: 12px 14px; font-weight: 800; letter-spacing: 0.08em;">BC</div>
            <h1 style="font-family: Georgia, serif; font-size: 30px; margin: 18px 0 0; color: #25160f;">You are on the bake list.</h1>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">Hi ${customerName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            Thanks for ordering from My Gluten Free Bakery. We will bake your order fresh and send a reminder before delivery.
          </p>

          <div style="background: #fff7e9; border: 1px solid #ead9c4; padding: 20px; border-radius: 8px; margin: 28px 0;">
            <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #765f50; font-weight: 800;">Your subscription</p>
            <p style="margin: 0 0 4px; font-size: 20px; font-weight: 800;">${productName}</p>
            <p style="margin: 0; color: #765f50;">Delivered every <strong>${deliveryDay}</strong> at ${price}/${rhythm}</p>
            ${
              customerPreferences
                ? `<p style="margin: 10px 0 0; color: #765f50;"><strong>Your choices:</strong> ${customerPreferences}</p>`
                : ''
            }
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #765f50;">
            Your subscription runs every ${rhythm}. Your first delivery will arrive on the next available ${deliveryDay}. Questions? Reply to this email and we will help.
          </p>

          <hr style="border: none; border-top: 1px solid #ead9c4; margin: 32px 0;" />
          <p style="font-size: 12px; color: #9a8171; text-align: center;">
            My Gluten Free Bakery
          </p>
        </body>
        </html>
      `,
    });
    console.log(`Confirmation email sent to ${customerEmail}`);
  } catch (err) {
    console.error('Failed to send confirmation email:', err);
  }
}

async function sendReminderEmail({ customerName, customerEmail, productName, deliveryDay }) {
  const resend = getResend();

  if (!resend) {
    console.warn('Skipping reminder email: RESEND_API_KEY is not set.');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: customerEmail,
      subject: 'Your gluten-free bakery order arrives tomorrow',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #25160f; background: #fffaf2;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #1c1714; color: #fff; border-radius: 8px; padding: 12px 14px; font-weight: 800; letter-spacing: 0.08em;">BC</div>
            <h1 style="font-family: Georgia, serif; font-size: 30px; margin: 18px 0 0; color: #25160f;">Your box arrives tomorrow.</h1>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">Hi ${customerName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            Quick reminder: your <strong>${productName}</strong> will be baked fresh and delivered tomorrow, ${deliveryDay}.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #765f50;">
            If you need to add delivery instructions, reply to this email before the route starts.
          </p>

          <hr style="border: none; border-top: 1px solid #ead9c4; margin: 32px 0;" />
          <p style="font-size: 12px; color: #9a8171; text-align: center;">
            <a href="${BASE_URL}" style="color: #765f50;">My Gluten Free Bakery</a>
          </p>
        </body>
        </html>
      `,
    });
    console.log(`Reminder email sent to ${customerEmail}`);
  } catch (err) {
    console.error('Failed to send reminder email:', err);
  }
}

module.exports = { sendConfirmationEmail, sendReminderEmail };
