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
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Webhook route MUST come before express.json() and must use express.raw(),
// because each gateway's signature is computed over the raw request bytes.
app.use("/webhook", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
app.use("/auth/login", authLimiter);
app.use("/auth/signup", authLimiter);
app.use("/auth/forgot-password", authLimiter);
app.use("/auth/verify-otp", authLimiter);
app.use("/auth/reset-password", authLimiter);

app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);
app.use("/wallet", walletRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/marketing", marketingRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

// Starts the every-3-days promotional email cycle. Safe to leave running —
// each user is only actually emailed once their own 3-day window is up.
startPromoCron();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`1111 Project API running on port ${PORT}`));
