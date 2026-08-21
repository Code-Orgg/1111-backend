const twilio = require("twilio");

const isConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM && process.env.OWNER_WHATSAPP_NUMBER);

const client = isConfigured() ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

const fmt = (kobo) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");

// Sends the owner a WhatsApp alert the instant a payment is confirmed —
// same trigger point as the email alert, just a second channel.
//
// IMPORTANT: WhatsApp's Business API does not allow a business to send
// freeform text to start a conversation — Meta requires a pre-approved
// message template for anything business-initiated. Two modes here:
//
//   1. TWILIO_WHATSAPP_TEMPLATE_SID set  → uses that approved template
//      (required for real production use, once the owner's WhatsApp
//      Business Account is Meta-verified).
//   2. Not set → falls back to a freeform message, which only works in
//      Twilio's sandbox (dev/testing) or within 24h of the recipient
//      having messaged the business number first. Fine for the demo,
//      not reliable for production.
async function sendOwnerWhatsAppAlert(order) {
  if (!isConfigured()) return; // silently skip if not set up yet — email alert still fires

  const itemsList = order.items.map((i) => `${i.product.name} x${i.qty}`).join(", ");
  const addressLine = `${order.shippingStreet}, ${order.shippingCity}, ${order.shippingCountry} ${order.shippingPostalCode}`;

  const payload = {
    from: process.env.TWILIO_WHATSAPP_FROM, // e.g. 'whatsapp:+14155238886' (sandbox) or the owner's approved number
    to: `whatsapp:${process.env.OWNER_WHATSAPP_NUMBER}`, // e.g. 'whatsapp:+2348012345678'
  };

  if (process.env.TWILIO_WHATSAPP_TEMPLATE_SID) {
    // Production path — approved template. Variable numbering ({{1}}, {{2}}...)
    // must match exactly what was approved in the Twilio/Meta template.
    payload.contentSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;
    payload.contentVariables = JSON.stringify({
      1: fmt(order.subtotal),
      2: itemsList,
      3: order.shippingName,
      4: order.shippingPhone,
      5: addressLine,
      6: order.id,
    });
  } else {
    // Dev/sandbox path — freeform text.
    payload.body =
      `New paid order — ${fmt(order.subtotal)}\n` +
      `Items: ${itemsList}\n` +
      `Buyer: ${order.shippingName} (${order.shippingPhone})\n` +
      `Deliver to: ${addressLine}\n` +
      `Order #${order.id}`;
  }

  try {
    await client.messages.create(payload);
  } catch (err) {
    // Never let a WhatsApp failure block order fulfillment — email alert is
    // the reliable channel; this is a bonus, not a dependency.
    console.error("Twilio WhatsApp alert failed:", err.message);
  }
}

module.exports = { sendOwnerWhatsAppAlert, isConfigured };
