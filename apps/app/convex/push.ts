import { v } from "convex/values";

import {
  action,
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrow } from "./model";

// Store / refresh a device's push subscription for the current user.
export const savePushSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { userId: user._id, p256dh, auth });
      return;
    }
    await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      endpoint,
      p256dh,
      auth,
      createdAt: Date.now(),
    });
  },
});

export const removePushSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (sub) await ctx.db.delete(sub._id);
  },
});

// Drop ALL of the current user's subscriptions — used when permission was
// revoked outside the app, so the server state stops claiming push is on.
export const clearMine = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);
  },
});

// Whether the current user has at least one subscribed device.
export const pushEnabled = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(1);
    return subs.length > 0;
  },
});

// --- internal (used by the Node sender) ---
export const subsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const deleteSub = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Schedule a "rest complete" push for `seconds` from now. Returns the scheduled
// job id (or null if the user has no subscribed device) so the client can cancel
// it if the rest is skipped or adjusted.
export const scheduleRestDone = mutation({
  args: { seconds: v.number() },
  handler: async (ctx, { seconds }): Promise<string | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (user.remindRest === false) return null; // opted out
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(1);
    if (subs.length === 0) return null; // nothing to notify
    const id = await ctx.scheduler.runAfter(
      Math.max(0, Math.round(seconds * 1000)),
      internal.pushSender.sendPush,
      {
        userId: user._id,
        title: "Rest complete 💪",
        body: "Time for your next set.",
        url: "/workout/new",
      },
    );
    return id as string;
  },
});

// Cancel a previously-scheduled push (e.g. rest skipped before it fired).
export const cancelScheduled = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    try {
      await ctx.scheduler.cancel(id as Id<"_scheduled_functions">);
    } catch {
      /* already ran or unknown id */
    }
  },
});

// Send a test push to the current user's devices and report the outcome.
// `force: true` so it shows even though the app is in the foreground.
export const sendTest = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    configured: boolean;
    subscriptions: number;
    sent: number;
    dropped: number;
  }> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("Not signed in");
    return await ctx.runAction(internal.pushSender.sendPush, {
      userId: user._id,
      title: "Liftify",
      body: "Push notifications are working 🎉",
      url: "/",
      force: true,
    });
  },
});
