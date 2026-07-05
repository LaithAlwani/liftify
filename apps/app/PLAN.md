# Liftify — Free Fitness Tracker Web PWA + Marketing Site

> **Canonical copy.** A mirror is committed to the marketing repo. Keep both in sync on every
> meaningful update. Mark sections off (`- [x]`) as they are completed.

## Context

This repo started as an Expo (React Native) monorepo with a strong Convex backend + Clerk
auth but only scaffolded UI. The decision was to **abandon the mobile app** and ship a
**simple web PWA** plus a **marketing site**, under the **Liftify** brand:

- **`liftify.com`** → marketing site (a Next.js 16 / React 19 / Tailwind v4 app — lives in a
  separate repo, currently the local `corevex` folder pending rename).
- **`app.liftify.com`** → the Liftify PWA (**this** repo, re-platformed from Expo to Next.js).

The product is deliberately tiny: **"Track workouts fast and see progress over time."**
Bar for shippable = a new user logs their first workout in **under 30 seconds**, zero
onboarding.

### Monetization — free now, paid (with AI) later

The app is **100% free for now**. There is **no subscription, no paywall, no Stripe** — every
authenticated user has full access. Today's monetization is **passive only**:

- **Donate** — a Ko‑fi "support" heart in the nav (`NEXT_PUBLIC_DONATE_URL`).
- **Shop** — an Amazon Associates affiliate page (`/shop`, curated gear in `lib/shop.ts`).

**Paid tier is deferred to a later phase and will be unlocked by AI features** (see §5). When
it lands, the plan is a free core + a paid "Liftify AI" tier (e.g. AI workout suggestions,
form/notes coaching, auto‑programming). Billing (Stripe) is intentionally **not built yet** —
the schema and `convex/http.ts` are left forward‑compatible so it can slot in without a rewrite.

> ⚠️ Both repos use a **customized Next.js 16** ("NOT the Next.js you know" per `AGENTS.md`).
> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`
> (App Router docs live under `01-app/`). Tailwind is **v4** (`@theme inline` in
> `globals.css`, no `tailwind.config.*`). Fonts are Geist / Geist Mono via `next/font/google`.
> Package manager is **npm** — a single app at the repo root (no workspaces, no Turborepo).

---

## 0. Tracked plan files
- [x] Commit this plan as **`PLAN.md` in BOTH repos**, identical on every workstation.
      App repo's copy is canonical; mirror to the marketing repo.
- [ ] Rewrite the stale **`CLAUDE.md`** (still describes the old Expo/gamification/paid app) and
      keep `convex/AGENTS.md` accurate.

## 1. Shared design system (taste-skill)
- [x] Install `design-taste-frontend` in both repos.
- [x] **Design read:** athletic-minimal, zinc/ink neutrals + one **volt-lime** accent
      (`#a3e635`). Dials — marketing 7/6/4, app calmer (motion 3 / density 5).
- [x] Encode tokens in **Tailwind v4 `@theme inline`** in `app/globals.css` + a shared
      `.container-page` margin helper; identical block mirrored in both repos.
- [x] Shared primitive set in the app (Button, Card, Input, Modal, etc.) using the tokens.

---

## 2. App repo (`app.liftify.com`) — current state

### 2a. Scaffold — DONE
- [x] Single Next.js 16 app (App Router + TS + Tailwind v4) at the **repo root**; builds.
- [x] Deleted **`apps/mobile`** and the Expo toolchain (`pnpm-workspace.yaml`, `pnpm-lock.yaml`,
      `.npmrc`, `expo-crypto` override).
- [x] **Flattened the monorepo**: removed Turborepo + npm workspaces; moved `apps/web/*` to the
      root and `packages/convex/convex` → root `convex/`; deleted the unused `packages/shared`
      and `packages/tsconfig`. Root package is `liftify`; dev = `npm run dev`, backend = `npm run convex`.

