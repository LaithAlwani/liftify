# CLAUDE.md — Liftify monorepo (root)

> This is the **monorepo root**. It holds two independent Next.js apps under `apps/`, wired together with **plain npm workspaces** (no Turborepo). Each app has its own detailed `CLAUDE.md` — read the one for the app you're working in.

## Layout

```
liftify/                     repo root (GitHub: fitness-tracker)
├── package.json             npm workspaces ["apps/*"] + delegating scripts
├── package-lock.json        single hoisted lockfile for BOTH apps
├── apps/
│   ├── app/                 the PWA  → app.liftify.com   (Next.js + Convex + Clerk + Web Push)
│   │   └── CLAUDE.md        ← detailed rules for the app live here
│   └── marketing/           the marketing site → liftify.com  (Next.js, backend-less, motion)
│       └── CLAUDE.md / AGENTS.md
└── .claude/ .agents/        shared tooling (span the whole monorepo)
```

- **`apps/app`** — the workout-tracker PWA. Convex backend (`apps/app/convex/`), Clerk auth (`apps/app/proxy.ts`), service worker. This is where almost all product work happens.
- **`apps/marketing`** — the public landing/legal site. No backend; its CTAs hand off to the app's Clerk sign-up via `apps/marketing/lib/site.ts`.

## Working here

- **One install for everything:** run `npm install` **at the repo root**. It hoists a single `node_modules/` and writes one root `package-lock.json`. Don't add per-app lockfiles.
- Each app keeps its **own `tsconfig.json`**, so the `@/*` → app-root alias resolves relative to that app — imports are unchanged from when the apps were separate repos.
- The two apps' `app/globals.css` design-token blocks are **intentionally separate** (they have diverged). Don't try to unify them here — a shared `packages/` is a future step.

## Root commands

| Action | Command |
|---|---|
| Dev — app (port 3001) | `npm run dev:app` |
| Dev — marketing (port 3000) | `npm run dev:marketing` |
| Convex (codegen + watch) | `npm run convex` (runs in `apps/app`) |
| Build app / marketing | `npm run build:app` / `npm run build:marketing` |
| Typecheck (app) | `npm run typecheck` |
| Lint both | `npm run lint` |
| Deploy Convex prod | `npm run convex:deploy` |

To run a script in a single workspace directly: `npm run <script> -w apps/app` (or `-w apps/marketing`).

## Deployment

**Two Vercel projects, one repo** — they differ only by **Root Directory** (`apps/app` vs `apps/marketing`); Vercel auto-detects the npm workspace and installs from the repo root. Full runbook: `apps/app/DEPLOY.md`.
