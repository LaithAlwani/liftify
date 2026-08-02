import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./model";

// Called on first authenticated load. Creates the user row if missing and keeps
// the profile in sync with Clerk. The app is free, so a new user has full access
// the moment their row exists.
export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      const patch: Partial<
        Pick<typeof existing, "firstName" | "lastName" | "email">
      > = {};
      if (identity.givenName && existing.firstName !== identity.givenName) {
        patch.firstName = identity.givenName;
      }
      if (identity.familyName && existing.lastName !== identity.familyName) {
        patch.lastName = identity.familyName;
      }
      if (identity.email && existing.email !== identity.email) {
        patch.email = identity.email;
      }
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      firstName: identity.givenName ?? undefined,
      lastName: identity.familyName ?? undefined,
      units: "lb", // default; toggle to kg in settings later
      createdAt: now,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

// Liftify is free — everyone authenticated has access.
export const accessState = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return {
      authenticated: !!user,
      hasAccess: true,
    };
  },
});

const LB_PER_KG = 2.2046226218;
const round1 = (n: number) => Math.round(n * 10) / 10;

// Switch weight units AND convert every stored weight (workouts, body entries,
// bodyweight default) so all numbers across the app read correctly afterward.
export const setUnits = mutation({
  args: { units: v.union(v.literal("kg"), v.literal("lb")) },
  handler: async (ctx, { units }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User row missing");
    if (user.units === units) return; // no change

    // Only two units, so the direction is implied by the target.
    const factor = units === "kg" ? 1 / LB_PER_KG : LB_PER_KG;
    const conv = (w: number) => (w > 0 ? round1(w * factor) : w);

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const w of workouts) {
      await ctx.db.patch(w._id, {
        exercises: w.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({ ...s, weight: conv(s.weight) })),
        })),
      });
    }

    const entries = await ctx.db
      .query("bodyEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const e of entries) {
      await ctx.db.patch(e._id, { weight: conv(e.weight) });
    }

    await ctx.db.patch(user._id, {
      units,
      ...(user.bodyWeight ? { bodyWeight: conv(user.bodyWeight) } : {}),
    });
  },
});

// Record the device's time zone so reminders fire in the user's local time.
// We store the IANA zone (DST-correct) and keep the raw offset as a fallback for
// when a zone string is unavailable.
export const setTimezone = mutation({
  args: {
    timeZone: v.optional(v.string()),
    tzOffset: v.optional(v.number()),
  },
  handler: async (ctx, { timeZone, tzOffset }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const patch: { timeZone?: string; tzOffset?: number } = {};
    if (timeZone !== undefined && user.timeZone !== timeZone) {
      patch.timeZone = timeZone;
    }
    if (tzOffset !== undefined && user.tzOffset !== tzOffset) {
      patch.tzOffset = tzOffset;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(user._id, patch);
  },
});

// Update training preferences (weekly goal, rest length, bodyweight default).
export const setPreferences = mutation({
  args: {
    weeklyGoal: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    bodyWeight: v.optional(v.number()),
    reminderHour: v.optional(v.number()),
    remindExercise: v.optional(v.boolean()),
    remindWeighIn: v.optional(v.boolean()),
    remindRest: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      weeklyGoal,
      restSeconds,
      bodyWeight,
      reminderHour,
      remindExercise,
      remindWeighIn,
      remindRest,
    },
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User row missing");
    const patch: {
      weeklyGoal?: number;
      restSeconds?: number;
      bodyWeight?: number;
      reminderHour?: number;
      remindExercise?: boolean;
      remindWeighIn?: boolean;
      remindRest?: boolean;
    } = {};
    if (weeklyGoal !== undefined) {
      patch.weeklyGoal = Math.min(14, Math.max(1, Math.round(weeklyGoal)));
    }
    if (reminderHour !== undefined) {
      patch.reminderHour = Math.min(23, Math.max(0, Math.round(reminderHour)));
    }
    if (restSeconds !== undefined) {
      patch.restSeconds = Math.min(600, Math.max(15, Math.round(restSeconds)));
    }
    if (bodyWeight !== undefined) {
      patch.bodyWeight = Math.max(0, round1(bodyWeight));
    }
    if (remindExercise !== undefined) patch.remindExercise = remindExercise;
    if (remindWeighIn !== undefined) patch.remindWeighIn = remindWeighIn;
    if (remindRest !== undefined) patch.remindRest = remindRest;
    await ctx.db.patch(user._id, patch);
  },
});

// Save the user's personal weight room (which equipment they have). Stored as
// user-facing keys like "barbell" / "dumbbell"; bodyweight is always available.
// Set during onboarding and editable later in settings.
export const setEquipment = mutation({
  args: { equipment: v.array(v.string()) },
  handler: async (ctx, { equipment }) => {
    const user = await getCurrentUserOrThrow(ctx);
    // De-duplicate and drop blanks so the stored list stays clean.
    const cleaned = [...new Set(equipment.map((key) => key.trim()).filter(Boolean))];
    await ctx.db.patch(user._id, { equipment: cleaned });
  },
});

// Marks the welcome flow as fully COMPLETED, so it never shows again for this
// account — even if they later have zero workouts logged. Completing also clears
// any earlier "skipped" flag so the home-screen reminder disappears.
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.onboardedAt) return; // already done
    // Set the completion flag on its own so the write can never fail.
    await ctx.db.patch(user._id, { onboardedAt: Date.now() });
    // Only clear the "skipped" flag when it's actually set — patching an unset
    // optional field to undefined can be rejected and abort the whole write.
    if (user.onboardingSkippedAt !== undefined) {
      await ctx.db.patch(user._id, { onboardingSkippedAt: undefined });
    }
  },
});

// The user tapped "Skip for now". Records that they skipped (as opposed to
// finished) so the full wizard doesn't force itself on every visit — instead the
// home screen shows a gentle "finish setup" reminder they can resume any time.
export const skipOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.onboardedAt) return; // already finished — nothing to skip
    await ctx.db.patch(user._id, { onboardingSkippedAt: Date.now() });
  },
});

// Wipes all of the current user's data + their user row. The Clerk account is
// deleted separately by the /api/delete-account route handler.
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const w of workouts) await ctx.db.delete(w._id);

    const entries = await ctx.db
      .query("bodyEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);

    const notes = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of notes) await ctx.db.delete(n._id);

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const template of templates) await ctx.db.delete(template._id);

    await ctx.db.delete(user._id);
  },
});
