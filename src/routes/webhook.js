const express = require("express");
const { registry } = require("../services/providers");
const { confirmPayment } = require("../services/fulfillment");

const router = express.Router();

// One route per provider — each has its own signature scheme, so they can't
// share a single handler, but all three funnel into the same confirmPayment()
// once verified, so an order paid via any of the three is fulfilled identically.
function makeWebhookHandler(providerKey) {
  return async (req, res) => {
    const provider = registry[providerKey];
    const rawBody = req.body; // Buffer — see index.js, this route is mounted with express.raw()

    if (!provider.verifyWebhookSignature(rawBody, req.headers)) {
      return res.status(401).send("Invalid signature.");
    }

    const event = provider.parseWebhookEvent(rawBody);
    if (!event.isSuccessEvent || !event.reference) {
      return res.status(200).send("Ignored — not a successful payment event.");
    }

    try {
      const result = await confirmPayment(event.reference, providerKey);
      res.status(200).send(`OK: ${JSON.stringify(result)}`);
    } catch (err) {
      console.error(`${providerKey} webhook fulfillment error:`, err);
      // Still 200 so the provider doesn't hammer retries for an error on our side
      // that a retry won't fix; the failure is logged for manual follow-up.
      res.status(200).send("Received, but fulfillment failed — logged for review.");
    }
  };
}

router.post("/paystack", makeWebhookHandler("PAYSTACK"));
router.post("/squad", makeWebhookHandler("SQUAD"));
router.post("/monnify", makeWebhookHandler("MONNIFY"));

module.exports = router;
