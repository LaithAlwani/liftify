// Shared date / duration helpers. These were re-implemented across home,
// progress, body, history, and workout-detail — this is the single source so the
// whole app buckets time and formats durations the same way.

export const DAY_MS = 86_400_000;

// Midnight (local) of the day containing `ms`.
export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Midnight (local) of the Monday of the week containing `ms`.
export function startOfWeek(ms: number): number {
  const date = new Date(ms);
  const daysFromMonday = (date.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  date.setHours(0, 0, 0, 0);
  return date.getTime() - daysFromMonday * DAY_MS;
}

// Compact human duration: "1h 05m", "45m", or "30s".
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0s";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// "Mar 5" — short month + day.
export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// "Mon" — abbreviated weekday.
export function weekdayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short" });
}
