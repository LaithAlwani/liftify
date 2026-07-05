// Consecutive-day streak from workout timestamps. Counts back from today (or
// yesterday, so a rest-day-so-far doesn't reset it) while each prior day has a
// workout.
const DAY = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeStreak(timestamps: number[], now: number = Date.now()): number {
  if (timestamps.length === 0) return 0;
  const days = new Set(timestamps.map(startOfDay));

  let cursor = startOfDay(now);
  if (!days.has(cursor)) {
    cursor -= DAY; // allow today to be a not-yet-trained day
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}
