import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, requireAdmin } from "./model";

const DAY = 86_400_000;
// UTC-day index — clean bucketing for time-series without timezone math.
const dayIndex = (ms: number) => Math.floor(ms / DAY);

// Client-side gate — true when the signed-in user is an admin. Never throws, so
// the /admin layout can use it to redirect non-admins without error boundaries.
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user?.role === "admin";
  },
});

// One-time bootstrap for the FIRST admin. Run from the CLI (which has admin
// rights and needs no user identity):
//   npx convex run admin:bootstrapAdmin '{"email":"you@example.com"}'
// The target must already exist — i.e. have signed in at least once.
export const bootstrapAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const target = email.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.email.toLowerCase() === target);
    if (!user) {
      throw new Error(
        `No user with email "${email}" — sign in to the app once first, then re-run.`,
      );
    }
    await ctx.db.patch(user._id, { role: "admin" });
    return { promoted: user.email };
  },
});

// Promote/demote another user — admin only (used by the admin UI).
export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { userId, role }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(userId, { role });
  },
});

// --- Insights (all admin-gated; scan tables — fine at this scale) ---

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    const workouts = await ctx.db.query("workouts").collect();
    const checkins = await ctx.db.query("checkins").collect();

    const active7 = new Set<string>();
    const active30 = new Set<string>();
    for (const w of workouts) {
      if (now - w.date < 7 * DAY) active7.add(w.userId);
      if (now - w.date < 30 * DAY) active30.add(w.userId);
    }
    for (const c of checkins) {
      if (now - c.date < 7 * DAY) active7.add(c.userId);
      if (now - c.date < 30 * DAY) active30.add(c.userId);
    }

    return {
      totalUsers: users.length,
      newToday: users.filter((u) => now - u._creationTime < DAY).length,
      new7d: users.filter((u) => now - u._creationTime < 7 * DAY).length,
      new30d: users.filter((u) => now - u._creationTime < 30 * DAY).length,
      active7d: active7.size,
      active30d: active30.size,
      totalWorkouts: workouts.length,
    };
  },
});

// Signups per day for the last `days` (default 30) — [{ day: epochMs, count }].
export const signupsSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const windowDays = days ?? 30;
    const users = await ctx.db.query("users").collect();
    const today = dayIndex(Date.now());
    const first = today - windowDays + 1;
    const counts = new Array<number>(windowDays).fill(0);
    for (const u of users) {
      const idx = dayIndex(u._creationTime) - first;
      if (idx >= 0 && idx < windowDays) counts[idx] += 1;
    }
    return counts.map((count, i) => ({ day: (first + i) * DAY, count }));
  },
});

// Onboarding funnel + push opt-in rate.
export const engagement = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const pushSubs = await ctx.db.query("pushSubscriptions").collect();
    const completed = users.filter((u) => u.onboardedAt).length;
    const skipped = users.filter(
      (u) => !u.onboardedAt && u.onboardingSkippedAt,
    ).length;
    return {
      totalUsers: users.length,
      onboarding: {
        completed,
        skipped,
        neither: users.length - completed - skipped,
      },
      pushOptIn: new Set(pushSubs.map((s) => s.userId)).size,
    };
  },
});

// --- User management ---

export const listUsers = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const workouts = await ctx.db.query("workouts").collect();
    const counts = new Map<string, number>();
    const lastActive = new Map<string, number>();
    for (const w of workouts) {
      counts.set(w.userId, (counts.get(w.userId) ?? 0) + 1);
      lastActive.set(w.userId, Math.max(lastActive.get(w.userId) ?? 0, w.date));
    }
    let rows = users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
      role: u.role ?? "user",
      createdAt: u._creationTime,
      onboardedAt: u.onboardedAt ?? null,
      workouts: counts.get(u._id) ?? 0,
      lastActive: lastActive.get(u._id) ?? null,
    }));
    const term = search?.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(term) ||
          (r.name?.toLowerCase().includes(term) ?? false),
      );
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Wipe a user's app data + row (admin only). Note: does NOT delete their Clerk
// account — they could sign in again and get a fresh row. Full account deletion
// needs a Clerk-admin API route (see app/api/delete-account).
export const deleteUserData = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) {
      throw new Error("Use the account screen to delete your own account.");
    }
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const bodyEntries = await ctx.db
      .query("bodyEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const pushSubs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const rows of [
      workouts,
      templates,
      checkins,
      bodyEntries,
      notifications,
      pushSubs,
    ]) {
      for (const row of rows) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(userId);
  },
});

// --- Broadcast ---

// Send an in-app notification to every user; optionally also push it.
export const broadcastNotification = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    alsoPush: v.optional(v.boolean()),
  },
  handler: async (ctx, { title, body, url, alsoPush }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: "broadcast",
        title,
        body,
        url,
        createdAt: now,
      });
    }
    if (alsoPush) {
      const subs = await ctx.db.query("pushSubscriptions").collect();
      for (const userId of new Set(subs.map((s) => s.userId))) {
        await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
          userId,
          title,
          body,
          url,
          force: true,
        });
      }
    }
    return { notified: users.length };
  },
});
