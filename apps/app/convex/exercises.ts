import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

// Read-only exercise library — powers the Log screen picker. Returns a slim
// projection (no instructions) plus a single thumbnail to keep the payload light.
export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    const all = await ctx.db.query("exercises").withIndex("by_name").collect();
    const slim = all
      .map((e) => ({
        _id: e._id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        mechanic: e.mechanic,
        image: e.images?.[0],
        hasDetail: (e.images?.length ?? 0) > 0 || (e.instructions?.length ?? 0) > 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const term = search?.trim().toLowerCase();
    if (!term) return slim;
    return slim.filter((e) => e.name.toLowerCase().includes(term));
  },
});

// Full exercise record — for the detail / how-to view (images + instructions).
export const getById = query({
  args: { id: v.id("exercises") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

const SEED: Array<{ name: string; muscleGroup?: string; equipment?: string }> = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Barbell Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Dumbbell Bench Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Incline Dumbbell Bench Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Dumbbell Fly", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Cable Crossover", muscleGroup: "chest", equipment: "cable" },
  { name: "Push Up", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Dips", muscleGroup: "chest", equipment: "bodyweight" },
  // Back
  { name: "Deadlift", muscleGroup: "back", equipment: "barbell" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Dumbbell Row", muscleGroup: "back", equipment: "dumbbell" },
  { name: "Pull Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Chin Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "cable" },
  { name: "Seated Cable Row", muscleGroup: "back", equipment: "cable" },
  { name: "T-Bar Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Face Pull", muscleGroup: "back", equipment: "cable" },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Seated Dumbbell Press", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Arnold Press", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Front Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Reverse Fly", muscleGroup: "shoulders", equipment: "dumbbell" },
  // Biceps
  { name: "Barbell Curl", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Hammer Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Preacher Curl", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Cable Curl", muscleGroup: "biceps", equipment: "cable" },
  // Triceps
  { name: "Close-Grip Bench Press", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Tricep Pushdown", muscleGroup: "triceps", equipment: "cable" },
  { name: "Skull Crusher", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Overhead Tricep Extension", muscleGroup: "triceps", equipment: "dumbbell" },
  // Quads
  { name: "Back Squat", muscleGroup: "quads", equipment: "barbell" },
  { name: "Front Squat", muscleGroup: "quads", equipment: "barbell" },
  { name: "Leg Press", muscleGroup: "quads", equipment: "machine" },
  { name: "Leg Extension", muscleGroup: "quads", equipment: "machine" },
  { name: "Bulgarian Split Squat", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Lunge", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Goblet Squat", muscleGroup: "quads", equipment: "dumbbell" },
  // Hamstrings / Glutes
  { name: "Romanian Deadlift", muscleGroup: "hamstrings", equipment: "barbell" },
  { name: "Lying Leg Curl", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Seated Leg Curl", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Glute Bridge", muscleGroup: "glutes", equipment: "bodyweight" },
  // Calves / Abs / Traps
  { name: "Standing Calf Raise", muscleGroup: "calves", equipment: "machine" },
  { name: "Seated Calf Raise", muscleGroup: "calves", equipment: "machine" },
  { name: "Plank", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Cable Crunch", muscleGroup: "abs", equipment: "cable" },
  { name: "Barbell Shrug", muscleGroup: "traps", equipment: "barbell" },
];

// Idempotent seed. Run via: npx convex run exercises:seed
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exercises").collect();
    const names = new Set(existing.map((e) => e.name));
    let inserted = 0;
    for (const ex of SEED) {
      if (names.has(ex.name)) continue;
      await ctx.db.insert("exercises", ex);
      inserted += 1;
    }
    return { inserted, total: names.size + inserted };
  },
});

// --- Free Exercise DB seeding (driven by exercisesSeed.ts node action) ---

const exerciseFields = {
  name: v.string(),
  externalId: v.optional(v.string()),
  muscleGroup: v.optional(v.string()),
  equipment: v.optional(v.string()),
  category: v.optional(v.string()),
  level: v.optional(v.string()),
  force: v.optional(v.string()),
  mechanic: v.optional(v.string()),
  primaryMuscles: v.optional(v.array(v.string())),
  secondaryMuscles: v.optional(v.array(v.string())),
  instructions: v.optional(v.array(v.string())),
  images: v.optional(v.array(v.string())),
};

// Wipe the whole library (history is unaffected — workouts embed exercise names).
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("exercises").collect();
    for (const e of all) await ctx.db.delete(e._id);
    return { deleted: all.length };
  },
});

export const insertBatch = internalMutation({
  args: { items: v.array(v.object(exerciseFields)) },
  handler: async (ctx, { items }) => {
    for (const it of items) await ctx.db.insert("exercises", it);
    return items.length;
  },
});
