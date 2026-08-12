import { describe, it, expect } from "vitest";
import { deriveTags, goalTags, tagsByLibrary } from "./exercise-tags";

describe("deriveTags", () => {
  it("tags a deadlift as a posterior-chain pull", () => {
    const tags = deriveTags({
      name: "Barbell Deadlift",
      muscleGroup: "back",
      equipment: "barbell",
      mechanic: "compound",
      force: "pull",
    });
    expect(tags).toEqual(expect.arrayContaining(["deadlift", "pull", "posterior-chain", "back"]));
  });

  it("tags a squat as lower-body legs", () => {
    const tags = deriveTags({ name: "Barbell Back Squat", muscleGroup: "quads" });
    expect(tags).toEqual(expect.arrayContaining(["squat", "legs", "lower-body"]));
  });

  it("tags a bench press as a chest push", () => {
    const tags = deriveTags({
      name: "Barbell Bench Press",
      muscleGroup: "chest",
      force: "push",
    });
    expect(tags).toEqual(expect.arrayContaining(["bench", "push", "chest"]));
  });

  it("tags bodyweight moves as home-friendly", () => {
    const tags = deriveTags({ name: "Push Up", equipment: "body only" });
    expect(tags).toContain("home");
    expect(tags).toContain("bodyweight");
  });

  it("returns a de-duplicated list", () => {
    const tags = deriveTags({ name: "Barbell Deadlift", muscleGroup: "back" });
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("goalTags", () => {
  it("maps recovery to recovery/mobility", () => {
    expect(goalTags("recovery")).toEqual(
      expect.arrayContaining(["recovery", "mobility"]),
    );
  });
  it("returns an empty set for general / undefined", () => {
    expect(goalTags("general")).toEqual([]);
    expect(goalTags(undefined)).toEqual([]);
  });
});

describe("tagsByLibrary", () => {
  it("keys tags by lowercased name", () => {
    const map = tagsByLibrary([{ name: "Barbell Squat", muscleGroup: "quads" }]);
    expect(map.get("barbell squat")).toEqual(
      expect.arrayContaining(["squat", "legs"]),
    );
    expect(map.has("Barbell Squat")).toBe(false); // must be lowercased
  });
});
