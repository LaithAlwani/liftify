// Pure, deterministic recommendation scoring. No React/Next/DOM and no I/O —
// safe to import from Convex functions AND unit tests. Designed so a smarter
// engine can replace this later without changing callers: same inputs/outputs.

export type RecoProduct = {
  _id: string;
  category: string;
  tags?: string[];
  priority?: number; // 0-5 admin boost
  sortOrder: number;
  active: boolean;
};

export type RecoContext = {
  // Tags from the specific exercise(s) in view — strongest signal.
  exerciseTags: Set<string>;
  // Tags from the broader workout / recent training.
  workoutTags: Set<string>;
  // Tags implied by the user's fitness goal.
  goalTags: Set<string>;
  // Product categories the user has clicked before (behavioral weighting).
  clickedCategories: Set<string>;
};

// Scoring weights — deterministic and easy to tune. An inactive product is
// never recommended (scoreProduct returns a sentinel below zero).
export const WEIGHTS = {
  exerciseTag: 5,
  workoutTag: 3,
  goalTag: 3,
  clickedCategory: 2,
  priorityCap: 3, // max contribution from admin priority
} as const;

export function scoreProduct(product: RecoProduct, ctx: RecoContext): number {
  if (!product.active) return -1;
  let score = 0;
  for (const tag of product.tags ?? []) {
    if (ctx.exerciseTags.has(tag)) score += WEIGHTS.exerciseTag;
    if (ctx.workoutTags.has(tag)) score += WEIGHTS.workoutTag;
    if (ctx.goalTags.has(tag)) score += WEIGHTS.goalTag;
  }
  if (ctx.clickedCategories.has(product.category)) {
    score += WEIGHTS.clickedCategory;
  }
  score += Math.min(product.priority ?? 0, WEIGHTS.priorityCap);
  return score;
}

// Return the top `limit` relevant active products, most-relevant first.
// Ties break by admin priority (desc) then sortOrder (asc).
export function recommend<T extends RecoProduct>(
  products: T[],
  ctx: RecoContext,
  limit = 4,
): T[] {
  return products
    .map((product) => ({ product, score: scoreProduct(product, ctx) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.product.priority ?? 0) - (a.product.priority ?? 0) ||
        a.product.sortOrder - b.product.sortOrder,
    )
    .slice(0, limit)
    .map((entry) => entry.product);
}

// Convenience: build a RecoContext from tag arrays (Convex layer uses this).
export function buildContext(input: {
  exerciseTags?: string[];
  workoutTags?: string[];
  goalTags?: string[];
  clickedCategories?: string[];
}): RecoContext {
  return {
    exerciseTags: new Set(input.exerciseTags ?? []),
    workoutTags: new Set(input.workoutTags ?? []),
    goalTags: new Set(input.goalTags ?? []),
    clickedCategories: new Set(input.clickedCategories ?? []),
  };
}
