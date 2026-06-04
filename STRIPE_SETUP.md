# Tiered access + Stripe setup

The gallery has three access tiers:

| Tier | Name      | Unlocks                        | Billing                |
|------|-----------|--------------------------------|------------------------|
| 0    | Viewer    | 5 random works (assigned once) | Free                   |
| 1    | Collector | 15 works (the 5 + 10 more)     | Stripe subscription    |
| 2    | Patron    | The full collection            | Stripe subscription    |

Each user's random set is generated on first sign-in and stored in `users/{uid}`.
Tier is **only ever written server-side** (Admin SDK), so paid access can't be
self-granted from the browser. Stripe drives tier changes.

### How new works behave across tiers (by design)

Tier 0/1 selections are **frozen** — drawn once at first sign-in and never
reshuffled or topped up:

- **Tier 0** always sees the *same* 5 works. **Tier 1** always sees the *same* 15.
- **Works added to the catalogue later are NOT given to tier 0/1 users** (whether
  they're existing members or brand-new signups whose draw happened before the
  work existed).
- The **only** way to see anything beyond your original selection is **tier 2**,
  which always reflects the full, live catalogue.

So newer works are an **upgrade incentive**, not something that rotates into
lower tiers. This is intentional — if a tier 0/1 user "can't see the new pieces,"
that's the design working, not a bug. (A future "new works free for everyone for
a week" promotion would need new logic; it isn't supported today.)

---

## 1. Stripe dashboard — create products & prices

In the Stripe dashboard (test mode first), create **two products**:

- **Collector (Tier 1)** — add two prices: one recurring **monthly**, one recurring **yearly**.
- **Patron (Tier 2)** — likewise, one **monthly** and one **yearly** price.

Copy the four **Price IDs** (they look like `price_1AbC…`).

## 2. Environment variables

Add these to `.env.local` (and to your hosting env for production). The
`.env*` files are gitignored — never commit real keys.

```bash
# Stripe — secret key (server only; NEVER prefix with NEXT_PUBLIC)
STRIPE_SECRET_KEY=sk_test_…

# Stripe — webhook signing secret (from step 4)
STRIPE_WEBHOOK_SECRET=whsec_…

# Stripe — Price IDs from step 1
STRIPE_PRICE_TIER1_MONTHLY=price_…
STRIPE_PRICE_TIER1_YEARLY=price_…
STRIPE_PRICE_TIER2_MONTHLY=price_…
STRIPE_PRICE_TIER2_YEARLY=price_…
```

> The Firebase Admin SDK is already configured (`src/lib/firebaseAdmin.ts`). On
> Firebase-hosted SSR it uses Application Default Credentials; for local dev set
> `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` (see that file).

## 3. Deploy the Firestore rules

The `users/{uid}` collection has new rules (self read/create at tier 0; `tier`
is server-only). Deploy them:

```bash
firebase deploy --only firestore:rules
```

## 4. Configure the webhook

Point a Stripe webhook at `https://<your-domain>/api/stripe/webhook` and
subscribe to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

**Local testing** with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# use the whsec_… it prints as STRIPE_WEBHOOK_SECRET
stripe trigger customer.subscription.updated
```

---

## How fulfilment works

1. **Upgrade** — `/pricing` → `POST /api/stripe/checkout` creates a subscription
   Checkout Session (uid + tier in metadata) → redirect to Stripe.
2. **Grant** — on success, Stripe redirects to
   `/account?upgrade=success&session_id=…`. The account page calls
   `POST /api/stripe/confirm`, which verifies the paid session and sets the tier
   via the Admin SDK, then refreshes the local profile.
3. **Sync** — `POST /api/stripe/webhook` keeps tier in sync afterwards:
   active subscription → its tier; canceled/unpaid → tier 0.

On downgrade the user's stored 5/15 random works are untouched, so they revert
to exactly what they originally had.

## Admin override

You can set any user's tier manually at **/admin/users**. This write is allowed
by the Firestore rules only for accounts listed in the `admins` collection
(`isAdmin()`); regular users still cannot change their own `tier`. Handy for
granting access before — or independently of — Stripe.
