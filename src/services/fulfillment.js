const prisma = require("../db");
const { getProvider } = require("./providers");
const { sendReceipt, sendOwnerAlert, sendWalletFundedEmail } = require("./email");
const { sendOwnerWhatsAppAlert } = require("./whatsapp");
const { toKobo } = require("../utils/currency");

// Called by any of the three webhook handlers once their signature check
// passes. Re-verifies server-to-server with the actual provider (never
// trusts the webhook payload's stated status alone), then fulfills whichever
// record — order or wallet top-up — the reference belongs to. Idempotent:
// safe to call twice for the same reference (providers do occasionally
// redeliver webhooks).
async function confirmPayment(reference, providerName) {
  const provider = getProvider(providerName);

  const order = await prisma.order.findUnique({
    where: { providerRef: reference },
    include: { items: { include: { product: true } }, user: true },
  });

  if (order) {
    if (order.status === "PAID") return { type: "order", already: true };
    const verified = await provider.verifyTransaction(reference);
    if (!verified.success) return { type: "order", failed: true };

    // Confirm the amount actually paid matches what this order should cost —
    // a signature check alone only proves the event came from the provider,
    // not that it paid for the right amount (e.g. a stale/replayed reference
    // paid at a lower, previously-quoted price). 1 kobo of tolerance for
    // integer rounding in the USD->kobo conversion.
    const expectedKobo = toKobo(order.subtotal);
    if (verified.amountKobo != null && Math.abs(verified.amountKobo - expectedKobo) > 1) {
      console.error(`Amount mismatch on order ${order.id}: expected ${expectedKobo} kobo, provider reports ${verified.amountKobo} kobo.`);
      return { type: "order", failed: true, reason: "amount_mismatch" };
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", providerVerified: true },
      include: { items: { include: { product: true } } },
    });
    await sendReceipt(updated, order.user.email);
    await sendOwnerAlert(updated);
    await sendOwnerWhatsAppAlert(updated);
    await prisma.order.update({ where: { id: order.id }, data: { invoiceSentAt: new Date() } });
    return { type: "order", confirmed: true };
  }

  const walletTx = await prisma.walletTransaction.findUnique({ where: { providerRef: reference } });
  if (walletTx) {
    if (walletTx.verified) return { type: "wallet", already: true };
    const verified = await provider.verifyTransaction(reference);
    if (!verified.success) return { type: "wallet", failed: true };

    const expectedKobo = toKobo(walletTx.amount);
    if (verified.amountKobo != null && Math.abs(verified.amountKobo - expectedKobo) > 1) {
      console.error(`Amount mismatch on wallet tx ${walletTx.id}: expected ${expectedKobo} kobo, provider reports ${verified.amountKobo} kobo.`);
      return { type: "wallet", failed: true, reason: "amount_mismatch" };
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.walletTransaction.update({ where: { id: walletTx.id }, data: { verified: true } });
      return tx.user.update({ where: { id: walletTx.userId }, data: { walletBalance: { increment: walletTx.amount } } });
    });
    await sendWalletFundedEmail(user, walletTx.amount);
    return { type: "wallet", confirmed: true };
  }

  return { type: "unknown" };
}

module.exports = { confirmPayment };
