const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../db");
const { requireAuth } = require("../middleware/auth");
const { sendPasswordResetOtp } = require("../services/email");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    walletBalance: user.walletBalance,
  };
}

// POST /auth/signup
router.post("/signup", async (req, res) => {
  let { email, password, name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  email = email.toLowerCase().trim(); // normalize so "User@X.com" and "user@x.com" can't create two accounts

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, name, phone } });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  email = email?.toLowerCase().trim(); // same normalization, so login matches however signup stored it
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) return res.status(401).json({ error: "Invalid email or password." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password." });

  if (!user.active) {
    // Logging back in automatically reactivates a soft-deactivated account.
    await prisma.user.update({ where: { id: user.id }, data: { active: true } });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// POST /auth/logout
// JWTs are stateless, so "logout" is primarily a frontend action (discard the token).
// This endpoint exists for symmetry and as a hook if you later add a token-blacklist
// table for "logout everywhere" support.
router.post("/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out." });
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /auth/deactivate — temporary, reversible. Logging back in reactivates.
router.post("/deactivate", requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { active: false } });
  res.json({ message: "Account deactivated. Log back in any time to reactivate." });
});

// DELETE /auth/account — permanent deletion.
// Personal data (name, email, phone, password) is wiped/anonymized immediately.
// If the account has PAID orders, those order records are kept (anonymized to this
// account) rather than deleted outright — invoicing/tax records generally have to be
// retained regardless of account deletion. Accounts with no paid orders are removed
// completely, no trace kept.
router.delete("/account", requireAuth, async (req, res) => {
  const paidOrderCount = await prisma.order.count({
    where: { userId: req.user.id, status: "PAID" },
  });

  if (paidOrderCount > 0) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: `deleted-${req.user.id}@deleted.local`,
        passwordHash: "deleted",
        name: null,
        phone: null,
        active: false,
        deletedAt: new Date(),
      },
    });
    return res.json({
      message:
        "Account permanently deleted. Personal details removed. Past paid-order records were retained in anonymized form, as required for financial record-keeping.",
    });
  }

  // No paid orders — fully erase, nothing retained.
  await prisma.order.deleteMany({ where: { userId: req.user.id } }); // only PENDING/FAILED/CANCELLED reach here
  await prisma.walletTransaction.deleteMany({ where: { userId: req.user.id } });
  await prisma.user.delete({ where: { id: req.user.id } });
  res.json({ message: "Account and all associated data permanently deleted." });
});

// ── Password reset via OTP ──

// Cryptographically secure 6-digit code — crypto.randomInt, not Math.random,
// since this is a security-sensitive token even though it's short-lived.
function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

// POST /auth/forgot-password — { email }
// Always returns the same generic message regardless of whether the email
// exists, so this endpoint can't be used to enumerate registered accounts.
router.post("/forgot-password", async (req, res) => {
  let { email } = req.body;
  const GENERIC_RESPONSE = { message: "If this email exists, an OTP has been sent." };

  if (!email) return res.json(GENERIC_RESPONSE); // still generic even on missing input
  email = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return res.json(GENERIC_RESPONSE);

  const otp = generateOtp();
  const resetOtp = await bcrypt.hash(otp, 10);
  const resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({ where: { id: user.id }, data: { resetOtp, resetOtpExpiry } });

  try {
    await sendPasswordResetOtp(user, otp);
  } catch (err) {
    console.error("Failed to send password reset OTP:", err.message);
    // Still return the generic success response — don't leak email-sending
    // failures to the client, and don't let it hint the account exists.
  }

  res.json(GENERIC_RESPONSE);
});

// Shared OTP re-verification logic used by both /verify-otp and /reset-password.
async function checkOtp(email, otp) {
  if (!email || !otp) return { valid: false, error: "Email and code are required." };
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.resetOtp || !user.resetOtpExpiry) return { valid: false, error: "Invalid or expired code." };
  if (user.resetOtpExpiry < new Date()) return { valid: false, error: "This code has expired. Request a new one." };

  const matches = await bcrypt.compare(String(otp), user.resetOtp);
  if (!matches) return { valid: false, error: "Incorrect code." };

  return { valid: true, user };
}

// POST /auth/verify-otp — { email, otp }
// Confirms the code is correct without consuming it — the OTP stays valid
// until reset-password actually succeeds, so the user can navigate back and
// forth in the flow without needing a fresh code each time.
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const result = await checkOtp(email, otp);
  if (!result.valid) return res.status(400).json({ error: result.error });

  // Short-lived token confirming this step passed — 10 min, matching the OTP
  // window. Not required by reset-password below (which re-verifies the OTP
  // independently), but returned for the frontend to gate the password step.
  const recoveryToken = jwt.sign({ sub: result.user.id, purpose: "password_reset" }, process.env.JWT_SECRET, { expiresIn: "10m" });
  res.json({ verified: true, recoveryToken });
});

// POST /auth/reset-password — { email, otp, newPassword }
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });

  const result = await checkOtp(email, otp);
  if (!result.valid) return res.status(400).json({ error: result.error });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: result.user.id },
    data: { passwordHash, resetOtp: null, resetOtpExpiry: null },
  });

  res.json({ message: "Password updated. You can now sign in with your new password." });
});

module.exports = router;
