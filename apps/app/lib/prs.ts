// Personal-record + estimated-1RM helpers, computed client-side from workouts.

// How an exercise's weight is read. Absent = "standard" (weight is total load).
//   bodyweight → weight is the ADDED load on top of body weight (0 = just BW).
//   dumbbell   → weight is per-hand; both hands count toward volume.
export type Kind = "bodyweight" | "dumbbell";

export type SetLite = { reps: number; weight: number };
export type ExerciseLite = { name: string; kind?: Kind; sets: SetLite[] };
export type WorkoutLite = { date: number; exercises: ExerciseLite[] };

// A minimal library row — just what we need to infer a kind from the catalogue.
type LibraryRow = {
  name: string;
  equipment?: string | null;
  mechanic?: string | null;
};

// Build a name → kind map from the exercise library, used as a fallback for
// logs saved before per-exercise kinds existed. Body-only COMPOUND moves are
// "bodyweight" (their load scales with body weight — pull-ups, dips, push-ups);
// dumbbell moves are "dumbbell". Isolation body-only moves (plank, crunch) stay
// standard so they keep tracking reps, not an odd body-weight "load".
export function kindByLibrary(library: LibraryRow[]): Map<string, Kind> {
  const map = new Map<string, Kind>();
  for (const exercise of library) {
    const key = exercise.name.toLowerCase();
    if (exercise.equipment === "body only" && exercise.mechanic === "compound") {
      map.set(key, "bodyweight");
    } else if (exercise.equipment === "dumbbell") {
      map.set(key, "dumbbell");
    }
  }
  return map;
}

// The kind for an exercise: its own stored kind, else the library fallback.
export function resolveKind(
  exercise: { name: string; kind?: Kind },
  kindByName: Map<string, Kind>,
): Kind | undefined {
  return exercise.kind ?? kindByName.get(exercise.name.toLowerCase());
}

// Add the lifter's body weight to the logged (added) weight for bodyweight
// moves, so 1RM / PRs reflect total load. Dumbbell and standard weights are left
// as-is (they are the number the lifter actually PRs on). No-op without a body
// weight. Used before PR detection and the progress strength chart.
export function withBodyweight(
  workouts: WorkoutLite[],
  kindByName: Map<string, Kind>,
  bodyWeight: number,
): WorkoutLite[] {
  if (!bodyWeight) return workouts;
  return workouts.map((w) => ({
    ...w,
    exercises: w.exercises.map((ex) =>
      resolveKind(ex, kindByName) === "bodyweight"
        ? {
            ...ex,
            sets: ex.sets.map((s) => ({
              ...s,
              weight: s.weight + bodyWeight,
            })),
          }
        : ex,
    ),
  }));
}

// Total load moved for one exercise, honoring its kind: bodyweight folds body
// weight into each rep; dumbbell counts both hands (×2). Use this everywhere
// volume is shown so the number reflects real work done.
export function exerciseVolume(
  exercise: ExerciseLite,
  kindByName: Map<string, Kind>,
  bodyWeight: number,
): number {
  const kind = resolveKind(exercise, kindByName);
  const sideMultiplier = kind === "dumbbell" ? 2 : 1;
  return exercise.sets.reduce((sum, set) => {
    const load = kind === "bodyweight" ? set.weight + bodyWeight : set.weight;
    return sum + set.reps * load * sideMultiplier;
  }, 0);
}

// Total volume for a whole workout (sum of its exercises).
export function workoutVolume(
  workout: WorkoutLite,
  kindByName: Map<string, Kind>,
  bodyWeight: number,
): number {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exerciseVolume(exercise, kindByName, bodyWeight),
    0,
  );
}

// Epley estimate: a 1-rep-max projection from a working set.
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export type Bests = { maxWeight: number; best1RM: number; maxReps: number };

// All-time heaviest single set, best estimated 1RM, and most reps in a set,
// per exercise (lowercased key). maxReps powers bodyweight (0-weight) PRs.
export function bestsByExercise(workouts: WorkoutLite[]): Map<string, Bests> {
  const m = new Map<string, Bests>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const key = ex.name.toLowerCase();
      const cur = m.get(key) ?? { maxWeight: 0, best1RM: 0, maxReps: 0 };
      for (const s of ex.sets) {
        if (s.weight > cur.maxWeight) cur.maxWeight = s.weight;
        if (s.reps > cur.maxReps) cur.maxReps = s.reps;
        const e = estimate1RM(s.weight, s.reps);
        if (e > cur.best1RM) cur.best1RM = e;
      }
      m.set(key, cur);
    }
  }
  return m;
}

