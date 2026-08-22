// ── Currency ──────────────────────────────────────────────────────────────
// Canonical unit across this app (Product.price, Order.subtotal, OrderItem.price,
// WalletTransaction.amount, User.walletBalance) is USD, stored as a whole-dollar
// integer — this matches how the frontend displays prices (Intl currency, 0
// fraction digits) and keeps every amount an integer with no floating point risk.
//
// The Naira payment gateways (Paystack/Squad/Monnify) require kobo (1 NGN = 100
// kobo), so conversion only happens once, right at the provider boundary, using
// NGN_PER_USD — an approximate, manually-configured FX rate. This is NOT a live
// market rate; update the env var by hand when it drifts meaningfully.

const DEFAULT_NGN_PER_USD = 1600;

function ngnPerUsd() {
  const rate = Number(process.env.NGN_PER_USD);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_NGN_PER_USD;
}

// USD whole-dollar amount -> integer kobo, for handing to a Naira gateway.
function toKobo(usdAmount) {
  return Math.round(usdAmount * ngnPerUsd() * 100);
}

// Integer kobo (as returned by a verified NGN transaction) -> whole-dollar USD,
// for reconciling a provider's verified amount against our own records.
function fromKobo(koboAmount) {
  return Math.round(koboAmount / ngnPerUsd() / 100);
}

const fmtUSD = (usd) =>
  Number(usd).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

module.exports = { toKobo, fromKobo, fmtUSD, ngnPerUsd };
