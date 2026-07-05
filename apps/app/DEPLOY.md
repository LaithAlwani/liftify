# Deploying Liftify

Two Vercel projects (app + marketing) and one Convex **production** deployment.

```
liftify.com       -> marketing Vercel project (the corevex repo)
app.liftify.com   -> app Vercel project (this repo, root dir = repo root)
Convex (prod)     -> backend for the app (separate from your dev deployment)
```

## 1. Convex production backend

From the repo root:

```bash
npx convex deploy            # creates/updates the PROD deployment, prints its URL
```

Copy the printed prod URL (`https://<name>.convex.cloud`) — it becomes the app's
`NEXT_PUBLIC_CONVEX_URL`.

Set prod env vars (these are **separate** from your dev deployment's vars):

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://<prod-clerk-issuer>
# later, when Stripe is wired:
npx convex env set --prod STRIPE_SECRET_KEY     sk_live_...
npx convex env set --prod STRIPE_WEBHOOK_SECRET whsec_...
npx convex env set --prod STRIPE_PRICE_ID       price_...
```

Re-run `npx convex deploy` whenever you change schema or functions.

## 2. Clerk production instance

Dev keys (`pk_test_…`) only work on localhost. For `app.liftify.com`:

1. In Clerk, create a **Production** instance and add the domain `app.liftify.com`.
2. Recreate the **"Convex" JWT template**; copy its **Issuer** → that's the
   `CLERK_JWT_ISSUER_DOMAIN` you set on Convex prod (step 1).
3. Grab the prod **`pk_live_…`** and **`sk_live_…`** keys for the app project (step 3).

## 3. App on Vercel  →  app.liftify.com

- Import the `fitness-tracker` repo.
- **Root Directory:** repo root (the app now lives at the root, not in `apps/web`).
- Framework preset: **Next.js** (auto). Install/Build commands: defaults.
- **Environment Variables (Production):**

  | Name | Value |
  |---|---|
  | `NEXT_PUBLIC_CONVEX_URL` | prod Convex URL from step 1 |
  | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
  | `CLERK_SECRET_KEY` | `sk_live_…` |
  | `NEXT_PUBLIC_APP_URL` | `https://app.liftify.com` |

- **Domains:** add `app.liftify.com`.

## 4. Marketing on Vercel  →  liftify.com

- Import the marketing repo (`corevex`). Root Directory: repo root.
- **Environment Variables:** `NEXT_PUBLIC_APP_URL = https://app.liftify.com`
  (no Clerk / Convex / Stripe here).
- **Domains:** `liftify.com` + `www.liftify.com`.

## 5. DNS

- `app.liftify.com` → app Vercel project
- `liftify.com` / `www` → marketing Vercel project

## Notes

- Stripe env vars live **only on the Convex prod deployment** (step 1), never on Vercel —
  checkout + webhook run inside Convex.
- The committed `convex/_generated` lets the app build on Vercel without a
  Convex codegen step; `npx convex deploy` keeps the prod functions in sync.
- Optional automation: set a Vercel env `CONVEX_DEPLOY_KEY` (Convex dashboard → prod deploy
  key) and override the app build command to `npx convex deploy --cmd 'npm run build'` so
  each Vercel deploy also pushes Convex and injects `NEXT_PUBLIC_CONVEX_URL` automatically.
