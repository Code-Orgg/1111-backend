const cron = require("node-cron");
const prisma = require("../db");
const { sendAbandonedCartEmail, sendReEngagementEmail } = require("../services/email");

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function runPromoCycle() {
  const cutoff = new Date(Date.now() - THREE_DAYS_MS);

  const dueUsers = await prisma.user.findMany({
    where: {
      active: true,
      marketingOptIn: true,
      deletedAt: null,
      OR: [{ lastPromoEmailAt: null }, { lastPromoEmailAt: { lte: cutoff } }],
    },
    include: { cart: { include: { items: { include: { product: true } } } } },
  });

  for (const user of dueUsers) {
    try {
      const cartItems = user.cart?.items || [];
      if (cartItems.length > 0) {
        await sendAbandonedCartEmail(user, cartItems);
      } else {
        await sendReEngagementEmail(user);
      }
      await prisma.user.update({ where: { id: user.id }, data: { lastPromoEmailAt: new Date() } });
    } catch (err) {
      console.error(`Promo email failed for user ${user.id}:`, err.message);
      // one failure shouldn't stop the rest of the batch — continue the loop
    }
  }

  console.log(`Promo cycle: emailed ${dueUsers.length} users.`);
}

// Runs once a day at 9am server time; each individual user is still only
// emailed every 3 days thanks to the lastPromoEmailAt check above.
function startPromoCron() {
  cron.schedule("0 9 * * *", runPromoCycle);
}

module.exports = { startPromoCron, runPromoCycle };
