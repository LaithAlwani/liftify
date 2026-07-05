import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUser, getOrCreateUser, requireAccess } from "./model";

const checkinType = v.union(
  v.literal("rest"),
  v.literal("cardio"),
  v.literal("stretching"),
);

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Log an active-recovery day. One check-in per day — re-logging swaps the type.
export const create = mutation({
  args: { type: checkinType },
  handler: async (ctx, { type }) => {
    const user = await getOrCreateUser(ctx);
    requireAccess(user, Date.now());
    const today = startOfDay(Date.now());
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", today),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { type });
      return existing._id;
    }
    return await ctx.db.insert("checkins", {
      userId: user._id,
      date: Date.now(),
      type,
    });
  },
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit ?? 120);
  },
});
