# The 1111 Project — Backend

Real auth, real Paystack payments, wallet balance, PDF invoices, owner payment alerts.

## What this actually does
- **Accounts**: signup / login / logout / deactivate (reversible) / permanent delete
- **Payments**: choice of Paystack, Squad, or Monnify at checkout — or pay-from-wallet. Only gateways with keys configured are ever offered. Verified **server-side**, never trusted from the frontend alone.
- **Owner payout**: handled entirely by whichever gateway's own settlement to the linked bank account — this backend does not move money itself.
- **Receipts**: instant, itemized, PDF-attached — emailed automatically on every confirmed payment, and on-demand to any email address the buyer chooses from the confirmation screen.
- **Owner alert**: email sent to `OWNER_EMAIL` the instant any payment is confirmed, plus an optional WhatsApp message via Twilio if configured.

## Setting up owner WhatsApp alerts (optional)
1. Create a Twilio account, grab your Account SID + Auth Token.
2. For quick testing: join Twilio's WhatsApp sandbox (Twilio console -> Messaging -> Try WhatsApp) -- the owner sends a join code from their phone once, then TWILIO_WHATSAPP_FROM="whatsapp:+14155238886" works immediately for freeform messages.
3. For real production use, the sandbox isn't enough -- WhatsApp requires the owner's business to be verified with Meta and to use a pre-approved message template for any notification the business sends first (this is a WhatsApp platform rule, not a Twilio limitation). Steps: Twilio console -> Messaging -> WhatsApp senders -> register the owner's real number -> submit a message template for approval -> once approved, set TWILIO_WHATSAPP_TEMPLATE_SID to that template's SID. Approval typically takes a few hours to a couple of days, on Meta's timeline, not something either of us controls.
4. Until the template is approved, leave TWILIO_WHATSAPP_TEMPLATE_SID blank -- the app automatically falls back to sandbox freeform mode, which is fine for testing but won't reliably work for real customers in production.
- **Persisted cart**: synced to the database so it survives across devices — and so the promo email job can actually see what's in someone's cart.
- **Promotional emails**: a daily cron job checks every opted-in user; if it's been 3+ days since their last promo email, they get an abandoned-cart nudge (if they have items sitting in cart) or a general re-engagement email (if not). Every promotional email includes a working unsubscribe link — required for deliverability and basic legal compliance (NDPR/CAN-SPAM style rules).
- **New drop announcements**: creating a product via the admin endpoint automatically emails every opted-in user.

## Making yourself (or the owner) an admin
There's no admin UI yet — the fastest path is directly in the database:
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'owner@example.com';
```
Run this via Railway's Postgres data tab, or `npx prisma studio` locally against the same `DATABASE_URL`.

Once admin, adding a new piece (which also triggers the drop-announcement email) is:
```bash
curl -X POST https://your-backend/products \
  -H "Authorization: Bearer <admin's JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Piece","size":"Standard — 20×28in","price":35000000,"imageUrl":"https://...","edition":"12 / 1111","series":"S.A.I. Series"}'
```
(`price` is in kobo — ₦350,000 = 35000000)

## Setup

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma migrate deploy
node prisma/seed.js    # loads the 4 starter artworks
npm start
```

## What you must replace before this is "real"

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Create a free Postgres DB on [Supabase](https://supabase.com) or [Neon](https://neon.tech) |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | [Paystack dashboard](https://dashboard.paystack.com) — owner must complete business verification and link their real bank account for live payouts |
| `RESEND_API_KEY` | [resend.com](https://resend.com) — free tier is enough to start |
| `OWNER_EMAIL` | The real inbox that should get "you just got paid" alerts |
| `JWT_SECRET` | Run `openssl rand -hex 32`, paste the output |

**Register the webhook**: in the Paystack dashboard, set the webhook URL to
`https://<your-deployed-backend>/webhook/paystack`. This is what triggers invoice
emails and owner alerts — without it, payments will still be collected but nothing
downstream will fire.

## Deploying
Any Node host works — [Railway](https://railway.app) or [Render](https://render.com)
are the simplest (both can also host the Postgres DB). Point the frontend's
`API_BASE_URL` at whatever domain you deploy this to.

## Going from test → live payments
1. Switch `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY` from `sk_test_.../pk_test_...` to `sk_live_.../pk_live_...`
2. Confirm the owner's Paystack business account is fully verified (required for live payouts to actually settle to their bank)
3. Re-register the webhook URL under live mode in the Paystack dashboard

## Notes on account deletion
Nigerian (and most) financial record-keeping rules require transaction records to be
retained even if a customer deletes their account. So: accounts with no completed
paid orders are erased completely. Accounts *with* paid orders have all personal data
(name, email, phone, password) wiped/anonymized, but the anonymized order record stays
for accounting purposes. This is standard practice, not a limitation of this build.
