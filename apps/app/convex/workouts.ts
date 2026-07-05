import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getCurrentUserOrThrow,
  getOrCreateUser,
  requireAccess,
} from "./model";

const setEntry = v.object({
  reps: v.number(),
  weight: v.number(),
});

const exerciseEntry = v.object({
  name: v.string(),
  sets: v.array(setEntry),
});

type ExerciseInput = { name: string; sets: { reps: number; weight: number }[] };

function cleanExercises(exercises: ExerciseInput[]) {
  return exercises
    .map((e) => ({
      name: e.name.trim(),
      sets: e.sets
        .map((s) => ({
          reps: Math.max(0, Math.round(s.reps)),
          weight: Math.max(0, s.weight),
        }))
        // keep a set if it records reps or weight (weight 0 = bodyweight)
        .filter((s) => s.reps > 0 || s.weight > 0),
    }))
    .filter((e) => e.name.length > 0 && e.sets.length > 0);
}

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    date: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    exercises: v.array(exerciseEntry),
  },
  handler: async (ctx, { name, date, durationSec, exercises }) => {
    const user = await getOrCreateUser(ctx);
    requireAccess(user, Date.now());

    const cleaned = cleanExercises(exercises);
    if (cleaned.length === 0) {
      throw new Error("Add at least one exercise with a set");
    }

    return await ctx.db.insert("workouts", {
      userId: user._id,
      name: name?.trim() || "Workout",
      date: date ?? Date.now(),
      durationSec:
        durationSec !== undefined && durationSec > 0
          ? Math.round(durationSec)
          : undefined,
      exercises: cleaned,
    });
  },
});

export const getById = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, { workoutId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const workout = await ctx.db.get(workoutId);
    if (!workout || workout.userId !== user._id) return null;
    return workout;
  },
});

export const update = mutation({
  args: {
    workoutId: v.id("workouts"),
    name: v.optional(v.string()),
    exercises: v.array(exerciseEntry),
  },
  handler: async (ctx, { workoutId, name, exercises }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const workout = await ctx.db.get(workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found");
    }

    const cleaned = cleanExercises(exercises);
    if (cleaned.length === 0) {
      throw new Error("Add at least one exercise with a set");
    }

    await ctx.db.patch(workoutId, {
      name: name?.trim() || workout.name,
      exercises: cleaned,
    });
  },
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit ?? 100);
  },
});

export const getLast = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const remove = mutation({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, { workoutId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const workout = await ctx.db.get(workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found");
    }
    await ctx.db.delete(workoutId);
  },
});
