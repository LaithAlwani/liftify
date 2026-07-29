import { v } from "convex/values";

import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUserOrThrow, requireAccess } from "./model";

// Generates ready-to-use quick-start "day" templates from the exercise library,
// picking recognizable lifts that fit the user's personal weight room.
//
// The library is the public-domain Free Exercise DB, so exercise names are
// messy (e.g. "Barbell Bench Press - Medium Grip"). We match each slot by a
// keyword ("bench press") against whatever is actually seeded, which keeps the
// picks real (with images) regardless of the exact catalogue.

// Same cap enforced by templates.create — keep them in sync.
const MAX_TEMPLATES = 5;

// Bodyweight moves are always available (you always have your body). Its
// library `equipment` value in the Free Exercise DB is "body only".
const BODYWEIGHT_EQUIPMENT = "body only";

// User-facing equipment key → the underlying library `equipment` values it
// unlocks. Keyed to match lib/presets.ts EQUIPMENT_OPTIONS.
const EQUIPMENT_VALUES: Record<string, string[]> = {
  barbell: ["barbell", "e-z curl bar"],
  dumbbell: ["dumbbell"],
  cable: ["cable"],
  machine: ["machine", "leverage machine"],
  kettlebell: ["kettlebell"],
  bands: ["bands"],
};

// A single exercise "slot" in a day: which muscle group to fill, the keywords
// (best first) that name the ideal lift, and the target sets × reps.
type Slot = {
  group: string; // matches exercises.muscleGroup
  keywords: string[]; // recognizable-lift substrings, highest priority first
  sets: number;
  reps: number;
};
type Day = { name: string; slots: Slot[] };

// Common slot shorthands, reused across splits so they stay consistent.
const BENCH: Slot = { group: "chest", keywords: ["bench press", "chest press"], sets: 4, reps: 8 };
const INCLINE: Slot = { group: "chest", keywords: ["incline"], sets: 3, reps: 10 };
const CHEST_ISO: Slot = { group: "chest", keywords: ["fly", "flye", "crossover", "dips", "push"], sets: 3, reps: 12 };
const OHP: Slot = { group: "shoulders", keywords: ["overhead press", "shoulder press", "military press", "arnold"], sets: 4, reps: 8 };
const LATERAL: Slot = { group: "shoulders", keywords: ["lateral raise", "side lateral"], sets: 3, reps: 15 };
const REAR_DELT: Slot = { group: "shoulders", keywords: ["reverse fly", "rear delt", "face pull"], sets: 3, reps: 15 };
const TRICEPS: Slot = { group: "arms", keywords: ["pushdown", "triceps", "tricep", "skull", "extension"], sets: 3, reps: 12 };
const ROW: Slot = { group: "back", keywords: ["row"], sets: 4, reps: 10 };
const VERTICAL_PULL: Slot = { group: "back", keywords: ["pulldown", "pullup", "pull-up", "chin"], sets: 3, reps: 10 };
const BACK_SECONDARY: Slot = { group: "back", keywords: ["seated cable row", "shrug", "deadlift"], sets: 3, reps: 12 };
const BICEPS: Slot = { group: "arms", keywords: ["curl"], sets: 3, reps: 12 };
const HAMMER: Slot = { group: "arms", keywords: ["hammer", "curl"], sets: 3, reps: 12 };
const SQUAT: Slot = { group: "quads", keywords: ["squat"], sets: 4, reps: 8 };
const QUAD_SECONDARY: Slot = { group: "quads", keywords: ["leg press", "lunge", "leg extension"], sets: 3, reps: 12 };
const HAMSTRINGS: Slot = { group: "hamstrings", keywords: ["romanian deadlift", "leg curl", "good morning"], sets: 3, reps: 10 };
const GLUTES: Slot = { group: "glutes", keywords: ["hip thrust", "glute bridge", "glute"], sets: 3, reps: 12 };
const CALVES: Slot = { group: "calves", keywords: ["calf raise", "calf"], sets: 4, reps: 15 };
const CORE: Slot = { group: "core", keywords: ["plank", "crunch", "leg raise", "hanging"], sets: 3, reps: 15 };

