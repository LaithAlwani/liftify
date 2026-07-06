"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Flame,
  Barbell,
  Timer,
  Target,
  ChartBar,
  Trophy,
  X,
  Play,
  Plus,
} from "@phosphor-icons/react";
import { withBodyweight, type PR } from "@/lib/prs";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/ui/count-up";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BodyDiagram } from "@/components/body-diagram";
import { Onboarding } from "@/components/onboarding";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;
const DEFAULT_WEEKLY_GOAL = 4; // target workouts per week (until the user sets one)
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Single-letter labels under the weekly volume bars (Mon → Sun).
const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

// Shared style constants (keep these easy to tweak).
const sectionLabelStyles = "mono-label text-[10px] text-muted-foreground";
const cardStyles = "rounded-[14px] border border-border bg-card";

function startOfWeek(ms: number) {
  const d = new Date(ms);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}
function workoutVolume(w: { exercises: { sets: { reps: number; weight: number }[] }[] }) {
  return w.exercises.reduce(
    (s, e) => s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0),
    0,
  );
}
function fmtWeekday(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short" });
}
function fmtTime(sec: number) {
  if (sec <= 0) return "—";
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function HomePage() {
  const workouts = useQuery(api.workouts.listForUser, { limit: 120 });
  const me = useQuery(api.users.me, {});
  const templates = useQuery(api.templates.list, {});
  const exercises = useQuery(api.exercises.list, {});
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const latestBody = useQuery(api.bodyEntries.latest, {});
  const checkins = useQuery(api.checkins.listForUser, {});
  const logCheckin = useMutation(api.checkins.create);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);

  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      setHasDraft(!!localStorage.getItem("liftify:draft-workout"));
    } catch {
      /* ignore */
    }
  }, []);

  // Celebrate PRs handed off by the just-finished workout (one-shot).
  const [prCelebration, setPrCelebration] = useState<{
    unit: string;
    prs: PR[];
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("liftify:new-prs");
      if (raw) {
        setPrCelebration(JSON.parse(raw));
        localStorage.removeItem("liftify:new-prs");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const unit = me?.units ?? "lb";
  const name = me?.firstName ?? "lifter";
  const weeklyGoal = me?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL;

  // Fold body weight into bodyweight moves so volume reflects total load.
  const bwNames = useMemo(
    () =>
      new Set(
        (exercises ?? [])
          .filter((e) => e.equipment === "body only" && e.mechanic === "compound")
          .map((e) => e.name.toLowerCase()),
      ),
    [exercises],
  );
  const effBodyWeight = latestBodyWeight ?? me?.bodyWeight ?? 0;
  const loadWorkouts = useMemo(
    () => withBodyweight(workouts ?? [], bwNames, effBodyWeight),
    [workouts, bwNames, effBodyWeight],
  );

  const weekStart = startOfWeek(Date.now());
  const thisWeek = (workouts ?? []).filter((w) => w.date >= weekStart);
  const weekCount = thisWeek.length;
  const weekVolume = Math.round(
    loadWorkouts
      .filter((w) => w.date >= weekStart)
      .reduce((s, w) => s + workoutVolume(w), 0),
  );
  const weekTime = thisWeek.reduce((s, w) => s + (w.durationSec ?? 0), 0);
  // Streak counts workouts AND recovery check-ins (rest/cardio/stretch).
  const activeDates = [
    ...(workouts ?? []).map((w) => w.date),
    ...(checkins ?? []).map((c) => c.date),
  ];
  const streak = computeStreak(activeDates);
  // Already trained or logged recovery today? Then hide the streak-saver card.
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const activeToday = activeDates.some((d) => d >= todayStart);

  // Weekly activity — volume per day this week (Mon–Sun).
  const weekData = DAY_LABELS.map((label, i) => {
    const dayStart = weekStart + i * DAY;
    const dayEnd = dayStart + DAY;
    const vol = loadWorkouts
      .filter((w) => w.date >= dayStart && w.date < dayEnd)
      .reduce((s, w) => s + workoutVolume(w), 0);
    return { label, volume: Math.round(vol) };
  });
  const maxDayVolume = Math.max(...weekData.map((d) => d.volume), 0);
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon = 0 … Sun = 6

  // Real week-over-week volume trend (only shown when last week has data).
  const prevWeekStart = weekStart - 7 * DAY;
  const prevWeekVolume = loadWorkouts
    .filter((w) => w.date >= prevWeekStart && w.date < weekStart)
    .reduce((s, w) => s + workoutVolume(w), 0);
  const trendPercent =
    prevWeekVolume > 0
      ? Math.round(((weekVolume - prevWeekVolume) / prevWeekVolume) * 100)
      : null;

  const isResuming = hasDraft;
  const heroEyebrow = isResuming ? "PICK UP WHERE YOU LEFT OFF" : "READY WHEN YOU ARE";
  const heroWords = isResuming ? ["RESUME", "WORKOUT"] : ["START", "WORKOUT"];
  const startButtonLabel = isResuming ? "RESUME WORKOUT" : "START WORKOUT";

  const goalRemaining = Math.max(0, weeklyGoal - weekCount);
  const goalFooter =
    weekCount >= weeklyGoal
      ? "Goal smashed — nice work."
      : `${goalRemaining} to go this week`;

  const recentWorkouts = workouts ? workouts.slice(0, 6) : [];

  async function logRecovery(type: "rest" | "cardio" | "stretching") {
    setRecoveryNote(null);
    try {
      await logCheckin({ type });
      setRecoveryNote("Logged — your streak is safe.");
    } catch {
      setRecoveryNote(null);
    }
  }

  // Hold the dashboard until the user row exists (avoids a "lifter" name flash)
  // and their workouts have loaded.
  if (!me || workouts === undefined) return <HomeSkeleton />;

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <Onboarding
        enabled={!me.onboardedAt && workouts.length === 0}
        defaultUnits={me.units}
        defaultGoal={me.weeklyGoal}
      />

      {prCelebration && prCelebration.prs.length > 0 && (
        <div className="relative overflow-hidden rounded-[14px] border border-spark/40 bg-spark/10 p-4">
          <button
            onClick={() => setPrCelebration(null)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-2 text-spark">
            <Trophy weight="fill" className="size-5" />
            <span className="font-display font-black tracking-tight">
              {prCelebration.prs.length === 1
                ? "New personal record!"
                : `${prCelebration.prs.length} new personal records!`}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 pr-6 text-sm">
            {prCelebration.prs.map((pr) => (
              <li key={`${pr.name}-${pr.type}`}>
                <span className="font-medium">{pr.name}</span> —{" "}
                {pr.type === "reps"
                  ? `${pr.value} reps`
                  : `${pr.value} ${prCelebration.unit}${pr.type === "strength" ? " est. 1RM" : ""}`}{" "}
                <span className="text-muted-foreground">
                  (was {pr.previous})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Greeting (desktop keeps the start button on the right) */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mono-label text-[11px] text-muted-foreground">
            Welcome back
          </p>
          <h2 className="mt-0.5 font-display text-4xl font-black uppercase leading-none tracking-tight">
            {name}
          </h2>
        </div>
        {/* Desktop start button — same hero treatment as mobile, sized down. */}
        <Link
          href="/workout/new"
          aria-label={startButtonLabel}
          className="relative hidden items-center gap-6 overflow-hidden rounded-2xl bg-accent py-4 pl-6 pr-5 text-accent-foreground transition hover:brightness-105 lg:flex"
        >
          <span
            className="pointer-events-none absolute inset-y-0 right-0 w-[60px]"
            style={{
              background:
                "repeating-linear-gradient(-45deg, rgba(10,10,11,.14) 0 8px, transparent 8px 16px)",
            }}
          />
          <span className="relative">
            <span className="mono-label text-[10px] font-semibold opacity-70">
              {heroEyebrow}
            </span>
            <span className="mt-1 block font-display text-2xl font-black italic uppercase leading-none tracking-tight">
              {heroWords[0]} {heroWords[1]}
            </span>
          </span>
          <span className="relative flex size-11 items-center justify-center rounded-full bg-accent-foreground text-accent">
            <Play weight="fill" className="ml-0.5 size-5" />
          </span>
        </Link>
      </div>

      {/* Loud hero CTA — mobile only (desktop uses the greeting-row button) */}
      <Link
        href="/workout/new"
        className="relative flex items-center justify-between overflow-hidden rounded-[20px] bg-accent p-7 text-accent-foreground transition hover:brightness-105 lg:hidden"
      >
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-[70px]"
          style={{
            background:
              "repeating-linear-gradient(-45deg, rgba(10,10,11,.14) 0 8px, transparent 8px 16px)",
          }}
        />
        <span className="relative">
          <span className="mono-label text-[10px] font-semibold opacity-70">
            {heroEyebrow}
          </span>
          <span className="mt-1 block font-display text-3xl font-black italic uppercase leading-none tracking-tight">
            {heroWords[0]}
            <br />
            {heroWords[1]}
          </span>
        </span>
        <span className="relative flex size-14 items-center justify-center rounded-full bg-accent-foreground text-accent">
          <Play weight="fill" className="ml-0.5 size-6" />
        </span>
      </Link>

      {/* Quick start — start a workout from a saved template */}
      {templates !== undefined && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className={sectionLabelStyles}>Quick start</p>
            {templates.length > 0 && (
              <Link
                href="/templates"
                className="font-mono text-[11px] text-accent hover:underline"
              >
                Manage
              </Link>
            )}
          </div>

          {templates.length > 0 ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {templates.map((template) => (
                <Link
                  key={template._id}
                  href={`/workout/new?template=${template._id}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-[14px] border border-border bg-card px-3.5 py-3 transition-colors hover:border-accent/40"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Play weight="fill" className="ml-0.5 size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-[10rem] truncate font-display text-sm font-extrabold uppercase tracking-tight">
                      {template.name}
                    </span>
                    <span className="mono-label text-[9px] text-muted-foreground">
                      {template.exercises.length}{" "}
                      {template.exercises.length === 1 ? "EXERCISE" : "EXERCISES"}
                    </span>
                  </span>
                </Link>
              ))}
              {templates.length < 5 && (
                <Link
                  href="/templates/new"
                  aria-label="New template"
                  className="flex shrink-0 items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border-strong px-4 text-accent transition-colors hover:border-accent hover:bg-accent/5"
                >
                  <Plus weight="bold" className="size-4" />
                  <span className="mono-label text-[11px]">NEW</span>
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/templates/new"
              className="flex items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-dashed border-border-strong px-4 py-3.5 transition-colors hover:border-accent hover:bg-accent/5"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Create a quick-start template
                </span>
                <span className="mono-label text-[10px] text-muted-foreground">
                  Save your go-to days to start in one tap
                </span>
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Plus weight="bold" className="size-4" />
              </span>
            </Link>
          )}
        </section>
      )}

      {/* This week — scoreboard stats */}
      <section className="flex flex-col gap-2">
        <p className={`${sectionLabelStyles} lg:hidden`}>This week</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Workouts"
            value={<CountUp value={weekCount} />}
            unit={`/ ${weeklyGoal}`}
            icon={<Barbell weight="bold" className="size-3" />}
          />
          <StatCard
            label="Volume"
            value={
              <CountUp
                value={weekVolume}
                format={(n) => (n / 1000).toFixed(1)}
              />
            }
            unit={`K ${unit}`}
            icon={<ChartBar weight="bold" className="size-3" />}
          />
          <StatCard
            label="Time"
            value={
              <CountUp value={weekTime} format={(n) => (n / 3600).toFixed(1)} />
            }
            unit="h"
            icon={<Timer weight="bold" className="size-3" />}
          />
          <StatCard
            label="Streak"
            value={<CountUp value={streak} />}
            unit={streak === 1 ? "day" : "days"}
            icon={<Flame weight="fill" className="size-3" />}
            variant="spark"
          />
        </div>
      </section>

      {/* Weekly volume chart + (desktop) goal ring */}
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className={`${cardStyles} p-4 lg:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="mono-label text-[10px] text-muted-foreground">
              Weekly volume
            </span>
            {trendPercent !== null && (
              <span
                className={`font-mono text-[10px] ${
                  trendPercent >= 0 ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {trendPercent >= 0 ? "+" : ""}
                {trendPercent}% {trendPercent >= 0 ? "▲" : "▼"}
              </span>
            )}
          </div>

          <div className="flex h-[66px] items-end gap-2 lg:h-[150px] lg:gap-3.5">
            {weekData.map((day, i) => {
              const isPeak = day.volume > 0 && day.volume === maxDayVolume;
              const heightPercent =
                maxDayVolume > 0
                  ? Math.max((day.volume / maxDayVolume) * 100, day.volume > 0 ? 8 : 4)
                  : 4;
              const barColor = isPeak
                ? "bg-accent"
                : day.volume > 0
                  ? "bg-[#2a2a30]"
                  : "bg-muted";
              return (
                <span
                  key={day.label}
                  className={`flex-1 rounded-t ${barColor}`}
                  style={{ height: `${heightPercent}%` }}
                />
              );
            })}
          </div>

          <div className="mt-2 flex gap-2 lg:gap-3.5">
            {DAY_INITIALS.map((initial, i) => {
              const isPeak =
                weekData[i].volume > 0 && weekData[i].volume === maxDayVolume;
              const isHighlighted = i === todayIndex || isPeak;
              return (
                <span
                  key={i}
                  className={`flex-1 text-center font-mono text-[9px] lg:text-[10px] ${
                    isHighlighted ? "text-accent" : "text-dim"
                  }`}
                >
                  {initial}
                </span>
              );
            })}
          </div>
        </section>

        {/* Weekly goal ring — desktop only (mobile shows it via the stat card) */}
        <section
          className={`${cardStyles} hidden flex-col items-center justify-center gap-3.5 p-5 lg:flex`}
        >
          <span className="mono-label flex w-full items-center gap-2 text-[11px] text-muted-foreground">
            <Target weight="bold" className="size-3.5 text-accent" />
            Weekly goal
          </span>
          <ProgressRing
            value={weekCount}
            max={weeklyGoal}
            label={
              <>
                {weekCount}
                <span className="text-dim">/{weeklyGoal}</span>
              </>
            }
            sublabel="WORKOUTS"
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {goalFooter}
          </span>
        </section>
      </div>

      {/* Body + recovery */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className={activeToday ? "lg:col-span-3" : "lg:col-span-2"}>
          <BodyDiagram
            weight={latestBody?.weight ?? null}
            unit={unit}
            measurements={latestBody?.measurements ?? null}
          />
        </div>
        {!activeToday && (
          <section className={`${cardStyles} flex flex-col gap-3 p-5`}>
            <div>
              <h2 className="mono-label flex items-center gap-2 text-[11px] text-spark-lite">
                <Flame weight="fill" className="size-3.5 text-spark" />
                Keep your streak
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Not lifting today? Log active recovery so your streak stays alive.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  { type: "rest", label: "Rest day" },
                  { type: "cardio", label: "Cardio" },
                  { type: "stretching", label: "Stretching" },
                ] as const
              ).map((recovery) => (
                <button
                  key={recovery.type}
                  onClick={() => logRecovery(recovery.type)}
                  className="rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:bg-accent/5"
                >
                  {recovery.label}
                </button>
              ))}
            </div>
            {recoveryNote && (
              <p className="text-xs font-medium text-accent">{recoveryNote}</p>
            )}
          </section>
        )}
      </div>

      {/* Recent workouts */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className={sectionLabelStyles}>Recent</p>
          {recentWorkouts.length > 0 && (
            <Link
              href="/history"
              className="font-mono text-[11px] text-accent hover:underline"
            >
              See all
            </Link>
          )}
        </div>

        {recentWorkouts.length > 0 ? (
          <ul className="grid gap-2 lg:grid-cols-2">
            {recentWorkouts.map((w, index) => {
              const isMostRecent = index === 0;
              const exerciseNames = w.exercises
                .map((e) => e.name)
                .join(" · ");
              return (
                <li key={w._id} className="min-w-0">
                  <Link
                    href={`/workout/${w._id}`}
                    className={`flex items-center gap-3.5 rounded-[12px] border border-border bg-card px-4 py-3.5 transition-colors hover:border-border-strong`}
                  >
                    <span
                      className={`w-[3px] self-stretch rounded-full ${
                        isMostRecent ? "bg-accent" : "bg-[#2a2a30]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-extrabold">
                        {w.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {exerciseNames}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[11px] text-bright">
                        {fmtWeekday(w.date)}
                      </span>
                      {w.durationSec ? (
                        <span className="font-mono text-[10px] text-dim">
                          {fmtTime(w.durationSec)}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[14px] border border-dashed border-border p-6 text-center text-muted-foreground">
            No workouts yet. Tap{" "}
            <span className="font-medium text-foreground">Start workout</span> to
            log your first one.
          </div>
        )}
      </section>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="container-page flex animate-pulse flex-col gap-6 py-8">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-9 w-44 rounded-lg bg-muted" />
        </div>
        <div className="hidden h-12 w-44 rounded-[13px] bg-muted lg:block" />
      </div>

      {/* Mobile hero */}
      <div className="h-28 rounded-[20px] bg-muted lg:hidden" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[14px] border border-border bg-card" />
        ))}
      </div>

      {/* Chart + goal ring */}
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-40 rounded-[14px] border border-border bg-card" />
        <div className="hidden h-40 rounded-[14px] border border-border bg-card lg:block" />
      </div>

      {/* Body + recovery */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="h-56 rounded-[14px] border border-border bg-card lg:col-span-2" />
        <div className="h-56 rounded-[14px] border border-border bg-card" />
      </div>

      {/* Recent */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[12px] border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
