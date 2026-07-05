"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { loggedExercises, exerciseSeries, withBodyweight } from "@/lib/prs";
import { CountUp } from "@/components/ui/count-up";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Info,
  Barbell,
  Flame,
  CalendarCheck,
  Target,
  Timer,
  CaretDown,
  TrendUp,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/ui/stat-card";
import { Heatmap } from "@/components/ui/heatmap";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;

// Volt accent — recharts needs a real hex, so we can't use a token class here.
const VOLT = "#d7f24a";
const VOLT_FILL = "rgba(215, 242, 74, 0.1)";

// Shared card styles so every panel on this page looks the same.
const cardStyles = "rounded-[16px] border border-border bg-card p-4 sm:p-5";
const heroCardStyles =
  "rounded-[16px] border border-border-strong bg-card p-4 sm:p-5";
const sectionLabelStyles = "mono-label text-[10px] text-muted-foreground";

function startOfWeek(ms: number) {
  const d = new Date(ms);
  const dayFromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - dayFromMonday * DAY;
}
function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function weekLabel(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function fmtDur(sec: number) {
  if (sec <= 0) return "—";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 13,
};

export default function ProgressPage() {
  const me = useQuery(api.users.me, {});
  const workouts = useQuery(api.workouts.listForUser, { limit: 300 });
  const exercises = useQuery(api.exercises.list, {});
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const checkins = useQuery(api.checkins.listForUser, {});
  const unit = me?.units ?? "lb";

  const recoveryDays = new Set(
    (checkins ?? []).map((checkin) => startOfDay(checkin.date)),
  );

  // Fold body weight into bodyweight moves so volume / 1RM reflect total load.
  const bwNames = useMemo(
    () =>
      new Set(
        (exercises ?? [])
          .filter(
            (exercise) =>
              exercise.equipment === "body only" &&
              exercise.mechanic === "compound",
          )
          .map((exercise) => exercise.name.toLowerCase()),
      ),
    [exercises],
  );
  const effBodyWeight = latestBodyWeight ?? me?.bodyWeight ?? 0;
  const loadWorkouts = useMemo(
    () => withBodyweight(workouts ?? [], bwNames, effBodyWeight),
    [workouts, bwNames, effBodyWeight],
  );

  const WEEKS = 8;
  let weeks: { label: string; count: number; volume: number }[] = [];
  if (workouts) {
    const thisWeek = startOfWeek(Date.now());
    const buckets = new Map<number, { count: number; volume: number }>();
    for (let i = WEEKS - 1; i >= 0; i--) {
      buckets.set(thisWeek - i * 7 * DAY, { count: 0, volume: 0 });
    }
    for (const workout of loadWorkouts) {
      const bucket = buckets.get(startOfWeek(workout.date));
      if (!bucket) continue;
      bucket.count += 1;
      bucket.volume += workout.exercises.reduce(
        (sum, exercise) =>
          sum + exercise.sets.reduce((s, set) => s + set.reps * set.weight, 0),
        0,
      );
    }
    weeks = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([weekStart, bucket]) => ({
        label: weekLabel(weekStart),
        count: bucket.count,
        volume: Math.round(bucket.volume),
      }));
  }

  const total = workouts?.length ?? 0;
  const hasData = total > 0;
  const streak = workouts
    ? computeStreak(workouts.map((workout) => workout.date))
    : 0;
  const thisWeekStart = startOfWeek(Date.now());
  const thisWeekCount = (workouts ?? []).filter(
    (workout) => workout.date >= thisWeekStart,
  ).length;
  const avgPerWeek = (
    weeks.reduce((sum, week) => sum + week.count, 0) / WEEKS
  ).toFixed(1);
  const dayValues = new Map<number, number>();
  for (const workout of workouts ?? []) {
    const key = startOfDay(workout.date);
    dayValues.set(key, (dayValues.get(key) ?? 0) + 1);
  }
  const durations = (workouts ?? [])
    .map((workout) => workout.durationSec ?? 0)
    .filter((seconds) => seconds > 0);
  const avgDurationSec = durations.length
    ? durations.reduce((sum, seconds) => sum + seconds, 0) / durations.length
    : 0;

  // Per-exercise progress (estimated 1RM over time).
  const exerciseOptions = loggedExercises(workouts ?? []);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  useEffect(() => {
    if (selectedExercise === null && exerciseOptions.length > 0) {
      setSelectedExercise(exerciseOptions[0].name);
    }
  }, [selectedExercise, exerciseOptions]);
  const series = selectedExercise
    ? exerciseSeries(loadWorkouts, selectedExercise)
    : [];
  // Pure bodyweight moves never log weight → no est. 1RM; track reps instead.
  // If a move is ever loaded (plates/belt), chart est. 1RM and drop any
  // bodyweight-only sessions so they don't show as a misleading 0.
  const isBodyweight = series.length > 0 && series.every((p) => p.e1rm === 0);
  const seriesData = isBodyweight
    ? series.map((point) => ({ label: weekLabel(point.date), value: point.reps }))
    : series
        .filter((point) => point.e1rm > 0)
        .map((point) => ({ label: weekLabel(point.date), value: point.e1rm }));

  // Hero card headline: latest value + change since the first logged session.
  const hasTrend = seriesData.length >= 2;
  const latestValue = seriesData.length
    ? Math.round(seriesData[seriesData.length - 1].value)
    : 0;
  const startValue = seriesData.length
    ? Math.round(seriesData[0].value)
    : 0;
  const changeSinceStart = latestValue - startValue;
  const changeLabel =
    changeSinceStart >= 0 ? `+${changeSinceStart}` : `${changeSinceStart}`;
  const heroUnit = isBodyweight ? "reps" : unit;

  return (
    <div className="container-page flex flex-col gap-5 py-8">
      <header>
        <h1 className="font-display text-3xl font-black lg:text-4xl">
          PROGRESS
        </h1>
        <p className={`${sectionLabelStyles} mt-1`}>LAST 8 WEEKS</p>
      </header>

      {workouts === undefined ? (
        <ProgressSkeleton />
      ) : !hasData ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Log a few workouts and your charts will fill in here.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total"
              value={<CountUp value={total} />}
              unit="workouts"
              icon={<Barbell weight="bold" className="size-3" />}
            />
            <StatCard
              label="This week"
              value={<CountUp value={thisWeekCount} />}
              unit="logged"
              icon={<CalendarCheck weight="bold" className="size-3" />}
            />
            <StatCard
              label="Streak"
              value={<CountUp value={streak} />}
              unit={streak === 1 ? "day" : "days"}
              variant="spark"
              icon={<Flame weight="fill" className="size-3" />}
            />
            <StatCard
              label="Avg / wk"
              value={
                <CountUp
                  value={Number(avgPerWeek)}
                  format={(n) => n.toFixed(1)}
                />
              }
              unit="last 8 wk"
              icon={<Target weight="bold" className="size-3" />}
            />
            <StatCard
              label="Avg"
              value={
                <CountUp
                  value={avgDurationSec}
                  format={(n) => (n > 0 ? fmtDur(n) : "—")}
                />
              }
              unit="/ session"
              icon={<Timer weight="bold" className="size-3" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {exerciseOptions.length > 0 && (
              <section className={heroCardStyles}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="relative">
                    <select
                      value={selectedExercise ?? ""}
                      onChange={(event) =>
                        setSelectedExercise(event.target.value)
                      }
                      className="max-w-[180px] appearance-none truncate rounded-full bg-muted py-1.5 pl-3 pr-8 font-mono text-[11px] text-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {exerciseOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      weight="bold"
                      className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                    />
                  </div>
                  <p className={sectionLabelStyles}>
                    {isBodyweight ? "TOP REPS" : "EST. 1RM"}
                  </p>
                </div>

                <div className="mb-3 flex items-baseline gap-2.5">
                  <span className="font-display text-4xl font-black leading-none">
                    {latestValue}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {heroUnit}
                  </span>
                  {hasTrend && (
                    <span className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent">
                      <TrendUp weight="bold" className="size-3" />
                      {changeLabel} vs start
                    </span>
                  )}
                </div>

                {hasTrend ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={seriesData}
                        margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={axisTick}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={["dataMin - 5", "dataMax + 5"]}
                          tick={axisTick}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={isBodyweight ? "Top reps" : "Est. 1RM"}
                          stroke={VOLT}
                          strokeWidth={2.5}
                          fill={VOLT_FILL}
                          dot={{ r: 3, fill: VOLT }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Log this exercise at least twice to see your trend.
                  </p>
                )}
              </section>
            )}

            <ChartCard title="Workouts per week">
              <BarChart
                data={weeks}
                margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
              >
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="count" fill={VOLT} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>

          <ChartCard
            title="Weekly volume"
            hint={`Training volume = the total weight you moved each week. For every set we multiply reps × weight, then add it all up (in ${unit}). It's a simple proxy for how hard you trained — higher usually means more total work.`}
          >
            <LineChart
              data={weeks}
              margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
            >
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="volume"
                stroke={VOLT}
                strokeWidth={2.5}
                dot={{ r: 3, fill: VOLT }}
              />
            </LineChart>
          </ChartCard>

          <section className={cardStyles}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className={sectionLabelStyles}>Consistency</p>
              <p className="mono-label text-[9px] text-dim">
                Each square = a day you trained
              </p>
            </div>
            <Heatmap values={dayValues} recovery={recoveryDays} />
          </section>
        </>
      )}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-[14px] border border-border bg-muted"
          />
        ))}
      </div>
      {/* Chart cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cardStyles}>
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-4 h-52 rounded-xl bg-muted" />
        </div>
      ))}
      {/* Consistency heatmap */}
      <div className={cardStyles}>
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="size-7 rounded-md bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactElement;
}) {
  return (
    <section className={cardStyles}>
      <div className="relative flex items-center gap-1.5">
        <p className={sectionLabelStyles}>{title}</p>
        {hint && (
          <>
            <button
              type="button"
              aria-label="What does this mean?"
              className="peer flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Info className="size-4" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-full max-w-xs rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity duration-150 peer-hover:opacity-100 peer-focus:opacity-100"
            >
              {hint}
            </span>
          </>
        )}
      </div>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