// The training splits, keyed to match lib/presets.ts SPLIT_OPTIONS. No split
// exceeds 5 days (the template cap).
const SPLITS: Record<string, Day[]> = {
  ppl: [
    { name: "Push Day", slots: [BENCH, INCLINE, OHP, LATERAL, TRICEPS] },
    { name: "Pull Day", slots: [ROW, VERTICAL_PULL, BACK_SECONDARY, REAR_DELT, BICEPS] },
    { name: "Leg Day", slots: [SQUAT, QUAD_SECONDARY, HAMSTRINGS, GLUTES, CALVES] },
  ],
  "upper-lower": [
    { name: "Upper Day", slots: [BENCH, ROW, OHP, VERTICAL_PULL, BICEPS, TRICEPS] },
    { name: "Lower Day", slots: [SQUAT, HAMSTRINGS, QUAD_SECONDARY, GLUTES, CALVES] },
  ],
  "full-body": [
    { name: "Full Body A", slots: [SQUAT, BENCH, ROW, LATERAL, CORE] },
    { name: "Full Body B", slots: [HAMSTRINGS, OHP, VERTICAL_PULL, BICEPS, CALVES] },
    { name: "Full Body C", slots: [QUAD_SECONDARY, INCLINE, ROW, TRICEPS, CORE] },
  ],
  bro: [
    { name: "Chest Day", slots: [BENCH, INCLINE, CHEST_ISO, TRICEPS] },
    { name: "Back Day", slots: [ROW, VERTICAL_PULL, BACK_SECONDARY, REAR_DELT] },
    { name: "Shoulder Day", slots: [OHP, LATERAL, REAR_DELT, TRICEPS] },
    { name: "Leg Day", slots: [SQUAT, QUAD_SECONDARY, HAMSTRINGS, CALVES] },
    { name: "Arm Day", slots: [BICEPS, HAMMER, TRICEPS, CORE] },
  ],
};

// How the weight for a picked exercise should be read (see lib/prs.ts).
function inferKind(
  equipment: string | undefined,
): "bodyweight" | "dumbbell" | undefined {
  if (equipment === BODYWEIGHT_EQUIPMENT) return "bodyweight";
  if (equipment === "dumbbell") return "dumbbell";
  return undefined;
}

type LibraryExercise = Doc<"exercises">;

// Rank a candidate: prefer ones with an image, compound lifts, then beginner
// level. Deterministic — no randomness (workflows/replays stay stable).
function exerciseScore(exercise: LibraryExercise): number {
  let score = 0;
  if ((exercise.images?.length ?? 0) > 0) score += 4;
  if (exercise.mechanic === "compound") score += 2;
  if (exercise.level === "beginner") score += 1;
  return score;
}

function bestOf(candidates: LibraryExercise[]): LibraryExercise {
  return [...candidates].sort(
    (a, b) => exerciseScore(b) - exerciseScore(a) || a.name.length - b.name.length,
  )[0];
}

// Pick the best library exercise for a slot: right muscle group, equipment the
// user owns, and not already used in this day. Prefers a keyword match (in
// priority order), falling back to the best-ranked candidate in the group.
function pickForSlot(
  library: LibraryExercise[],
  slot: Slot,
  allowedEquipment: Set<string>,
  usedNames: Set<string>,
): LibraryExercise | null {
  const candidates = library.filter(
    (exercise) =>
      exercise.muscleGroup === slot.group &&
      !!exercise.equipment &&
      allowedEquipment.has(exercise.equipment) &&
      !usedNames.has(exercise.name.toLowerCase()),
  );
  if (candidates.length === 0) return null;

  for (const keyword of slot.keywords) {
    const matches = candidates.filter((exercise) =>
      exercise.name.toLowerCase().includes(keyword),
    );
    if (matches.length > 0) return bestOf(matches);
  }
  return bestOf(candidates);
}

// Build the quick-start day templates for the chosen split, tailored to the
// user's equipment. Skips slots (and whole days) with no matching exercise, and
// respects the per-user template cap. Called once from onboarding.
export const createStarterDays = mutation({
  args: { split: v.string() },
  handler: async (ctx, { split }) => {
    const user = await getCurrentUserOrThrow(ctx);
    requireAccess(user, Date.now());

    const days = SPLITS[split];
    if (!days) return { created: 0 };

    const library = await ctx.db.query("exercises").collect();

    // Which library equipment values the user can use (bodyweight always in).
    const allowedEquipment = new Set<string>([BODYWEIGHT_EQUIPMENT]);
    for (const key of user.equipment ?? []) {
      for (const value of EQUIPMENT_VALUES[key] ?? []) {
        allowedEquipment.add(value);
      }
    }

    const existing = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let remaining = MAX_TEMPLATES - existing.length;

    // Insert in order, but stamp createdAt so the FIRST day sorts on top (the
    // list shows newest-first). now - index keeps day 0 above day 1, etc.
    const now = Date.now();
    let created = 0;
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      if (remaining <= 0) break;
      const day = days[dayIndex];
      const usedNames = new Set<string>();
      const exercises = [];
      for (const slot of day.slots) {
        const pick = pickForSlot(library, slot, allowedEquipment, usedNames);
        if (!pick) continue;
        usedNames.add(pick.name.toLowerCase());
        const kind = inferKind(pick.equipment);
        exercises.push({
          name: pick.name,
          ...(kind ? { kind } : {}),
          sets: Array.from({ length: slot.sets }, () => ({
            reps: slot.reps,
            weight: 0,
          })),
        });
      }
      if (exercises.length === 0) continue;
      await ctx.db.insert("templates", {
        userId: user._id,
        name: day.name,
        exercises,
        createdAt: now - dayIndex,
      });
      created += 1;
      remaining -= 1;
    }

    return { created };
  },
});
