# Going Live — Step by Step

You can have a **fully working demo live tonight**. Real money moving depends on
whichever payment gateway(s) the owner finishes verifying — see Part 5.

---

## Part 1 — What YOU need (no owner input required)

1. **GitHub** account — free
2. **Railway** account (railway.app) — sign in with GitHub, free tier is enough
3. **Vercel** account (vercel.com) — sign in with GitHub
4. **Resend** account (resend.com) — free tier, 100 emails/day
5. **At least one** payment gateway test account, sign up yourself, no owner needed:
   - Squad: squadco.com → gives sandbox keys instantly
   - Monnify: moniepoint.com/monnify → gives sandbox keys instantly
   - Paystack: dashboard.paystack.com → gives test keys instantly
   - You don't need all three for the demo — start with whichever signs you up
     fastest, add the others later just by adding env vars (no code changes).

---

## Part 2 — Push to GitHub

```bash
cd 1111-backend && git init && git add . && git commit -m "Initial commit"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/1111-backend.git
git push -u origin main

# repeat in 1111-frontend
```

---

## Part 3 — Deploy the backend (Railway)

1. Railway → New Project → Deploy from GitHub → `1111-backend`
2. Railway → New → Database → PostgreSQL (same project — this sets `DATABASE_URL` automatically)
3. Backend service → Variables → paste in `.env.example`, filled in:
   - `JWT_SECRET` — `openssl rand -hex 32`
   - Fill in keys for whichever gateway(s) you signed up for in Part 1 — leave the others blank, the app will just not offer them yet
   - `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`
   - `FRONTEND_URL` — fill in after Part 4
4. Railway → Settings → generate a public domain
5. Run migrations (Railway shell, or locally against the Railway `DATABASE_URL`):
   ```bash
   npx prisma migrate deploy
   node prisma/seed.js
   ```
6. Register webhooks — only for the gateway(s) you configured:
   - Paystack dashboard → Webhook URL → `https://your-domain/webhook/paystack`
   - Squad dashboard → Profile → API & Webhook → `https://your-domain/webhook/squad`
   - Monnify dashboard → Settings → Webhooks → `https://your-domain/webhook/monnify`
7. Confirm it's alive: visit `https://your-domain/health`

## Part 4 — Deploy the frontend (Vercel)

1. Vercel → Add New Project → import `1111-frontend`
2. Framework: Vite (auto-detected)
3. Environment Variables → `VITE_API_BASE_URL` = your Railway URL
4. Deploy → you get a live URL like `1111-project.vercel.app`
5. Back in Railway, set `FRONTEND_URL` to this Vercel URL

**You now have a real, live, clickable demo.** Accounts, cart, checkout through
whichever gateway you configured, real emailed invoice, real owner alert — all working.

---

## Part 5 — What the OWNER needs to provide (only required to accept real money)

| Item | Why |
|---|---|
| Real WhatsApp number | Swap into `WHATSAPP_NUMBER` in `App.jsx` |
| Real business email | `OWNER_EMAIL` / `EMAIL_FROM` |
| Verification with whichever gateway(s) they want live | Squad and Monnify tend to onboard faster than Paystack — but none of us control exact turnaround. Whichever finishes first, flip that one live first; the others can follow later with zero code changes. |
| Real bank account linked on the verified gateway | This is what makes settlements actually land in their bank |
| Real domain (optional) | If they want branded URL instead of the free Vercel one |

Going from test → live on any given gateway is just swapping that gateway's
keys in Railway from test to live and re-registering the webhook under live mode.
Nothing else in the code changes — and if the owner only finishes verifying
one gateway by tomorrow, the demo still works perfectly with just that one.

## Updating later
Push to GitHub → Railway and Vercel both auto-redeploy. No manual step.