export type PR = {
  name: string;
  type: "weight" | "strength" | "reps";
  value: number; // new best (weight, rounded est. 1RM, or reps)
  previous: number;
};

// Find records set by `exercises` that beat the `prior` all-time bests.
// Weighted moves track weight / est. 1RM; bodyweight moves (no weight ever
// logged) track reps. First-ever exercises are a baseline, not a PR.
export function detectPRs(
  exercises: ExerciseLite[],
  prior: Map<string, Bests>,
): PR[] {
  const local = new Map<string, { name: string } & Bests>();
  for (const ex of exercises) {
    const key = ex.name.toLowerCase();
    const cur =
      local.get(key) ?? { name: ex.name, maxWeight: 0, best1RM: 0, maxReps: 0 };
    for (const s of ex.sets) {
      if (s.weight > cur.maxWeight) cur.maxWeight = s.weight;
      if (s.reps > cur.maxReps) cur.maxReps = s.reps;
      const e = estimate1RM(s.weight, s.reps);
      if (e > cur.best1RM) cur.best1RM = e;
    }
    local.set(key, cur);
  }

  const prs: PR[] = [];
  for (const [key, b] of local) {
    const before = prior.get(key);
    if (!before) continue; // no baseline → not a PR
    const weighted = before.maxWeight > 0 || b.maxWeight > 0;
    if (weighted) {
      if (before.maxWeight <= 0) continue; // first weighted attempt → baseline
      if (b.maxWeight > before.maxWeight) {
        prs.push({
          name: b.name,
          type: "weight",
          value: b.maxWeight,
          previous: before.maxWeight,
        });
      } else if (Math.round(b.best1RM) > Math.round(before.best1RM)) {
        prs.push({
          name: b.name,
          type: "strength",
          value: Math.round(b.best1RM),
          previous: Math.round(before.best1RM),
        });
      }
    } else {
      // Pure bodyweight move — a PR is more reps in a set.
      if (before.maxReps <= 0) continue;
      if (b.maxReps > before.maxReps) {
        prs.push({
          name: b.name,
          type: "reps",
          value: b.maxReps,
          previous: before.maxReps,
        });
      }
    }
  }
  return prs;
}

// Exercises that appear in history, most-frequent first (for selectors).
export function loggedExercises(
  workouts: WorkoutLite[],
): { name: string; count: number; last: number }[] {
  const counts = new Map<string, { name: string; count: number; last: number }>();
  for (const w of workouts) {
    for (const e of w.exercises) {
      const key = e.name.toLowerCase();
      const cur = counts.get(key) ?? { name: e.name, count: 0, last: 0 };
      cur.count += 1;
      cur.last = Math.max(cur.last, w.date);
      counts.set(key, cur);
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || b.last - a.last,
  );
}

// Per-session top weight, estimated 1RM, and top reps for one exercise,
// oldest → newest. Bodyweight sessions (e1rm 0) are included so the Progress
// chart can fall back to a reps trend.
export function exerciseSeries(
  workouts: WorkoutLite[],
  name: string,
): { date: number; topWeight: number; e1rm: number; reps: number }[] {
  const key = name.toLowerCase();
  const points: {
    date: number;
    topWeight: number;
    e1rm: number;
    reps: number;
  }[] = [];
  for (const w of workouts) {
    let topWeight = 0;
    let e1rm = 0;
    let reps = 0;
    let found = false;
    for (const ex of w.exercises) {
      if (ex.name.toLowerCase() !== key) continue;
      found = true;
      for (const s of ex.sets) {
        if (s.weight > topWeight) topWeight = s.weight;
        if (s.reps > reps) reps = s.reps;
        const v = estimate1RM(s.weight, s.reps);
        if (v > e1rm) e1rm = v;
      }
    }
    if (found && reps > 0) {
      points.push({ date: w.date, topWeight, e1rm: Math.round(e1rm), reps });
    }
  }
  return points.sort((a, b) => a.date - b.date);
}
