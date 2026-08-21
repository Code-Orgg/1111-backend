const express = require("express");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { sendNewDropEmail } = require("../services/email");

const router = express.Router();

// GET /products — public
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  res.json({ products });
});

// POST /products — admin only. Creating a piece automatically emails every
// opted-in user a "new drop" announcement — this is what makes uploading new
// art trigger the notification, with zero extra steps for the owner.
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, series, size, price, imageUrl, edition } = req.body;
  if (!name || !size || !price || !imageUrl) return res.status(400).json({ error: "name, size, price, imageUrl are required." });

  const product = await prisma.product.create({ data: { name, series, size, price, imageUrl, edition } });

  const subscribers = await prisma.user.findMany({
    where: { active: true, marketingOptIn: true, deletedAt: null },
    select: { id: true, email: true },
  });
  sendNewDropEmail(subscribers, product).catch((err) => console.error("New drop broadcast failed:", err));

  res.status(201).json({ product, notified: subscribers.length });
});

module.exports = router;
