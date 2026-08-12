import { describe, it, expect } from "vitest";
import {
  scoreProduct,
  recommend,
  buildContext,
  WEIGHTS,
  type RecoProduct,
} from "./recommend";

function product(
  id: string,
  tags: string[],
  over: Partial<RecoProduct> = {},
): RecoProduct {
  return {
    _id: id,
    category: "lifting",
    tags,
    sortOrder: 0,
    active: true,
    ...over,
  };
}

describe("scoreProduct", () => {
  it("never recommends an inactive product", () => {
    const ctx = buildContext({ exerciseTags: ["deadlift"] });
    expect(scoreProduct(product("a", ["deadlift"], { active: false }), ctx)).toBe(
      -1,
    );
  });

  it("adds the exercise-tag weight per matching tag", () => {
    const ctx = buildContext({ exerciseTags: ["deadlift", "pull"] });
    // two matching exercise tags → 2 * 5
    expect(scoreProduct(product("a", ["deadlift", "pull"]), ctx)).toBe(
      2 * WEIGHTS.exerciseTag,
    );
  });

  it("combines exercise, workout, goal and clicked-category weights", () => {
    const ctx = buildContext({
      exerciseTags: ["deadlift"],
      workoutTags: ["back"],
      goalTags: ["strength"],
      clickedCategories: ["lifting"],
    });
    const p = product("a", ["deadlift", "back", "strength"], {
      category: "lifting",
    });
    expect(scoreProduct(p, ctx)).toBe(
      WEIGHTS.exerciseTag +
        WEIGHTS.workoutTag +
        WEIGHTS.goalTag +
        WEIGHTS.clickedCategory,
    );
  });

  it("caps the admin priority contribution", () => {
    const ctx = buildContext({});
    expect(scoreProduct(product("a", [], { priority: 99 }), ctx)).toBe(
      WEIGHTS.priorityCap,
    );
  });

  it("scores zero when nothing matches", () => {
    const ctx = buildContext({ exerciseTags: ["squat"] });
    expect(scoreProduct(product("a", ["cardio"]), ctx)).toBe(0);
  });
});

describe("recommend", () => {
  const ctx = buildContext({
    exerciseTags: ["deadlift"],
    goalTags: ["strength"],
  });

  it("excludes non-matching and inactive products", () => {
    const products = [
      product("match", ["deadlift"]),
      product("nomatch", ["cardio"]),
      product("inactive", ["deadlift"], { active: false }),
    ];
    const result = recommend(products, ctx).map((p) => p._id);
    expect(result).toEqual(["match"]);
  });

  it("orders by score descending", () => {
    const products = [
      product("low", ["strength"]), // +3
      product("high", ["deadlift", "strength"]), // +5 +3
    ];
    expect(recommend(products, ctx).map((p) => p._id)).toEqual(["high", "low"]);
  });

  it("respects the limit", () => {
    const products = [
      product("a", ["deadlift"]),
      product("b", ["deadlift"]),
      product("c", ["deadlift"]),
    ];
    expect(recommend(products, ctx, 2)).toHaveLength(2);
  });

  it("breaks ties by priority then sortOrder", () => {
    const products = [
      product("c", ["deadlift"], { priority: 0, sortOrder: 2 }),
      product("a", ["deadlift"], { priority: 5, sortOrder: 9 }),
      product("b", ["deadlift"], { priority: 0, sortOrder: 1 }),
    ];
    // 'a' wins on priority (even though score gets +priority too); then b before c by sortOrder
    expect(recommend(products, ctx).map((p) => p._id)).toEqual(["a", "b", "c"]);
  });
});
