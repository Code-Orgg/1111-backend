const express = require("express");
const prisma = require("../db");
const { verifyUnsubscribeToken } = require("../services/email");

const router = express.Router();

// GET /marketing/unsubscribe?u=userId&t=token — no login required (clicked
// from an email), but the signed token stops anyone from unsubscribing an
// email address that isn't theirs.
router.get("/unsubscribe", async (req, res) => {
  const { u, t } = req.query;
  if (!u || !t || !verifyUnsubscribeToken(u, t)) {
    return res.status(400).send("<h3>Invalid or expired unsubscribe link.</h3>");
  }
  await prisma.user.update({ where: { id: u }, data: { marketingOptIn: false } }).catch(() => {});
  res.send("<h3>You've been unsubscribed from promotional emails.</h3><p>You'll still receive order receipts and account emails.</p>");
});

module.exports = router;
