const express = require("express");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /cart — restores the buyer's cart on login/page load, across devices.
router.get("/", requireAuth, async (req, res) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } },
  });
  res.json({ items: cart?.items || [] });
});

// PUT /cart — { items: [{ productId, qty }] } — replaces the cart wholesale.
// Frontend calls this (debounced) whenever the cart changes.
router.put("/", requireAuth, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array." });

  const cart = await prisma.cart.upsert({
    where: { userId: req.user.id },
    update: {},
    create: { userId: req.user.id },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (items.length) {
    await prisma.cartItem.createMany({
      data: items.map((i) => ({ cartId: cart.id, productId: i.productId, qty: i.qty })),
    });
  }

  res.json({ message: "Cart saved." });
});

module.exports = router;
