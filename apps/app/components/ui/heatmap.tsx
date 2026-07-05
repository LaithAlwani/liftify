const DAY = 86_400_000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfWeek(ms: number) {
  const d = new Date(ms);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}

// values: Map of day-start (ms) -> workout count (violet). recovery: day-starts
// with a rest/cardio/stretch check-in (green) for days without a workout.
// Renders a GitHub-style grid (columns = weeks, rows = days), starting at the
// user's first active day and stopping at today.
export function Heatmap({
  values,
  recovery,
  weeks = 13,
}: {
  values: Map<number, number>;
  recovery?: Set<number>;
  weeks?: number;
}) {
  const today = startOfDay(Date.now());
  const thisWeekStart = startOfWeek(today);
  const max = Math.max(1, ...Array.from(values.values()));

  // First day to show: earliest workout or recovery day (or today if none).
  const keys = [
    ...Array.from(values.keys()),
    ...(recovery ? Array.from(recovery) : []),
  ];
  const firstDay = keys.length
    ? Math.min(startOfDay(Math.min(...keys)), today)
    : today;
  const firstWeekStart = startOfWeek(firstDay);

  const spanWeeks = Math.round((thisWeekStart - firstWeekStart) / (7 * DAY)) + 1;
  const weeksToShow = Math.min(weeks, Math.max(1, spanWeeks));

  type Cell = { day: number; value: number; rest: boolean; show: boolean };
  const cols: Cell[][] = [];
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const ws = thisWeekStart - w * 7 * DAY;
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = ws + d * DAY;
      const value = values.get(day) ?? 0;
      col.push({
        day,
        value,
        rest: value <= 0 && !!recovery?.has(day),
        show: day >= firstDay && day <= today,
      });
    }
    cols.push(col);
  }

  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const op = [1, 0.3, 0.52, 0.74, 1];
  const fill = (c: Cell) => {
    if (!c.show) return "transparent";
    if (c.value > 0) {
      const pct = Math.round(op[level(c.value)] * 100);
      return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
    }
    if (c.rest) return "#22c55e"; // recovery day
    return "var(--muted)";
  };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {col.map((c, j) => (
              <span
                key={j}
                title={
                  c.show
                    ? `${new Date(c.day).toLocaleDateString()}${
                        c.value > 0
                          ? `: ${c.value} workout${c.value === 1 ? "" : "s"}`
                          : c.rest
                            ? ": recovery"
                            : ""
                      }`
                    : ""
                }
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-medium tabular-nums"
                style={{
                  backgroundColor: fill(c),
                  color: !c.show
                    ? "transparent"
                    : c.value > 0 || c.rest
                      ? "#fff"
                      : "var(--muted-foreground)",
                }}
              >
                {c.show ? new Date(c.day).getDate() : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
      {recovery && recovery.size > 0 && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-accent" /> Workout
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-[#22c55e]" /> Recovery
          </span>
        </div>
      )}
    </div>
  );
}
