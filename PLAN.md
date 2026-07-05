# PLAN.md — Liftify monorepo (root)

This repo is a **plain npm-workspaces monorepo** holding both Liftify products:

- **`apps/app`** — the PWA at `app.liftify.com`. Full plan: [`apps/app/PLAN.md`](apps/app/PLAN.md).
- **`apps/marketing`** — the marketing site at `liftify.com`. Its plan: [`apps/marketing/PLAN.md`](apps/marketing/PLAN.md).

There is **no Turborepo and no shared package** — each app is self-contained, and a single root `npm install` serves both. See [`CLAUDE.md`](CLAUDE.md) for the rules and commands.

## Future (not built yet)

- A shared `packages/ui` / `packages/tokens` workspace to end the divergence between the two apps' `globals.css` design tokens. Deferred — the initial merge keeps the two token blocks separate.
- Optional: rename the GitHub repo `fitness-tracker` → `liftify` to match the folder.
