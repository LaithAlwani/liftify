import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrow } from "./model";

const DAY = 86_400_000;

// We shift the UTC clock by the user's stored offset so getUTC* reads out their
// local wall-clock values.
function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfUtcWeekMonday(ms: number): number {
  const d = new Date(ms);
  const fromMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}

// Minutes between UTC and the zone's local wall clock at instant `ms`, matching
// Date.getTimezoneOffset()'s sign (UTC = local + offset). Recomputed from the
// IANA zone every run, so a DST change is always reflected automatically.
function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(ms))) {
    parts[part.type] = part.value;
  }
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((ms - localAsUtc) / 60_000);
}

// Prefer the stored IANA zone (DST-correct); fall back to the legacy numeric
// offset, then UTC. A bad zone string degrades gracefully to the offset.
function userOffsetMinutes(
  user: { timeZone?: string; tzOffset?: number },
  now: number,
): number {
  if (user.timeZone) {
    try {
      return zoneOffsetMinutes(now, user.timeZone);
    } catch {
      // Unknown/invalid zone — fall through to the stored offset.
    }
  }
  return user.tzOffset ?? 0;
}

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.filter((n) => n.readAt === undefined).length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of items) {
      if (n.readAt !== undefined) {
        // Already read in a previous session — clear it for good.
        await ctx.db.delete(n._id);
      } else {
        // Mark currently-shown ones read (badge clears now; they clear next open).
        await ctx.db.patch(n._id, { readAt: now });
      }
    }
  },
});

// Cron entry point — runs hourly and fires each user's reminders at their own
// local reminder hour (and on their local Monday for the weekly weigh-in).
export const runReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      const tz = userOffsetMinutes(u, now); // minutes; UTC = local + tz
      const hour = u.reminderHour ?? 18;
      const localMs = now - tz * 60_000; // read getUTC* as local wall-clock
      if (new Date(localMs).getUTCHours() !== hour) continue;

      // Daily "move today" nudge.
      if (u.remindExercise !== false) {
        const dayKey = startOfUtcDay(localMs);
        if (u.lastExerciseReminderDay !== dayKey) {
          const dayStartUtc = dayKey + tz * 60_000;
          const workedOut = await ctx.db
            .query("workouts")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", u._id).gte("date", dayStartUtc),
            )
            .first();
          const checkedIn = await ctx.db
            .query("checkins")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", u._id).gte("date", dayStartUtc),
            )
            .first();
          await ctx.db.patch(u._id, { lastExerciseReminderDay: dayKey });
          if (!workedOut && !checkedIn) {
            await ctx.db.insert("notifications", {
              userId: u._id,
              type: "daily_exercise_reminder",
              title: "Time to move",
              body: "Log a workout — or a rest, cardio, or stretch day to keep your streak.",
              createdAt: now,
            });
            await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
              userId: u._id,
              title: "Time to move 💪",
              body: "Log a workout — or a rest/cardio/stretch day to keep your streak.",
              url: "/",
            });
          }
        }
      }

      // Weekly weigh-in — on the user's local Monday.
      if (u.remindWeighIn !== false && new Date(localMs).getUTCDay() === 1) {
        const weekKey = startOfUtcWeekMonday(localMs);
        if (u.lastWeighInWeek !== weekKey) {
          const weekStartUtc = weekKey + tz * 60_000;
          const weighed = await ctx.db
            .query("bodyEntries")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", u._id).gte("date", weekStartUtc),
            )
            .first();
          await ctx.db.patch(u._id, { lastWeighInWeek: weekKey });
          if (!weighed) {
            await ctx.db.insert("notifications", {
              userId: u._id,
              type: "body_weight_reminder",
              title: "Weekly weigh-in",
              body: "Log your body weight to keep your progress up to date.",
              weekKey,
              createdAt: now,
            });
            await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
              userId: u._id,
              title: "Weekly weigh-in",
              body: "Log your body weight to keep your progress up to date.",
              url: "/body",
            });
          }
        }
      }
    }
  },
});
