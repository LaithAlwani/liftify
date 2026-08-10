import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireAdmin } from "./model";

const DAY = 86_400_000;

// --- Public (drives the Shop page) ---

// Active links, ordered — the Shop page reads this. Public: no auth needed.
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db
      .query("affiliateLinks")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return links.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Record an outbound click and return the raw destination fields. The /api/go
// route builds the final Amazon URL (appends the associate tag) and redirects,
// so the tag stays in the Next runtime env — no Convex env needed.
export const resolveForRedirect = mutation({
  args: { linkId: v.id("affiliateLinks") },
  handler: async (ctx, { linkId }) => {
    const link = await ctx.db.get(linkId);
    if (!link) return null;
    const user = await getCurrentUser(ctx);
    await ctx.db.insert("clickEvents", {
      linkId,
      at: Date.now(),
      userId: user?._id,
    });
    await ctx.db.patch(linkId, { clickCount: link.clickCount + 1 });
    return { asin: link.asin ?? null, url: link.url ?? null };
  },
});

// --- Admin ---

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const links = await ctx.db.query("affiliateLinks").collect();
    return links.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    blurb: v.optional(v.string()),
    price: v.optional(v.string()),
    image: v.optional(v.string()),
    asin: v.optional(v.string()),
    url: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("affiliateLinks").collect();
    const maxOrder = existing.reduce((m, l) => Math.max(m, l.sortOrder), 0);
    return await ctx.db.insert("affiliateLinks", {
      title: args.title,
      category: args.category,
      blurb: args.blurb,
      price: args.price,
      image: args.image,
      asin: args.asin,
      url: args.url,
      active: args.active ?? false,
      sortOrder: maxOrder + 1,
      clickCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("affiliateLinks"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    blurb: v.optional(v.string()),
    price: v.optional(v.string()),
    image: v.optional(v.string()),
    asin: v.optional(v.string()),
    url: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    // Only patch provided keys so an omitted optional field isn't wiped.
    const updates: Partial<Doc<"affiliateLinks">> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.blurb !== undefined) updates.blurb = fields.blurb;
    if (fields.price !== undefined) updates.price = fields.price;
    if (fields.image !== undefined) updates.image = fields.image;
    if (fields.asin !== undefined) updates.asin = fields.asin;
    if (fields.url !== undefined) updates.url = fields.url;
    if (fields.sortOrder !== undefined) updates.sortOrder = fields.sortOrder;
    await ctx.db.patch(id, updates);
  },
});

// The "deploy" toggle — flips a link on/off on the Shop page instantly.
export const setActive = mutation({
  args: { id: v.id("affiliateLinks"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { active });
  },
});

export const remove = mutation({
  args: { id: v.id("affiliateLinks") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// Per-day click counts across a window (default 30d), for the performance chart.
export const clicksSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const windowDays = days ?? 30;
    const since = Date.now() - windowDays * DAY;
    const events = await ctx.db.query("clickEvents").collect();
    const recent = events.filter((e) => e.at >= since);
    const first = Math.floor(since / DAY);
    const counts = new Array<number>(windowDays + 1).fill(0);
    for (const e of recent) {
      const idx = Math.floor(e.at / DAY) - first;
      if (idx >= 0 && idx < counts.length) counts[idx] += 1;
    }
    return counts.map((count, i) => ({ day: (first + i) * DAY, count }));
  },
});

// One-off: seed the table from the old static SHOP_PRODUCTS array (run once via
// `npx convex run affiliate:importFromStatic '{ "items": [...] }'`), then retire
// lib/shop.ts. New links come in inactive so nothing goes live unintentionally.
export const importFromStatic = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        category: v.string(),
        blurb: v.optional(v.string()),
        price: v.optional(v.string()),
        image: v.optional(v.string()),
        asin: v.optional(v.string()),
        url: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    let order = 0;
    for (const item of items) {
      await ctx.db.insert("affiliateLinks", {
        ...item,
        active: false,
        sortOrder: order++,
        clickCount: 0,
        createdAt: Date.now(),
      });
    }
    return { inserted: items.length };
  },
});
