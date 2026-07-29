import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getCurrentUserOrThrow,
  getOrCreateUser,
  requireAccess,
} from "./model";

// Most a single user can keep. Kept small on purpose — templates are quick-start
// "days" (push / pull / legs …), not a full program builder.
const MAX_TEMPLATES = 5;

const setEntry = v.object({
  reps: v.number(),
  weight: v.number(),
});

const exerciseKind = v.union(v.literal("bodyweight"), v.literal("dumbbell"));

const exerciseEntry = v.object({
  name: v.string(),
  kind: v.optional(exerciseKind),
  sets: v.array(setEntry),
});

type ExerciseInput = {
  name: string;
  kind?: "bodyweight" | "dumbbell";
  sets: { reps: number; weight: number }[];
};

// Same shape/rules as workouts: trim names, clamp numbers, drop empty sets and
// empty exercises. A template set keeps target reps even when weight is 0
// (weight is often filled in live during the workout).
function cleanExercises(exercises: ExerciseInput[]) {
  return exercises
    .map((exercise) => ({
      name: exercise.name.trim(),
      // Carry the weight-reading mode through (standard exercises store none).
      ...(exercise.kind ? { kind: exercise.kind } : {}),
      sets: exercise.sets
        .map((set) => ({
          reps: Math.max(0, Math.round(set.reps)),
          weight: Math.max(0, set.weight),
        }))
        // keep a set if it records reps or weight (weight 0 = bodyweight target)
        .filter((set) => set.reps > 0 || set.weight > 0),
    }))
    .filter((exercise) => exercise.name.length > 0 && exercise.sets.length > 0);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    // Newest first (createdAt desc) so a freshly made template shows up on top.
    return templates.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getById = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx, { templateId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const template = await ctx.db.get(templateId);
    if (!template || template.userId !== user._id) return null;
    return template;
  },
});

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    exercises: v.array(exerciseEntry),
  },
  handler: async (ctx, { name, exercises }) => {
    const user = await getOrCreateUser(ctx);
    requireAccess(user, Date.now());

    // Enforce the per-user cap before inserting.
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (existing.length >= MAX_TEMPLATES) {
      throw new Error(`You can only have ${MAX_TEMPLATES} templates.`);
    }

    const cleaned = cleanExercises(exercises);
    if (cleaned.length === 0) {
      throw new Error("Add at least one exercise with a set");
    }

    return await ctx.db.insert("templates", {
      userId: user._id,
      name: name?.trim() || "Template",
      exercises: cleaned,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    exercises: v.array(exerciseEntry),
  },
  handler: async (ctx, { templateId, name, exercises }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const template = await ctx.db.get(templateId);
    if (!template || template.userId !== user._id) {
      throw new Error("Template not found");
    }

    const cleaned = cleanExercises(exercises);
    if (cleaned.length === 0) {
      throw new Error("Add at least one exercise with a set");
    }

    await ctx.db.patch(templateId, {
      name: name?.trim() || template.name,
      exercises: cleaned,
    });
  },
});

export const remove = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, { templateId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const template = await ctx.db.get(templateId);
    if (!template || template.userId !== user._id) {
      throw new Error("Template not found");
    }
    await ctx.db.delete(templateId);
  },
});
