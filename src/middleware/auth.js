const jwt = require("jsonwebtoken");
const prisma = require("../db");

// Verifies the JWT on protected routes and attaches the live user record to req.user.
// Rejects tokens for accounts that have been deactivated or permanently deleted —
// this is what makes "logout everywhere" / deactivation actually take effect immediately,
// not just on next token expiry.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.deletedAt) return res.status(401).json({ error: "Account no longer exists." });
    if (!user.active) return res.status(403).json({ error: "Account is deactivated. Reactivate to continue." });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

module.exports = { requireAuth };