### 2b. Backend — actual Convex schema (`convex/schema.ts`)
Free tracker, **7 tables** (grew past the original 3-table sketch; **no billing/subscription
fields** anywhere). Indexes noted inline.
```ts
users        { clerkId, email, firstName?, lastName?, units: "kg"|"lb",
               weeklyGoal?, restSeconds?, bodyWeight?, tzOffset?, reminderHour?,
               remindExercise?, remindWeighIn?, remindRest?,
               lastExerciseReminderDay?, lastWeighInWeek?, createdAt }      // idx: by_clerk_id
exercises    { name, muscleGroup?, equipment?,  // seeded, read-only library
               externalId?, category?, level?, force?, mechanic?,
               primaryMuscles?[], secondaryMuscles?[], instructions?[], images?[] }
                                                            // idx: by_name, by_external_id
workouts     { userId, name, date, durationSec?,
               exercises: [ { name, sets: [ { reps, weight } ] } ] }        // idx: by_user_date
checkins     { userId, date, type: "rest"|"cardio"|"stretching" }          // idx: by_user_date
bodyEntries  { userId, date, weight, notes?,
               measurements?: { waist?, chest?, arms?, hips?, thighs? } }   // idx: by_user_date
notifications{ userId, type, title, body, weekKey?, createdAt, readAt? }   // idx: by_user
pushSubscriptions { userId, endpoint, p256dh, auth, createdAt }   // idx: by_user, by_endpoint
```
- [x] **No gamification** — XP/levels/achievements/quests tables + functions all removed.
- [x] Function surface (one file per table, plus helpers):
  - `users` — `getOrCreateCurrentUser`, `me`, `accessState` (free → always allowed),
    `updateUnits`, `setTimezone`, reminder/profile prefs.
  - `workouts` — create, list, edit, getLast, etc.
  - `checkins` — log/list active-recovery days (feed the streak).
  - `bodyEntries` — create / list / edit body-weight history.
  - `exercises` + `exercisesSeed` — seeded library enriched from the **Free Exercise DB**
    (public domain): muscles, equipment, instructions, images.
  - `notifications`, `push`, `pushSender`, `crons` — in-app + Web Push reminders.
  - `model.ts` shared helpers; `auth.config.ts` Clerk JWT; `http.ts` is an **empty router**
    (placeholder for a future Stripe webhook — none today).

### 2c. Auth (Clerk) — DONE
- [x] `@clerk/nextjs` + `ConvexProviderWithClerk` (`app/providers.tsx`); `middleware.ts`
      gates `(app)`. First authed load → `users.getOrCreateCurrentUser` mints the row.
- [x] **Access = authentication only.** The app is free, so `users.accessState` just reports
      whether the user is signed in — there is no subscription gate and no `/subscribe` screen.
- [ ] Configure a Clerk **production** instance for `app.liftify.com` (see `DEPLOY.md`).

### 2d. Screens (App Router) — DONE
Nav (sidebar on desktop, bottom tabs on mobile): **Home · Log · Body · Progress · Shop**, with
**Settings** + a **Donate** heart + a **notification bell** in the chrome (`components/app-shell.tsx`).
```
app/(auth)/sign-in , sign-up
app/(app)/layout.tsx            # AppShell: nav, auth ensure-user, rest-timer + notifications
app/(app)/page.tsx              # HOME (Today): Start Workout · last workout · streak
app/(app)/workout/new/page.tsx  # LOG: per-set rows {exercise, sets:[{reps,weight}]} → Save
app/(app)/workout/[id]/page.tsx # EDIT a saved workout
app/(app)/history/page.tsx      # HISTORY: past workouts list
app/(app)/progress/page.tsx     # PROGRESS: workouts/week + strength charts
app/(app)/body/page.tsx         # BODY: weight chart · add/edit modal · measurements
app/(app)/shop/page.tsx         # SHOP: Amazon-affiliate gear (lib/shop.ts)
app/(app)/settings/page.tsx     # SETTINGS: units, reminders, account, sign out
app/api/delete-account/route.ts # account deletion
app/manifest.ts                 # PWA manifest
middleware.ts                   # clerkMiddleware
```
- [x] **Log Workout** is the heart — fast per-set entry, autofocus, prefill best weight,
      "Add set" duplicates the previous set, +/- vs all-time best.

