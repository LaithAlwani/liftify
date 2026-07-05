// Personal-record + estimated-1RM helpers, computed client-side from workouts.

export type SetLite = { reps: number; weight: number };
export type ExerciseLite = { name: string; sets: SetLite[] };
export type WorkoutLite = { date: number; exercises: ExerciseLite[] };

// Add the lifter's body weight to the logged (added) weight for bodyweight-based
// moves, so volume / 1RM / PRs reflect total load. No-op without a body weight
// or when nothing is bodyweight-based (then the logged weight stands as-is).
export function withBodyweight(
  workouts: WorkoutLite[],
  bodyweightNames: Set<string>,
  bodyWeight: number,
): WorkoutLite[] {
  if (!bodyWeight || bodyweightNames.size === 0) return workouts;
  return workouts.map((w) => ({
    ...w,
    exercises: w.exercises.map((ex) =>
      bodyweightNames.has(ex.name.toLowerCase())
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
