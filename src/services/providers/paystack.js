const axios = require("axios");
const crypto = require("crypto");

const client = axios.create({
  baseURL: "https://api.paystack.co",
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
});

const isConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function initializeTransaction({ email, amountKobo, reference, metadata }) {
  const { data } = await client.post("/transaction/initialize", {
    email, amount: amountKobo, reference, metadata,
  });
  return { checkoutUrl: data.data.authorization_url, reference: data.data.reference };
}

async function verifyTransaction(reference) {
  const { data } = await client.get(`/transaction/verify/${reference}`);
  return { success: data.data.status === "success", amountKobo: data.data.amount };
}

function verifyWebhookSignature(rawBody, headers) {
  const signature = headers["x-paystack-signature"];
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}

// Paystack's webhook payload shape -> generic { event, reference }
function parseWebhookEvent(rawBody) {
  const body = JSON.parse(rawBody.toString("utf8"));
  return {
    isSuccessEvent: body.event === "charge.success",
    reference: body.data?.reference,
  };
}

module.exports = { name: "PAYSTACK", isConfigured, initializeTransaction, verifyTransaction, verifyWebhookSignature, parseWebhookEvent };
