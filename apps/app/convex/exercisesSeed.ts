"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const REPO = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";

// Fold the dataset's fine-grained muscles into the picker's filter groups.
const GROUP: Record<string, string> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  shoulders: "shoulders",
  neck: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abdominals: "core",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  abductors: "glutes",
  adductors: "glutes",
  calves: "calves",
};

type RawExercise = {
  id: string;
  name: string;
  force?: string | null;
  level?: string | null;
  mechanic?: string | null;
  equipment?: string | null;
  category?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

// Seed the exercise library from the Free Exercise DB (public domain).
// Run: npx convex run exercisesSeed:seedFromFreeDb
export const seedFromFreeDb = internalAction({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const res = await fetch(`${REPO}/dist/exercises.json`);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = (await res.json()) as RawExercise[];

    const items = data.map((e) => ({
      name: e.name,
      externalId: e.id,
      muscleGroup: e.primaryMuscles?.[0]
        ? (GROUP[e.primaryMuscles[0]] ?? e.primaryMuscles[0])
        : undefined,
      equipment: e.equipment ?? undefined,
      category: e.category ?? undefined,
      level: e.level ?? undefined,
      force: e.force ?? undefined,
      mechanic: e.mechanic ?? undefined,
      primaryMuscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      instructions: e.instructions ?? [],
      images: (e.images ?? []).map((p) => `${REPO}/exercises/${p}`),
    }));

    await ctx.runMutation(internal.exercises.clearAll, {});
    const CHUNK = 100;
    for (let i = 0; i < items.length; i += CHUNK) {
      await ctx.runMutation(internal.exercises.insertBatch, {
        items: items.slice(i, i + CHUNK),
      });
    }
    return { inserted: items.length };
  },
});
