import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Liftify schema — a free workout tracker.
//   users       account + preferences (one row per Clerk user)
//   exercises   seeded, read-only exercise library
//   workouts    one row per logged workout, exercises embedded as an array
//   checkins    rest/cardio/stretch recovery days (keep a streak alive)
//   bodyEntries journal-style body log (weight + optional measurements)

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    units: v.union(v.literal("kg"), v.literal("lb")),

    // Training preferences.
    weeklyGoal: v.optional(v.number()), // target workouts per week
    restSeconds: v.optional(v.number()), // default rest timer length
    bodyWeight: v.optional(v.number()), // for bodyweight-load math (in `units`)
    lastExerciseReminderDay: v.optional(v.number()), // dayKey of last daily nudge
    timeZone: v.optional(v.string()), // IANA zone, e.g. "America/New_York" (DST-correct)
    tzOffset: v.optional(v.number()), // legacy fallback: minutes (Date.getTimezoneOffset)
    reminderHour: v.optional(v.number()), // local hour 0-23 for reminders
    // Reminder toggles (undefined = on by default).
    remindExercise: v.optional(v.boolean()),
    remindWeighIn: v.optional(v.boolean()),
    remindRest: v.optional(v.boolean()),

    // The user's personal weight room — which equipment they have on hand.
    // User-facing keys (e.g. "barbell", "dumbbell"); bodyweight is always
    // available. Set during onboarding, editable in settings. Powers the
    // starter-day generator and could later filter the exercise picker.
    equipment: v.optional(v.array(v.string())),

    lastWeighInWeek: v.optional(v.number()), // weekKey we last handled the weigh-in reminder

    onboardedAt: v.optional(v.number()), // epoch ms; set only when the user FINISHES the welcome flow
    onboardingSkippedAt: v.optional(v.number()), // epoch ms; set when they tap "Skip for now" instead

    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  exercises: defineTable({
    name: v.string(),
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
    // Enriched from the Free Exercise DB (public domain).
    externalId: v.optional(v.string()),
    category: v.optional(v.string()),
    level: v.optional(v.string()),
    force: v.optional(v.string()),
    mechanic: v.optional(v.string()),
    primaryMuscles: v.optional(v.array(v.string())),
    secondaryMuscles: v.optional(v.array(v.string())),
    instructions: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())), // full CDN URLs
  })
    .index("by_name", ["name"])
    .index("by_external_id", ["externalId"]),

  workouts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    date: v.number(), // epoch ms — when the workout happened
    durationSec: v.optional(v.number()), // how long the session took
    // Each exercise holds an ordered list of sets; weight can differ per set.
    exercises: v.array(
      v.object({
        name: v.string(),
        // How the weight for this exercise is read. Absent = "standard" (weight
        // is the total load). "bodyweight" = weight is the ADDED load on top of
        // body weight (0 = just bodyweight). "dumbbell" = weight is per-hand and
        // volume counts both hands. See lib/prs.ts for the math.
        kind: v.optional(
          v.union(v.literal("bodyweight"), v.literal("dumbbell")),
        ),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
          }),
        ),
      }),
    ),
  }).index("by_user_date", ["userId", "date"]),

  // Reusable workout templates — a named list of exercises with target sets/reps
  // (e.g. "Leg Day"). Capped at 5 per user (enforced in templates.create). Same
  // embedded exercise shape as `workouts`, minus date/duration.
  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        // Same weight-reading modes as workouts (see the `kind` note above).
        kind: v.optional(
          v.union(v.literal("bodyweight"), v.literal("dumbbell")),
        ),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
          }),
        ),
      }),
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Active-recovery check-ins (rest / cardio / stretching) that keep a streak
  // alive without being a full lifting workout.
  checkins: defineTable({
    userId: v.id("users"),
    date: v.number(),
    type: v.union(
      v.literal("rest"),
      v.literal("cardio"),
      v.literal("stretching"),
    ),
  }).index("by_user_date", ["userId", "date"]),

  bodyEntries: defineTable({
    userId: v.id("users"),
    date: v.number(),
    weight: v.number(),
    notes: v.optional(v.string()),
    measurements: v.optional(
      v.object({
        waist: v.optional(v.number()),
        chest: v.optional(v.number()),
        arms: v.optional(v.number()),
        hips: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
  }).index("by_user_date", ["userId", "date"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // e.g. "body_weight_reminder"
    title: v.string(),
    body: v.string(),
    weekKey: v.optional(v.number()), // dedupe one-per-week reminders
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
