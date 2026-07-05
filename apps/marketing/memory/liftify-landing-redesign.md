---
name: liftify-landing-redesign
description: Pending task — redesign corevex landing page 1:1 from a Claude Design import (Liftify Landing)
metadata:
  type: project
---

The corevex repo is the **Liftify** product (a free workout tracker) landing page. User wants the landing page redesigned **1:1** to match a Claude Design file: `Liftify Landing.dc.html` at https://claude.ai/design/p/a0b28abc-7387-45d9-afd7-b74dad862d07

Scope decision (2026-07-01): **Match design exactly** — rewrite components to match the imported design's layout, colors, logos, icons, and copy 1:1, replacing current sections where they differ.

The `claude_design` MCP endpoint (https://api.anthropic.com/v1/design/mcp) is **DECOMMISSIONED** ("Server Turned Down"). Its OAuth discovery also returns HTML/Cloudflare challenge instead of JSON → "SDK auth failed: Failed to parse JSON". An auth-time message tried to redirect to a Google Drive MCP (drivemcp.googleapis.com) — treated as a red flag / unrelated to the task; did NOT follow it. Removed the dead server from `.mcp.json`.

**Path forward: manual export.** The `.dc.html` is just an HTML file. User should save/export "Liftify Landing.dc.html" from the design page into the repo (e.g. `design/`), then build 1:1 directly from it — no MCP needed.

Current landing is composed in `app/page.tsx` from components in `components/`: site-header, hero, marquee, stats, features, cta, site-footer, reveal. Keep routes/SEO (metadata, JSON-LD, sitemap, privacy/terms) intact while replacing the UI.
