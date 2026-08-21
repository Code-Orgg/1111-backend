const prisma = require("../db");
const { getProvider } = require("./providers");
const { sendReceipt, sendOwnerAlert, sendWalletFundedEmail } = require("./email");
const { sendOwnerWhatsAppAlert } = require("./whatsapp");

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
