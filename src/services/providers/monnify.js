const axios = require("axios");
const crypto = require("crypto");

// MONNIFY_BASE_URL: https://sandbox.monnify.com while testing,
// https://api.monnify.com once the owner's contract is live.
const BASE_URL = process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";

const isConfigured = () =>
  Boolean(process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY && process.env.MONNIFY_CONTRACT_CODE);

// Monnify uses short-lived OAuth-style access tokens (Basic Auth to fetch,
// then Bearer on every subsequent call) — cache it in memory to avoid
// re-authenticating on every request.
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const basic = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
  const { data } = await axios.post(
    `${BASE_URL}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${basic}` } }
  );
  cachedToken = data.responseBody.accessToken;
  tokenExpiresAt = Date.now() + data.responseBody.expiresIn * 1000 - 60000; // refresh 1min early
  return cachedToken;
}

async function initializeTransaction({ email, amountKobo, reference, metadata }) {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
    {
      amount: amountKobo / 100, // Monnify expects Naira, not kobo
      customerName: metadata?.name || email,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: "The 1111 Project order",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return { checkoutUrl: data.responseBody.checkoutUrl, reference };
}

async function verifyTransaction(reference) {
  const token = await getAccessToken();
  const { data } = await axios.get(
    `${BASE_URL}/api/v1/merchant/transactions/query?paymentReference=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    success: data.responseBody.paymentStatus === "PAID",
    amountKobo: Math.round(data.responseBody.amountPaid * 100),
  };
}

// Monnify signs with HMAC-SHA512 over the raw payload using the Client Secret Key, header: monnify-signature
function verifyWebhookSignature(rawBody, headers) {
  const signature = headers["monnify-signature"];
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", process.env.MONNIFY_SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}

function parseWebhookEvent(rawBody) {
  const body = JSON.parse(rawBody.toString("utf8"));
  return {
    isSuccessEvent: body.eventType === "SUCCESSFUL_TRANSACTION" && body.eventData?.paymentStatus === "PAID",
    reference: body.eventData?.paymentReference,
  };
}

module.exports = { name: "MONNIFY", isConfigured, initializeTransaction, verifyTransaction, verifyWebhookSignature, parseWebhookEvent };
