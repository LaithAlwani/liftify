import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./model";

// Singleton app config (currently the site-wide announcement banner). Public
// read so the consumer app-shell can show the banner; admin-only write.
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("config").first();
  },
});

export const setBanner = mutation({
  args: { bannerText: v.optional(v.string()), bannerActive: v.boolean() },
  handler: async (ctx, { bannerText, bannerActive }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("config").first();
    const patch = { bannerText, bannerActive, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("config", patch);
    }
  },
});
