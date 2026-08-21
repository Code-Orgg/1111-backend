const { Resend } = require("resend");
const crypto = require("crypto");
const { generateInvoicePDF } = require("./invoice");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "The 1111 Project <onboarding@resend.dev>";
const SITE_URL = process.env.FRONTEND_URL || "https://1111-frontend-omega.vercel.app";

const fmt = (kobo) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");

function unsubscribeLink(userId) {
  const token = crypto.createHmac("sha256", process.env.JWT_SECRET).update(userId).digest("hex").slice(0, 24);
  return `${process.env.API_BASE_URL || ""}/marketing/unsubscribe?u=${userId}&t=${token}`;
}

function verifyUnsubscribeToken(userId, token) {
  const expected = crypto.createHmac("sha256", process.env.JWT_SECRET).update(userId).digest("hex").slice(0, 24);
  return expected === token;
}

const footer = (userId) => `
  <p style="color:#999;font-size:11px;margin-top:36px;">
    The 1111 Project · Lagos, Nigeria<br/>
    <a href="${unsubscribeLink(userId)}" style="color:#999;">Unsubscribe from promotional emails</a>
  </p>`;

async function sendReceipt(order, toEmail) {
  const pdf = await generateInvoicePDF(order);
  const itemsHtml = order.items
    .map((i) => `<tr><td style="padding:8px 0;">${i.product.name} × ${i.qty}</td><td style="text-align:right;">${fmt(i.price * i.qty)}</td></tr>`)
    .join("");

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Receipt — The 1111 Project — ${fmt(order.subtotal)}`,
    html: `
      <div style="font-family:Georgia,serif;color:#1a1a1a;max-width:520px;margin:0 auto;padding:32px 0;">
        <h2 style="letter-spacing:.02em;margin-bottom:4px;">The 1111 Project</h2>
        <p style="color:#888;font-size:13px;margin-bottom:28px;">Payment received — here's your receipt.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${itemsHtml}
          <tr><td style="padding-top:14px;border-top:1px solid #ddd;font-weight:bold;">Total</td><td style="padding-top:14px;border-top:1px solid #ddd;text-align:right;font-weight:bold;">${fmt(order.subtotal)}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:13px;color:#555;">Order reference: ${order.id}<br/>Delivering to: ${order.shippingName}, ${order.shippingStreet}, ${order.shippingCity}, ${order.shippingCountry} ${order.shippingPostalCode}<br/>Phone: ${order.shippingPhone}</p>
        <p style="margin-top:20px;font-size:13px;">Full PDF receipt attached.</p>
      </div>
    `,
    attachments: [{ filename: `1111-receipt-${order.id}.pdf`, content: pdf.toString("base64") }],
  });
}

async function sendOwnerAlert(order) {
  const OWNER_EMAIL = process.env.OWNER_EMAIL;
  //if (!OWNER_EMAIL) return;
  await resend.emails.send({
    from: FROM,
    to: "davidic.mandate26@gmail.com", 
    subject: `💰 New paid order — ${fmt(order.subtotal)} — #${order.id}`,
    html: `
      <div style="font-family:sans-serif;">
        <h3>New confirmed payment</h3>
        <p><strong>Amount:</strong> ${fmt(order.subtotal)}</p>
        <p><strong>Buyer:</strong> ${order.shippingName} — ${order.shippingPhone} — ${order.shippingEmail}</p>
        <p><strong>Delivery to:</strong> ${order.shippingStreet}, ${order.shippingCity}, ${order.shippingCountry} ${order.shippingPostalCode}</p>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Payment method:</strong> ${order.paymentMethod}</p>
      </div>
    `,
  });
}

async function sendWalletFundedEmail(user, amountKobo) {
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Wallet funded — ${fmt(amountKobo)}`,
    html: `<p>Your 1111 Project wallet has been credited with ${fmt(amountKobo)}. New balance: ${fmt(user.walletBalance)}.</p>`,
  });
}

async function sendAbandonedCartEmail(user, cartItems) {
  const itemsList = cartItems.map((i) => `${i.product.name} (×${i.qty})`).join(", ");
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Still thinking it over? Your piece is waiting.`,
    html: `
      <div style="font-family:Georgia,serif;color:#1a1a1a;max-width:520px;margin:0 auto;">
        <h2>The 1111 Project</h2>
        <p>${itemsList} is still in your collection cart — each piece is limited and numbered, so it won't wait forever.</p>
        <p><a href="${SITE_URL}" style="display:inline-block;margin-top:16px;background:#b8863b;color:#fff;padding:12px 24px;text-decoration:none;">Complete your collection →</a></p>
        ${footer(user.id)}
      </div>
    `,
  });
}

async function sendReEngagementEmail(user) {
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `New in the archive — Africa's first AR art collection`,
    html: `
      <div style="font-family:Georgia,serif;color:#1a1a1a;max-width:520px;margin:0 auto;">
        <h2>The 1111 Project</h2>
        <p>Every piece in the collection hides a second layer, visible only through your phone. Numbered, limited, and one of a kind.</p>
        <p><a href="${SITE_URL}" style="display:inline-block;margin-top:16px;background:#b8863b;color:#fff;padding:12px 24px;text-decoration:none;">Browse the collection →</a></p>
        ${footer(user.id)}
      </div>
    `,
  });
}

async function sendNewDropEmail(users, product) {
  const sends = users.map((user) =>
    resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `Just dropped: "${product.name}"`,
      html: `
        <div style="font-family:Georgia,serif;color:#1a1a1a;max-width:520px;margin:0 auto;">
          <h2>The 1111 Project</h2>
          <p>A new piece just entered the collection: <strong>${product.name}</strong> (${product.edition || ""}).</p>
          <img src="${product.imageUrl}" style="width:100%;max-width:400px;margin:16px 0;" />
          <p><a href="${SITE_URL}" style="display:inline-block;background:#b8863b;color:#fff;padding:12px 24px;text-decoration:none;">View it now →</a></p>
          ${footer(user.id)}
        </div>
      `,
    })
  );
  await Promise.allSettled(sends);
}

// ── Password reset OTP — luxury-branded, matching the site's visual language ──
async function sendPasswordResetOtp(user, otp) {
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Your verification code: ${otp}`,
    html: `
      <div style="font-family:Georgia,serif;background:#0a0806;color:#efe6d8;max-width:480px;margin:0 auto;padding:48px 32px;">
        <h2 style="letter-spacing:.04em;font-weight:400;margin-bottom:4px;">1111 <em style="color:#b8863b;font-style:italic;">The Project</em></h2>
        <p style="color:#9a9086;font-size:13px;margin-bottom:32px;">Account Recovery</p>
        <p style="font-size:14px;color:#efe6d8;margin-bottom:24px;">Use this code to reset your password. It expires in 10 minutes.</p>
        <div style="background:rgba(184,134,59,.08);border:1px solid rgba(184,134,59,.4);padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-family:'Courier New',monospace;font-size:36px;letter-spacing:.3em;color:#b8863b;font-weight:bold;">${otp}</span>
        </div>
        <p style="font-size:12.5px;color:#9a9086;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      </div>
    `,
  });
}

module.exports = {
  sendReceipt,
  sendOwnerAlert,
  sendPasswordResetOtp,
  sendWalletFundedEmail,
  sendAbandonedCartEmail,
  sendReEngagementEmail,
  sendNewDropEmail,
  unsubscribeLink,
  verifyUnsubscribeToken,
};
