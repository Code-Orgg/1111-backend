// Mirrors frontend `FRAMING_OPTIONS` in lib/demo-data.ts. Kept server-side and
// authoritative so a buyer can't tamper with the price by sending an arbitrary
// framingModifier from the client — the server always looks the modifier up by
// framing id, never trusts a client-supplied amount.
const FRAMING_OPTIONS = [
  { id: "natural-oak", label: "Natural Oak", priceModifier: 0 },
  { id: "matte-black", label: "Matte Black", priceModifier: 120 },
  { id: "gilded", label: "Hand-Gilded", priceModifier: 340 },
  { id: "unframed", label: "Unframed (rolled)", priceModifier: -180 },
];

const DEFAULT_FRAMING = "natural-oak";

function framingModifier(framingId) {
  return FRAMING_OPTIONS.find((f) => f.id === framingId)?.priceModifier ?? 0;
}

function isValidFraming(framingId) {
  return FRAMING_OPTIONS.some((f) => f.id === framingId);
}

module.exports = { FRAMING_OPTIONS, DEFAULT_FRAMING, framingModifier, isValidFraming };
