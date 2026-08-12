// Pure tag derivation for the gear-recommendation engine. No React/Next/DOM —
// safe to import from Convex functions AND unit tests.
//
// Workouts store exercise NAMES, and the exercise library carries
// muscleGroup/equipment/mechanic/force/category. Rather than hand-tag 873
// exercises, we DERIVE a set of match tags from that metadata + name keywords.
// Product tags (admin-assigned) use the same vocabulary.

export type ExerciseMeta = {
  name: string;
  muscleGroup?: string;
  equipment?: string;
  mechanic?: string; // compound | isolation
  force?: string; // push | pull | static
  category?: string; // strength | cardio | stretching | powerlifting | ...
};

export type FitnessGoal =
  | "build-muscle"
  | "cardio"
  | "home-workout"
  | "recovery"
  | "general";

// Name keyword → tags. First-match order doesn't matter (all matches union).
const NAME_KEYWORDS: { kw: string; tags: string[] }[] = [
  { kw: "deadlift", tags: ["deadlift", "pull", "posterior-chain", "back", "strength"] },
  { kw: "romanian", tags: ["hamstrings", "legs", "posterior-chain", "strength"] },
  { kw: "good morning", tags: ["hamstrings", "posterior-chain", "legs"] },
  { kw: "squat", tags: ["squat", "legs", "lower-body", "quads", "strength"] },
  { kw: "lunge", tags: ["lunge", "legs", "lower-body"] },
  { kw: "leg press", tags: ["legs", "lower-body", "quads"] },
  { kw: "leg curl", tags: ["hamstrings", "legs", "posterior-chain"] },
  { kw: "calf", tags: ["calves", "legs"] },
  { kw: "hip thrust", tags: ["glutes", "legs", "posterior-chain"] },
  { kw: "glute", tags: ["glutes", "legs", "posterior-chain"] },
  { kw: "bench press", tags: ["bench", "press", "push", "chest", "strength"] },
  { kw: "bench", tags: ["bench", "press", "push", "chest"] },
  { kw: "overhead press", tags: ["press", "push", "shoulders", "strength"] },
  { kw: "shoulder press", tags: ["press", "push", "shoulders"] },
  { kw: "military", tags: ["press", "push", "shoulders"] },
  { kw: "row", tags: ["row", "pull", "back"] },
  { kw: "pull up", tags: ["pull-up", "pull", "back", "bodyweight"] },
  { kw: "pullup", tags: ["pull-up", "pull", "back", "bodyweight"] },
  { kw: "pull-up", tags: ["pull-up", "pull", "back", "bodyweight"] },
  { kw: "chin", tags: ["pull-up", "pull", "back", "bodyweight"] },
  { kw: "pulldown", tags: ["pull", "back"] },
  { kw: "curl", tags: ["curl", "arms", "biceps"] },
  { kw: "dip", tags: ["dip", "push", "chest", "triceps", "bodyweight"] },
  { kw: "fly", tags: ["chest", "isolation"] },
  { kw: "raise", tags: ["shoulders", "isolation"] },
  { kw: "plank", tags: ["core", "abs"] },
  { kw: "crunch", tags: ["core", "abs"] },
  { kw: "sit-up", tags: ["core", "abs"] },
  { kw: "leg raise", tags: ["core", "abs"] },
  { kw: "run", tags: ["cardio", "running"] },
  { kw: "sprint", tags: ["cardio", "running"] },
  { kw: "jog", tags: ["cardio", "running"] },
  { kw: "treadmill", tags: ["cardio", "running"] },
  { kw: "jump rope", tags: ["cardio", "home"] },
  { kw: "burpee", tags: ["cardio", "home", "bodyweight"] },
  { kw: "stretch", tags: ["mobility", "recovery"] },
  { kw: "clean", tags: ["olympic", "power", "strength"] },
  { kw: "snatch", tags: ["olympic", "power", "strength"] },
  { kw: "farmer", tags: ["grip", "forearms"] },
  { kw: "wrist", tags: ["wrist", "forearms"] },
];

const MUSCLE_GROUP_TAGS: Record<string, string[]> = {
  chest: ["chest", "push"],
  back: ["back", "pull", "posterior-chain"],
  shoulders: ["shoulders", "push"],
  arms: ["arms"],
  biceps: ["arms"],
  triceps: ["arms"],
  traps: ["back"],
  core: ["core", "abs"],
  abs: ["core", "abs"],
  quads: ["legs", "lower-body", "quads"],
  hamstrings: ["legs", "lower-body", "hamstrings", "posterior-chain"],
  glutes: ["legs", "lower-body", "glutes", "posterior-chain"],
  calves: ["legs", "calves"],
};

const EQUIPMENT_TAGS: Record<string, string[]> = {
  barbell: ["barbell", "strength"],
  "e-z curl bar": ["barbell"],
  dumbbell: ["dumbbell"],
  cable: ["cable"],
  machine: ["machine"],
  "leverage machine": ["machine"],
  kettlebell: ["kettlebell"],
  bands: ["bands", "home"],
  "body only": ["bodyweight", "home"],
  bodyweight: ["bodyweight", "home"],
};

const CATEGORY_TAGS: Record<string, string[]> = {
  cardio: ["cardio"],
  stretching: ["mobility", "recovery"],
  powerlifting: ["powerlifting", "strength"],
  "olympic weightlifting": ["olympic", "strength"],
  strongman: ["strength"],
  plyometrics: ["cardio", "power"],
};

// Derive the full match-tag set for a single exercise.
export function deriveTags(exercise: ExerciseMeta): string[] {
  const tags = new Set<string>();
  const name = exercise.name.toLowerCase();

  for (const { kw, tags: kwTags } of NAME_KEYWORDS) {
    if (name.includes(kw)) kwTags.forEach((t) => tags.add(t));
  }
  const group = exercise.muscleGroup?.toLowerCase();
  if (group && MUSCLE_GROUP_TAGS[group]) {
    MUSCLE_GROUP_TAGS[group].forEach((t) => tags.add(t));
  }
  const equipment = exercise.equipment?.toLowerCase();
  if (equipment && EQUIPMENT_TAGS[equipment]) {
    EQUIPMENT_TAGS[equipment].forEach((t) => tags.add(t));
  }
  if (exercise.force === "push") tags.add("push");
  if (exercise.force === "pull") tags.add("pull");
  if (exercise.mechanic === "compound") {
    tags.add("compound");
    tags.add("strength");
  }
  const category = exercise.category?.toLowerCase();
  if (category && CATEGORY_TAGS[category]) {
    CATEGORY_TAGS[category].forEach((t) => tags.add(t));
  }
  return [...tags];
}

// name.toLowerCase() → derived tags, mirroring lib/prs.ts kindByLibrary so a
// logged workout (which stores names) can be resolved to tags.
export function tagsByLibrary(
  library: ExerciseMeta[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const exercise of library) {
    map.set(exercise.name.toLowerCase(), deriveTags(exercise));
  }
  return map;
}

// A user's fitness goal → the product tags it favors.
const GOAL_TAGS: Record<FitnessGoal, string[]> = {
  "build-muscle": ["strength", "muscle", "barbell", "dumbbell", "support"],
  cardio: ["cardio", "running", "home"],
  "home-workout": ["home", "bodyweight", "bands", "dumbbell"],
  recovery: ["recovery", "mobility"],
  general: [],
};

export function goalTags(goal: FitnessGoal | undefined): string[] {
  return goal ? GOAL_TAGS[goal] : [];
}
