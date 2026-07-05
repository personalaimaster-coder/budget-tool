# Family Budget — Voice-Controlled PWA

An installable PWA for tracking a family budget. Speak an expense and AI (Google Gemini) transcribes, parses, and categorises it in one shot. Confirm, tweak if needed, and it's saved. Set up budgets once a month, get live over-budget warnings, and generate an AI spending report at month-end.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Supabase (PostgreSQL) · Google Gemini  
**Cost:** Runs free on Vercel Hobby + Supabase free tier + Gemini free tier. Typical paid usage for two people is < ₹5/month.

---

## How it works

- **Voice recording:** `MediaRecorder` captures audio in the browser, re-encoded client-side to 16 kHz mono WAV (the format Gemini accepts reliably, including in an installed iOS PWA).
- **AI parsing:** one Gemini call transcribes the audio and returns `{ amount, category, item, description, transcript }` mapped to your actual budget categories.
- **Security:** a shared passcode sets an `httpOnly` cookie. Every database call goes through server-side API routes using the Supabase service-role key. RLS is enabled with no public policies, so the anon key can't touch your data.

---

## 1. Create the accounts (all free)

### Supabase

1. [supabase.com](https://supabase.com) → **New project** → pick a region → set a DB password.
2. Open **SQL Editor** and run the right file:
   - **Fresh install** → paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - **Existing install (older schema)** → paste [`supabase/migration-002.sql`](supabase/migration-002.sql) instead. It is non-destructive — your existing data is migrated, not dropped.
3. **Project URL** (`SUPABASE_URL`): click the **Connect** button at the top of the dashboard, or go to **Settings → API** — it's shown as *Project URL*.
4. **Secret key** (`SUPABASE_SERVICE_ROLE_KEY`): go to **Settings → API Keys → API Keys tab** → create (or copy) a key starting with `sb_secret_...`. The **Legacy API Keys** tab still has the old `service_role` JWT if you prefer — both work.

### Google Gemini

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**.
2. The app uses `gemini-2.5-flash-lite` — it has a free tier and handles audio natively.
3. Copy the key → `GEMINI_API_KEY`.

> **Tip:** if you hit quota errors, the most common fix is creating a fresh API key in AI Studio (new keys get the free tier properly activated). Enabling pay-as-you-go billing costs < ₹2/month at this usage level.

### Vercel

1. [vercel.com](https://vercel.com) → sign up (free, sign in with GitHub).

---

## 2. Run locally

```bash
cp .env.example .env.local   # fill in the four values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your passcode, pick Husband/Wife, and start logging.

> The microphone API requires HTTPS or `localhost`. Dev works on `localhost`; Vercel handles HTTPS in production.

### Environment variables

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Connect button |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → `sb_secret_...` |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `APP_PASSCODE` | Any shared passcode you choose (e.g. `1234`) |

---

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → **Add New → Project** → import the repo.
3. **Settings → Environment Variables** → add the four variables above.
4. Deploy → open the URL in Safari on iPhone.

### Install on iPhone as a PWA

1. Open the deployed URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch from the home screen — it runs full-screen with no Safari UI.

---

## App — 3 pages, bottom nav

### Log (`/`) — daily use
- Large mic button. Tap, speak your expense (e.g. *"spent 450 on petrol, filled up the car"*), tap again to stop.
- Gemini extracts: amount, category, item name, and any extra description you mentioned.
- Confirm (or correct) in the modal, then save.
- **Budget alerts** show directly below the mic — over-80% warnings in amber, over-100% in red. Nothing else clutters this page.

### Budget (`/budget`) — monthly setup
- **Month switcher** — browse any past or future month.
- **Carry forward** — copies the previous month's planned amounts so you only tweak what changed.
- **Income** — add multiple income entries per month (label, amount, who earned it).
- **Income / Planned / Leftover** summary so you can see at a glance if you've over-planned.
- **Planned budget** — set an amount for every category, grouped by kind:
  - Fixed Expense (rent, EMI — recurring, non-negotiable)
  - Variable Expense (groceries, fuel — varies month to month)
  - Saving (emergency fund, etc.)
  - Investment (mutual funds, etc.)
- Each category also carries a **priority**: Must-have or Optional.
- **Add / edit / delete categories** inline — the list is fully yours to shape.
- **Save** writes all planned amounts for that month.
- **Generate Month Report** — sends the month's income, plan, and actuals to Gemini for an AI analysis: what went over, who spent what, and 3 specific rules for next month.

### Expenses (`/expenses`) — transaction log
- **Filters**: month · person (Husband / Wife) · type (Fixed / Variable / Saving / Investment) · category.
- Running total shown below filters.
- Each row shows spender avatar, item, category, date, description snippet, and amount.
- **Edit** any expense retroactively — amount, category, item, description, date, and who spent it.
- **Delete** any expense.
- **Add expense manually** — same full edit form, opened in create mode, pre-filled with the current device user.

---

## Data model

| Table / Function | Purpose |
|---|---|
| `budget_categories` | User-managed buckets — name, kind, priority, sort order |
| `monthly_budgets` | Planned amount per category per month (1st-of-month date key) |
| `incomes` | Income entries per month — label, amount, spender |
| `expenses` | Transactions — amount, category, `item_description`, `description`, spender, date |
| `budget_status_for_month(p_month)` | Planned vs actual per category for any given month |

RLS is enabled on all tables with no permissive policies. The public anon key has no access. All reads and writes go through server API routes (`/api/*`) using the service-role key.

---

## Customising

- **Categories, kinds, priorities, limits:** managed entirely in-app on the Budget page — no code changes needed.
- **Spender names:** change `SPENDERS` in `src/lib/categories.ts` (currently `["Husband", "Wife"]`).
- **Currency / timezone:** INR + Asia/Kolkata throughout. Change `formatINR` in `src/lib/categories.ts` and the timezone in `src/lib/month.ts` and `supabase/schema.sql`.
- **AI model:** set in `src/app/api/parse-expense/route.ts` and `src/app/api/analyze-budget/route.ts` (currently `gemini-2.5-flash-lite`).

## Regenerate icons

```bash
node scripts/generate-icons.mjs
```
