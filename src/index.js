require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const walletRoutes = require("./routes/wallet");
const webhookRoutes = require("./routes/webhook");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const marketingRoutes = require("./routes/marketing");
const { startPromoCron } = require("./jobs/promoEmails");

const app = express();

app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
// FRONTEND_URL supports a comma-separated list, so the same env var can carry
// the production Vercel domain plus a local dev URL, e.g.:
//   FRONTEND_URL="https://the1111project.vercel.app,http://localhost:3000"
// Vercel preview deployments (*.vercel.app) are always allowed too, so PR
// previews work against the API without needing a new env var per branch.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / server-to-server / curl — no Origin header sent
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} is not allowed.`));
    },
    credentials: true,
  })
);

// Webhook routes MUST come before express.json() and must use express.raw(),
// because each gateway's signature is computed over the raw request bytes.
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// ── Routes — everything lives under /api to match the frontend's API client ──
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/marketing", marketingRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
// Bare /health kept for uptime monitors / Railway health checks that don't know about /api.
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 fallback — anything under /api that didn't match a route above.
app.use("/api", (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (err && /^CORS:/.test(err.message)) {
    return res.status(403).json({ error: "This origin is not permitted to access the API." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

// Starts the every-3-days promotional email cycle. Safe to leave running —
// each user is only actually emailed once their own 3-day window is up.
startPromoCron();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`1111 Project API running on port ${PORT}`));
