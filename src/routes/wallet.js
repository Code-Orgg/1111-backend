const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { getProvider, availableProviders } = require("../services/providers");
const { toKobo } = require("../utils/currency");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const tx = await prisma.walletTransaction.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
  res.json({ balance: req.user.walletBalance, transactions: tx });
});

router.get("/payment-methods", (req, res) => {
  res.json({ methods: availableProviders().map((p) => p.name) });
});

// POST /api/wallet/fund — { amountUSD, provider: 'PAYSTACK' | 'SQUAD' | 'MONNIFY' }
router.post("/fund", requireAuth, async (req, res) => {
  const { amountUSD, provider: providerName } = req.body;
  if (!amountUSD || amountUSD < 50) return res.status(400).json({ error: "Minimum funding amount is $50." });

  let provider;
  try {
    provider = getProvider(providerName);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const reference = `wallet-${providerName.toLowerCase()}-${crypto.randomBytes(8).toString("hex")}`;

  await prisma.walletTransaction.create({
    data: { userId: req.user.id, type: "FUND", amount: amountUSD, provider: providerName, providerRef: reference, verified: false },
  });

  const checkout = await provider.initializeTransaction({
    email: req.user.email,
    amountKobo: toKobo(amountUSD),
    reference,
    metadata: { userId: req.user.id, purpose: "wallet_fund", name: req.user.name || req.user.email },
  });

  res.json({ checkoutUrl: checkout.checkoutUrl });
});

module.exports = router;
