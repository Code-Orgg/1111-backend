const express = require("express");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { sendNewDropEmail } = require("../services/email");

const router = express.Router();

// Maps a Prisma Product row onto the exact shape the frontend's `Product`
// type (lib/types.ts) expects. Keeping this mapping in one place means the
// DB's own field names (name/imageUrl/size) never have to match the
// storefront's (title/image/dimensions) — this function is the contract.
function serializeProduct(p) {
  const editionSize = p.editionSize || 0;
  const editionRemaining = p.editionRemaining ?? 0;

  let availability = "available";
  if (editionSize > 0 && editionRemaining <= 0) availability = "sold";
  else if (editionSize > 0 && editionRemaining / editionSize <= 0.15) availability = "low";

  return {
    id: p.id,
    title: p.name,
    series: p.series || "",
    year: p.year ?? new Date(p.createdAt).getFullYear(),
    price: p.price,
    image: p.imageUrl,
    medium: p.medium || "",
    dimensions: p.dimensions || p.size || "",
    editionSize,
    editionRemaining,
    availability,
    description: p.description || "",
    arDurationSeconds: p.arDurationSeconds || 30,
  };
}

// GET /api/products — public. Returns a bare array (not { products: [...] })
// to match `getProducts()` in the frontend's lib/api.ts exactly.
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  res.json(products.map(serializeProduct));
});

// GET /api/products/:id — public. Was previously missing entirely, so every
// artwork detail page (`/artwork/[id]`) fell back to the local demo catalogue.
router.get("/:id", async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.params.id, active: true } });
  if (!product) return res.status(404).json({ error: "Artwork not found." });
  res.json(serializeProduct(product));
});

// POST /api/products — admin only. Creating a piece automatically emails
// every opted-in user a "new drop" announcement.
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const {
    title, series, size, price, imageUrl, edition,
    dimensions, medium, year, description,
    editionSize, editionRemaining, arDurationSeconds,
  } = req.body;

  if (!title || !price || !imageUrl) {
    return res.status(400).json({ error: "title, price, imageUrl are required." });
  }

  const product = await prisma.product.create({
    data: {
      name: title,
      series, size: size || dimensions || "", edition,
      price, imageUrl, dimensions, medium, description,
      year: year ?? new Date().getFullYear(),
      editionSize: editionSize ?? 0,
      editionRemaining: editionRemaining ?? editionSize ?? 0,
      arDurationSeconds: arDurationSeconds ?? 30,
      slug: `${String(title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    },
  });

  const subscribers = await prisma.user.findMany({
    where: { active: true, marketingOptIn: true, deletedAt: null },
    select: { id: true, email: true },
  });
  sendNewDropEmail(subscribers, product).catch((err) => console.error("New drop broadcast failed:", err));

  res.status(201).json({ product: serializeProduct(product), notified: subscribers.length });
});

module.exports = router;
