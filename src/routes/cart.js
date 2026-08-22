const express = require("express");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { isValidFraming, DEFAULT_FRAMING } = require("../utils/framing");

const router = express.Router();

// Same serializer shape used by products.js — a cart line embeds the full
// serialized product so the frontend's `CartLine` type (product, framing,
// quantity) can be reconstructed directly from the API response.
function serializeLine(item) {
  const p = item.product;
  return {
    quantity: item.qty,
    framing: item.framing || DEFAULT_FRAMING,
    product: {
      id: p.id,
      title: p.name,
      series: p.series || "",
      year: p.year ?? new Date(p.createdAt).getFullYear(),
      price: p.price,
      image: p.imageUrl,
      medium: p.medium || "",
      dimensions: p.dimensions || p.size || "",
      editionSize: p.editionSize || 0,
      editionRemaining: p.editionRemaining ?? 0,
      availability: (p.editionSize || 0) > 0 && (p.editionRemaining ?? 0) <= 0 ? "sold" : "available",
      description: p.description || "",
      arDurationSeconds: p.arDurationSeconds || 30,
    },
  };
}

// GET /api/cart — restores the buyer's cart on login/page load, across devices.
router.get("/", requireAuth, async (req, res) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } },
  });
  res.json({ items: (cart?.items || []).map(serializeLine) });
});

// PUT /api/cart — { items: [{ productId, qty, framing }] } — replaces the
// cart wholesale. Frontend calls this (debounced) whenever the cart changes.
router.put("/", requireAuth, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array." });

  for (const i of items) {
    if (i.framing && !isValidFraming(i.framing)) {
      return res.status(400).json({ error: `Unknown framing option: ${i.framing}` });
    }
  }

  const cart = await prisma.cart.upsert({
    where: { userId: req.user.id },
    update: {},
    create: { userId: req.user.id },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (items.length) {
    await prisma.cartItem.createMany({
      data: items.map((i) => ({
        cartId: cart.id,
        productId: i.productId,
        qty: i.qty,
        framing: i.framing || DEFAULT_FRAMING,
      })),
    });
  }

  res.json({ message: "Cart saved." });
});

module.exports = router;
