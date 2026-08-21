const axios = require("axios");
const crypto = require("crypto");

// SQUAD_BASE_URL: use https://sandbox-api-d.squadco.com while testing,
// switch to Squad's live base URL (confirm exact value in your Squad dashboard
// docs before going live — providers occasionally adjust these) once verified.
const BASE_URL = process.env.SQUAD_BASE_URL || "https://sandbox-api-d.squadco.com";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${process.env.SQUAD_SECRET_KEY}` },
});

const isConfigured = () => Boolean(process.env.SQUAD_SECRET_KEY);

async function initializeTransaction({ email, amountKobo, reference, metadata }) {
  const { data } = await client.post("/transaction/initiate", {
    amount: amountKobo,
    email,
    currency: "NGN",
    transaction_ref: reference,
    customer: { name: metadata?.name || email, email },
  });
  return { checkoutUrl: data.data.checkout_url, reference };
}

async function verifyTransaction(reference) {
  const { data } = await client.get(`/transaction/verify/${reference}`);
  return {
    success: data.data.transaction_status === "Success",
    amountKobo: data.data.amount,
  };
}

// Squad signs the webhook with HMAC-SHA512 over the raw payload, header: x-squad-signature
function verifyWebhookSignature(rawBody, headers) {
  const signature = headers["x-squad-signature"];
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", process.env.SQUAD_SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}

function parseWebhookEvent(rawBody) {
  const body = JSON.parse(rawBody.toString("utf8"));
  return {
    isSuccessEvent: body.Event === "charge_successful" && body.Body?.transaction_status === "Success",
    reference: body.Body?.transaction_ref || body.TransactionRef,
  };
}

module.exports = { name: "SQUAD", isConfigured, initializeTransaction, verifyTransaction, verifyWebhookSignature, parseWebhookEvent };