### 2e. Billing — DEFERRED (not built; ties to the AI tier in §5)
- [ ] No Stripe today. When the paid AI tier ships: Stripe product + monthly price,
      `billing.createCheckoutSession` Convex **action**, a webhook **HTTP action** in
      `convex/http.ts` syncing `subscriptionStatus`/`currentPeriodEnd` onto a (then-added)
      set of `users` fields, and a Customer Portal link. Convex env:
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. `DEPLOY.md` already
      reserves these as future env vars.

### 2f. PWA + polish
- [x] `app/manifest.ts` + icons (192/512 + maskable) + a minimal online-first service worker
      (precache shell). Installable. (Offline writes out of scope.)
- [x] kg/lb toggle in **Settings**; logo/favicon/splash; light + dark.
- [ ] Verify "Add to Home Screen" on a real phone (Safari + Chrome).

### 2g. Features built beyond the original MVP sketch
- [x] **Streaks** — `checkins` table (rest/cardio/stretch) + `lib/streak.ts` keep a streak
      alive on non-lifting days. Surfaced on Home.
- [x] **PRs / personal bests** — `lib/prs.ts`; Log shows +/- vs all-time best and prefills it.
- [x] **Rest timer** — `components/rest-timer.tsx` provider, default length in Settings.
- [x] **Reminders** — in-app `notifications` + **Web Push** (`pushSubscriptions`, VAPID),
      weekly weigh-in + daily exercise nudges via Convex `crons`; **notification bell** in nav.
- [x] **Exercise library** — seeded & enriched from the Free Exercise DB (muscles, equipment,
      instructions, images).
- [x] Editable workouts & body-weight history; in-progress workout persists across nav;
      Finish-confirm dialog; account deletion.
- [x] **Donate** (Ko-fi) + **Shop** (Amazon Associates) as the current passive monetization.

---

## 3. Marketing site (`liftify.com`) — separate repo
- [ ] Landing page (shared tokens + design-taste-frontend): hero one-promise headline ·
      3 feature blurbs (fast logging · progress charts · body journal) · **"free"** CTA →
      `app.liftify.com/sign-up`. (Pricing card deferred until the paid AI tier exists.)
- [ ] Footer + Privacy / Terms stubs.

---

## 4. Deploy / infra (see `DEPLOY.md` for the full runbook)
- [ ] Two Vercel projects: `liftify.com`/`www` → marketing; `app.liftify.com` → app
      (root dir = repo root).
- [ ] Convex **production** deployment (`npx convex deploy`) → app's `NEXT_PUBLIC_CONVEX_URL`.
- [ ] Clerk **production** instance + "Convex" JWT template → `CLERK_JWT_ISSUER_DOMAIN` on
      Convex prod.
- [ ] App env: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
      `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DONATE_URL`. VAPID keys for Web
      Push on Convex.
- [ ] DNS for apex + `app` subdomain.
- [ ] Rename the marketing repo + local folder from `corevex` → `liftify` (GitHub + disk).

---

## 5. Future — paid "Liftify AI" tier
The deferred paywall returns as an **AI upsell**, not a gate on the core tracker. Likely scope:
- AI workout suggestions / next-session auto-programming from a user's history & PRs.
- Natural-language workout logging and form/notes coaching.
- Trends & insights summaries over `workouts` / `bodyEntries`.
- **Then** wire Stripe per §2e (free core stays free; AI features are the paid unlock).

---

## Deferred (post-MVP / not now)
Stripe billing (until §5), workout plans/templates, cardio as a first-class log, the old
gamification (XP/levels/achievements/quests), HealthKit/Google Fit, offline writes, additional
marketing pages.

---

## Verification
- **Backend:** `npm run convex:dev`; confirm the 7 tables; run `workouts.create` /
  `bodyEntries.create` / `checkins` / `users.getOrCreateCurrentUser`.
- **App e2e:** `npm run web`; sign in (Clerk) → land straight in the app (no paywall) →
  log a workout in < 30s → see it on Home + History → add a body entry → check streak.
- **PWA:** Lighthouse PWA pass; install to home screen and launch standalone; Web Push nudge.
- **Design parity:** `globals.css` token block identical in both repos.
