const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { getProvider, availableProviders } = require("../services/providers");
const { sendReceipt, sendOwnerAlert } = require("../services/email");
const { sendOwnerWhatsAppAlert } = require("../services/whatsapp");

const router = express.Router();

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Validates the full shipping object before anything touches payment.
// Returns an error string, or null if everything's valid.
function validateShipping(s) {
  if (!s) return "Shipping details are required.";
  const required = { fullName: "Full name", email: "Email", phone: "Phone number", street: "Street address", city: "City", country: "Country", postalCode: "Postal code" };
  for (const [key, label] of Object.entries(required)) {
    if (!s[key] || !String(s[key]).trim()) return `${label} is required.`;
  }
  if (!EMAIL_RE.test(s.email)) return "Enter a valid email address.";
  if (String(s.phone).replace(/\D/g, "").length < 7) return "Enter a valid phone number.";
  return null;
}

router.get("/payment-methods", (req, res) => {
  res.json({ methods: availableProviders().map((p) => p.name) });
});

// POST /orders — { items, shipping: { fullName, email, phone, street, city, country, postalCode }, paymentMethod }
router.post("/", requireAuth, async (req, res) => {
  const { items, shipping, paymentMethod } = req.body;
  if (!items?.length) return res.status(400).json({ error: "Cart is empty." });

  const shippingError = validateShipping(shipping);
  if (shippingError) return res.status(400).json({ error: shippingError });

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  if (products.length !== items.length)
    return res.status(400).json({ error: "One or more items are no longer available." });

  const orderItems = items.map((i) => {
    const p = products.find((pr) => pr.id === i.productId);
    return { productId: p.id, qty: i.qty, price: p.price };
  });
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Shipping data is written to the database immediately, right here — this is
  // the source of truth. Anything embedded in the payment gateway's metadata
  // (below) is a redundant audit trail, not a dependency for fulfillment.
  const shippingData = {
    shippingName: shipping.fullName,
    shippingEmail: shipping.email,
    shippingPhone: shipping.phone,
    shippingStreet: shipping.street,
    shippingCity: shipping.city,
    shippingCountry: shipping.country,
    shippingPostalCode: shipping.postalCode,
  };

  if (paymentMethod === "WALLET") {
    if (req.user.walletBalance < subtotal)
      return res.status(402).json({ error: "Insufficient wallet balance.", shortfall: subtotal - req.user.walletBalance });

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id, subtotal, ...shippingData,
          paymentMethod: "WALLET", status: "PAID", providerVerified: true,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });
      await tx.user.update({ where: { id: req.user.id }, data: { walletBalance: { decrement: subtotal } } });
      await tx.walletTransaction.create({
        data: { userId: req.user.id, type: "DEBIT", amount: subtotal, verified: true, note: `Order ${created.id}` },
      });
      return created;
    });

    await sendReceipt(order, req.user.email);
    await sendOwnerAlert(order);
    await sendOwnerWhatsAppAlert(order);
    await prisma.order.update({ where: { id: order.id }, data: { invoiceSentAt: new Date() } });
    return res.status(201).json({ order, paid: true });
  }

  let provider;
  try {
    provider = getProvider(paymentMethod);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const reference = `1111-${paymentMethod.toLowerCase()}-${crypto.randomBytes(8).toString("hex")}`;
  const order = await prisma.order.create({
    data: {
      userId: req.user.id, subtotal, ...shippingData,
      paymentMethod, providerRef: reference,
      items: { create: orderItems },
    },
    include: { items: { include: { product: true } } },
  });

  const checkout = await provider.initializeTransaction({
    email: req.user.email,
    amountKobo: subtotal,
    reference,
    // Per spec: the full shipping address is embedded in the gateway's own
    // metadata too, as a redundant record on their side — even though our
    // own database write above is what fulfillment actually relies on.
    metadata: {
      orderId: order.id,
      shippingAddress: shippingData,
    },
  });

  res.status(201).json({ order, checkoutUrl: checkout.checkoutUrl });
});

router.get("/", requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

router.get("/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ order });
});

router.post("/:id/receipt", requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email address." });

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id, status: "PAID" },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: "Paid order not found." });

  await sendReceipt(order, email);
  res.json({ message: `Receipt sent to ${email}.` });
});

module.exports = router;
