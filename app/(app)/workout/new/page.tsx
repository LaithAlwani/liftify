"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Minus,
  Trash,
  X,
  Check,
  CaretDown,
  CaretLeft,
  Pause,
  Play,
  Barbell,
  Info,
  PencilSimple,
  Trophy,
  Lightning,
  FlagCheckered,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PlateCalculator } from "@/components/plate-calculator";
import { ExercisePicker } from "@/components/exercise-picker";
import { ExerciseDetailModal } from "@/components/exercise-detail-modal";
import { bestsByExercise, detectPRs, withBodyweight } from "@/lib/prs";
import { useRest } from "@/components/rest-timer";

type SetRow = { id: string; reps: string; weight: string; done?: boolean };
type Entry = { id: string; name: string; sets: SetRow[] };
// Session clock: `base` ms already counted, plus the live segment since
// `runningSince` (null while paused). Elapsed = base + (now - runningSince).
type SessionTimer = { base: number; runningSince: number | null };

const DRAFT_KEY = "liftify:draft-workout";
const TIMER_KEY = "liftify:session-timer";

let counter = 0;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r${counter++}`;
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s));
const round1 = (n: number) => Math.round(n * 10) / 10;

function fmtDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const REST_DEFAULT = 90; // seconds

// The steel diagonal-hatch tile used behind an exercise with no image.
const tileGradientStyle = {
  background: "repeating-linear-gradient(45deg,#1c1c22 0 6px,#17171b 6px 12px)",
};

// Repeated Tailwind class strings, pulled out so they stay easy to tweak.
const collapsedRowStyles =
  "scroll-mt-24 flex items-center gap-3 rounded-[14px] border border-border bg-card p-4";
const activeCardStyles =
  "scroll-mt-24 overflow-hidden rounded-2xl border border-border-strong bg-card";
const stepperStyles =
  "flex min-w-0 flex-1 items-center justify-between rounded-[10px] border border-border-strong bg-card p-1";
const stepperButtonStyles =
  "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-bright transition-[filter] hover:brightness-125";
const stepperInputStyles =
  "min-w-0 flex-1 bg-transparent text-center font-display text-2xl font-black tabular-nums focus:outline-none";
const finishBarStyles =
  "flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-accent px-4 py-4 " +
  "font-display text-lg font-black italic tracking-tight text-accent-foreground " +
  "transition-[filter] hover:brightness-105 disabled:pointer-events-none disabled:opacity-50";
const dashedAddStyles =
  "flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed " +
  "border-border-strong px-4 py-4 text-accent transition-colors hover:border-accent hover:bg-accent/5";

export default function Page() {
  return (
    <Suspense fallback={<div className="container-page py-8" />}>
      <LogWorkout />
    </Suspense>
  );
}

function LogWorkout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const repeatId = searchParams.get("repeat");
  const templateId = searchParams.get("template");
  const isEditing = !!editId;
  const loadId = editId ?? repeatId;

  const me = useQuery(api.users.me, {});
  const allExercises = useQuery(api.exercises.list, {});
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const [detailId, setDetailId] = useState<Id<"exercises"> | null>(null);
  const history = useQuery(api.workouts.listForUser, { limit: 100 });
  const existingWorkout = useQuery(
    api.workouts.getById,
    loadId ? { workoutId: loadId as Id<"workouts"> } : "skip",
  );
  // Starting a workout from a template — prefills like "repeat" but the source
  // is a template, and the template itself is left untouched.
  const startTemplate = useQuery(
    api.templates.getById,
    templateId ? { templateId: templateId as Id<"templates"> } : "skip",
  );
  const create = useMutation(api.workouts.create);
  const update = useMutation(api.workouts.update);

  const [name, setName] = useState("Workout");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishPrompt, setFinishPrompt] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  // Which exercise cards are expanded. Adding an exercise collapses the rest.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<SessionTimer | null>(null);
  const [tick, setTick] = useState(0);
  const rest = useRest();

  const unit = me?.units ?? "lb";

  // Persist the in-progress NEW workout so leaving and returning keeps it.
  // (Edit mode loads from the saved workout instead — no draft.)
  const loaded = useRef(false);
  useEffect(() => {
    if (isEditing || repeatId || templateId) {
      loaded.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { name?: string; entries?: Entry[] };
        if (draft.name) setName(draft.name);
        if (Array.isArray(draft.entries)) setEntries(draft.entries);
      }
    } catch {
      /* ignore corrupt draft */
    }
    // Resume a previously-running (or paused) clock, else start a fresh one.
    let restored: SessionTimer | null = null;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const t = JSON.parse(raw);
        if (t && typeof t.base === "number") {
          restored = {
            base: t.base,
            runningSince:
              typeof t.runningSince === "number" ? t.runningSince : null,
          };
        }
      }
    } catch {
      /* ignore */
    }
    // Only resume a clock the user already started — otherwise the session
    // hasn't begun yet (they tap "Start workout" to start the timer).
    if (restored) setTimer(restored);
    loaded.current = true;
  }, [isEditing, repeatId]);

  // Persist the session clock so it survives navigation and reloads.
  useEffect(() => {
    if (timer === null) return;
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      /* ignore */
    }
  }, [timer]);
  useEffect(() => {
    if (!loaded.current || isEditing) return;
    try {
      if (entries.length === 0) localStorage.removeItem(DRAFT_KEY);
      else
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, entries }));
    } catch {
      /* storage full / unavailable */
    }
  }, [name, entries, isEditing]);

  // Edit mode: prefill the form from the saved workout, once.
  const editLoaded = useRef(false);
  useEffect(() => {
    if (!isEditing || editLoaded.current || !existingWorkout) return;
    setName(existingWorkout.name);
    setEntries(
      existingWorkout.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid(),
          reps: String(s.reps),
          weight: String(s.weight),
          done: true,
        })),
      })),
    );
    editLoaded.current = true;
  }, [isEditing, existingWorkout]);

  // Repeat mode: prefill from a past workout as a brand-new session.
  const repeatLoaded = useRef(false);
  useEffect(() => {
    if (!repeatId || isEditing || repeatLoaded.current || !existingWorkout) {
      return;
    }
    setName(existingWorkout.name);
    setEntries(
      existingWorkout.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid(),
          reps: String(s.reps),
          weight: String(s.weight),
        })),
      })),
    );
    repeatLoaded.current = true;
  }, [repeatId, isEditing, existingWorkout]);

  // Template mode: prefill from a template as a brand-new session. Same as repeat
  // (sets start unchecked); the template's target reps/weight seed each set.
  const templateLoaded = useRef(false);
  useEffect(() => {
    if (!templateId || templateLoaded.current || !startTemplate) return;
    setName(startTemplate.name);
    setEntries(
      startTemplate.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid(),
          reps: String(s.reps),
          // A 0 target weight means "fill it in live" — leave the field blank.
          weight: s.weight > 0 ? String(s.weight) : "",
        })),
      })),
    );
    templateLoaded.current = true;
  }, [templateId, startTemplate]);

  // Overall session clock: tick every second while it's running (not paused).
  const running = timer !== null && timer.runningSince !== null;
  const paused = timer !== null && timer.runningSince === null;
  useEffect(() => {
    if (!running) return;
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const elapsedMs =
    timer === null
      ? null
      : timer.base +
        (timer.runningSince !== null
          ? Math.max(0, tick - timer.runningSince)
          : 0);
  const elapsedSec = elapsedMs === null ? null : Math.floor(elapsedMs / 1000);
  const started = timer !== null; // the session clock has been started

  function startWorkout() {
    // Can't start an empty session — nudge the user to add an exercise first.
    if (entries.length === 0) {
      setError("Add at least one exercise before you start the workout.");
      return;
    }
    setError(null);
    setTimer({ base: 0, runningSince: Date.now() });
    // Open the first exercise's sets and scroll to it.
    const first = entries[0];
    if (first) {
      setExpanded(new Set([first.id]));
      setScrollTarget(first.id);
    }
  }
  function pauseTimer() {
    setTimer((t) =>
      t && t.runningSince !== null
        ? { base: t.base + (Date.now() - t.runningSince), runningSince: null }
        : t,
    );
  }
  function resumeTimer() {
    setTimer((t) =>
      t && t.runningSince === null ? { ...t, runningSince: Date.now() } : t,
    );
  }

  // All-time heaviest weight per exercise, to show a +/- delta vs your best.
  const bestByExercise = useMemo(() => {
    const map = new Map<string, number>();
    if (!history) return map;
    for (const w of history) {
      for (const ex of w.exercises) {
        const weights = ex.sets.map((s) => s.weight).filter((x) => x > 0);
        if (!weights.length) continue;
        const key = ex.name.toLowerCase();
        const localMax = Math.max(...weights);
        const prev = map.get(key);
        if (prev === undefined || localMax > prev) map.set(key, localMax);
      }
    }
    return map;
  }, [history]);

  // Names of bodyweight-based moves + the lifter's effective body weight, for
  // folding total load into PR detection.
  const bodyweightNames = useMemo(
    () =>
      new Set(
        (allExercises ?? [])
          .filter((e) => e.equipment === "body only" && e.mechanic === "compound")
          .map((e) => e.name.toLowerCase()),
      ),
    [allExercises],
  );
  const effBodyWeight = latestBodyWeight ?? me?.bodyWeight ?? 0;

  // Look up an exercise's thumbnail / detail / tags by name, for the added cards.
  const exerciseByName = useMemo(() => {
    const m = new Map<
      string,
      {
        id: Id<"exercises">;
        image?: string;
        hasDetail: boolean;
        muscleGroup?: string;
        equipment?: string;
      }
    >();
    for (const e of allExercises ?? []) {
      m.set(e.name.toLowerCase(), {
        id: e._id,
        image: e.image,
        hasDetail: e.hasDetail,
        muscleGroup: e.muscleGroup ?? undefined,
        equipment: e.equipment ?? undefined,
      });
    }
    return m;
  }, [allExercises]);

  // Scroll to (and focus) the exercise that was just added.
  useEffect(() => {
    if (!scrollTarget) return;
    const el = document.getElementById(`ex-${scrollTarget}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector("input")?.focus({ preventScroll: true });
    }
    setScrollTarget(null);
  }, [scrollTarget]);

  function addExercise(exName: string) {
    setError(null); // clear the "add an exercise" note once they add one
    const existing = entries.find(
      (e) => e.name.toLowerCase() === exName.toLowerCase(),
    );
    if (existing) {
      if (started) setExpanded(new Set([existing.id]));
      setScrollTarget(existing.id);
      return;
    }
    const id = uid();
    // Pre-fill the first set's weight with your best for this exercise, if known.
    const best = bestByExercise.get(exName.toLowerCase());
    const weight = best !== undefined ? String(round1(best)) : "";
    setEntries((prev) => [
      ...prev,
      { id, name: exName, sets: [{ id: uid(), reps: "", weight, done: false }] },
    ]);
    // Before the workout starts, cards stay collapsed (planning only).
    if (started) setExpanded(new Set([id]));
    setScrollTarget(id);
  }
  function toggleExpanded(id: string) {
    if (!started) return; // can't open sets until the workout is started
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function removeExercise(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }
  function addSet(entryId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const last = e.sets[e.sets.length - 1];
        const next: SetRow = {
          id: uid(),
          reps: last?.reps ?? "",
          weight: last?.weight ?? "",
          done: false,
        };
        return { ...e, sets: [...e.sets, next] };
      }),
    );
  }
  // A set can be finished once it has reps. Weight may be 0 (bodyweight moves).
  const canFinishSet = (s: SetRow) => toNum(s.reps) > 0;
  // Mark a set complete/incomplete; completing one kicks off the rest timer.
  function setSetDone(entryId: string, setId: string, done: boolean) {
    if (done) {
      const set = entries
        .find((e) => e.id === entryId)
        ?.sets.find((s) => s.id === setId);
      if (!set || !canFinishSet(set)) return; // ignore — needs reps & weight
    }
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, done } : s)),
            },
      ),
    );
    if (done) rest.start(me?.restSeconds ?? REST_DEFAULT);
  }
  function updateSet(entryId: string, setId: string, patch: Partial<SetRow>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    );
  }
  function removeSet(entryId: string, setId: string) {
    setEntries((prev) =>
      prev.flatMap((e) => {
        if (e.id !== entryId) return [e];
        const sets = e.sets.filter((s) => s.id !== setId);
        return sets.length === 0 ? [] : [{ ...e, sets }];
      }),
    );
  }

  // Throw the whole session away — clear the draft + clock and head home.
  function discard() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(TIMER_KEY);
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  function requestFinish() {
    setError(null);
    if (entries.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    // Don't let an in-progress set slip into history unfinished.
    if (entries.some((e) => e.sets.some((s) => !s.done))) {
      setFinishPrompt(true);
      return;
    }
    setConfirmOpen(true);
  }

  // Mark every still-open set complete (those with reps & weight), then move on
  // to the finish-workout confirmation.
  function finishPendingSets() {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.done || !canFinishSet(s) ? s : { ...s, done: true },
        ),
      })),
    );
    setFinishPrompt(false);
    setConfirmOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const exercises = entries.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({
        reps: toNum(s.reps),
        weight: toNum(s.weight),
      })),
    }));
    const durationSec = elapsedSec ?? undefined;
    try {
      if (isEditing && editId) {
        await update({ workoutId: editId as Id<"workouts">, name, exercises });
      } else {
        // Detect PRs vs prior history (with body weight folded into bodyweight
        // moves), then hand off to the home celebration.
        try {
          const priorLoaded = withBodyweight(
            history ?? [],
            bodyweightNames,
            effBodyWeight,
          );
          const nowLoaded = withBodyweight(
            [{ date: 0, exercises }],
            bodyweightNames,
            effBodyWeight,
          )[0].exercises;
          const prs = detectPRs(nowLoaded, bestsByExercise(priorLoaded));
          if (prs.length > 0) {
            localStorage.setItem(
              "liftify:new-prs",
              JSON.stringify({ unit, prs }),
            );
          }
        } catch {
          /* PR detection is best-effort */
        }
        await create({ name, durationSec, exercises });
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(TIMER_KEY);
      } catch {
        /* ignore */
      }
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save workout.");
      setSaving(false);
    }
  }

  // Exercises with an unfinished set, for the "finish your set" prompt.
  const pendingEntries = entries.filter((e) => e.sets.some((s) => !s.done));
  const pendingNames = pendingEntries.map((e) => e.name);
  const pendingNeedsData = pendingEntries.some((e) =>
    e.sets.some((s) => !s.done && !canFinishSet(s)),
  );

  // Live session stats for the header sub-line and desktop session rail.
  const exerciseCount = entries.length;
  const setsDoneCount = entries.reduce(
    (total, entry) => total + entry.sets.filter((s) => s.done).length,
    0,
  );
  const sessionVolume = entries.reduce(
    (total, entry) =>
      total +
      entry.sets.reduce(
        (n, s) => (s.done ? n + toNum(s.reps) * toNum(s.weight) : n),
        0,
      ),
    0,
  );
  // Live PR count: exercises whose best done set beats their all-time best.
  const newPrCount = entries.reduce((count, entry) => {
    const best = bestByExercise.get(entry.name.toLowerCase());
    if (best === undefined) return count;
    const doneWeights = entry.sets
      .filter((s) => s.done)
      .map((s) => toNum(s.weight));
    const bestDone = doneWeights.length ? Math.max(...doneWeights) : 0;
    return bestDone > best ? count + 1 : count;
  }, 0);

  // Weight the ± stepper nudges by unit (5 lb / 2.5 kg per tap).
  const weightStep = unit === "kg" ? 2.5 : 5;
  function stepReps(entryId: string, s: SetRow, delta: number) {
    const next = Math.max(0, toNum(s.reps) + delta);
    updateSet(entryId, s.id, { reps: String(next) });
  }
  function stepWeight(entryId: string, s: SetRow, delta: number) {
    const next = Math.max(0, round1(toNum(s.weight) + delta));
    updateSet(entryId, s.id, { weight: String(next) });
  }
  // Copy the previous set's reps/weight into this set (the "repeat last" pill).
  function repeatLastSet(entry: Entry, index: number) {
    const previous = entry.sets[index - 1];
    if (!previous) return;
    updateSet(entry.id, entry.sets[index].id, {
      reps: previous.reps,
      weight: previous.weight,
    });
  }

  const displayName = name.trim() || "Workout";
  const sessionSubline = `${exerciseCount} ${
    exerciseCount === 1 ? "EXERCISE" : "EXERCISES"
  } · ${setsDoneCount} ${setsDoneCount === 1 ? "SET" : "SETS"} DONE`;

  // Primary action switches per mode: edit → save, not started → start, else finish.
  const primaryLabel = isEditing
    ? "SAVE WORKOUT"
    : !started
      ? "START WORKOUT"
      : "FINISH WORKOUT";
  const PrimaryIcon = isEditing ? Check : !started ? Play : FlagCheckered;
  const primaryAction = isEditing
    ? requestFinish
    : !started
      ? startWorkout
      : requestFinish;
  const primaryDisabled = isEditing
    ? saving || entries.length === 0
    : !started
      ? entries.length === 0
      : saving || entries.length === 0;
  // Before the session starts (new workout only), the primary action uses the
  // loud "hero" CTA — same treatment as the home page start button.
  const showStartHero = !isEditing && !started;

  // Names already in this workout — drives the ✓ vs + affordance in the picker.
  const addedNames = new Set(entries.map((entry) => entry.name));

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* EXERCISES COLUMN */}
      <div className="flex flex-1 flex-col px-5 py-6 sm:px-8 md:border-r md:border-border">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {/* Session header: back + editable name + live clock (mobile) */}
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                aria-label="Back to home"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <CaretLeft weight="bold" className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Workout name"
                    className="min-w-0 flex-1 bg-transparent font-display text-2xl font-black uppercase tracking-tight focus:outline-none"
                  />
                  <PencilSimple className="size-4 shrink-0 text-dim" />
                </div>
                <p className="mono-label text-[10px] text-muted-foreground">
                  {sessionSubline}
                </p>
              </div>
            </div>

            {/* Mobile-only clock pill + plate calc (desktop uses the rail) */}
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {elapsedSec !== null && (
                <button
                  type="button"
                  onClick={paused ? resumeTimer : pauseTimer}
                  aria-label={paused ? "Resume session timer" : "Pause session timer"}
                  title={paused ? "Resume timer" : "Pause timer"}
                  className="flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-2"
                >
                  <span
                    className={`size-2 rounded-full bg-accent ${
                      running ? "animate-pulse-dot" : ""
                    }`}
                  />
                  <span className="font-mono text-base font-semibold tabular-nums text-accent">
                    {fmtDuration(elapsedSec)}
                  </span>
                  {paused ? (
                    <Play weight="fill" className="size-3.5 text-accent" />
                  ) : (
                    <Pause weight="fill" className="size-3.5 text-accent" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPlateOpen(true)}
                aria-label="Plate calculator"
                title="Plate calculator"
                className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Barbell weight="bold" className="size-5" />
              </button>
            </div>
          </header>

      <PlateCalculator
        open={plateOpen}
        unit={unit}
        onClose={() => setPlateOpen(false)}
      />

          {/* Current workout */}
          {entries.length > 0 && (
            <section className="flex flex-col gap-3">
              {entries.map((entry) => {
                const best = bestByExercise.get(entry.name.toLowerCase());
                const meta = exerciseByName.get(entry.name.toLowerCase());
                const isOpen = expanded.has(entry.id);
                const setCount = entry.sets.length;
                const doneCount = entry.sets.filter((s) => s.done).length;
                const totalReps = entry.sets.reduce(
                  (n, s) => n + toNum(s.reps),
                  0,
                );
                const tagLine = [meta?.equipment, meta?.muscleGroup]
                  .filter(Boolean)
                  .join(" · ")
                  .toUpperCase();

                // Before the workout starts, cards are compact planning rows
                // with a remove button (sets can't be opened yet).
                if (!started) {
                  return (
                    <div
                      key={entry.id}
                      id={`ex-${entry.id}`}
                      className={collapsedRowStyles}
                    >
                      <ExerciseThumb image={meta?.image} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[15px] font-extrabold">
                          {entry.name}
                        </span>
                        {tagLine && (
                          <span className="mono-label text-[10px] text-muted-foreground">
                            {tagLine}
                          </span>
                        )}
                      </span>
                      {meta?.hasDetail && (
                        <HowToButton
                          name={entry.name}
                          onClick={() => setDetailId(meta.id)}
                        />
                      )}
                      <IconButton
                        variant="danger"
                        onClick={() => removeExercise(entry.id)}
                        aria-label={`Remove ${entry.name}`}
                        title="Remove exercise"
                      >
                        <Trash className="size-4" />
                      </IconButton>
                    </div>
                  );
                }

                // Started but collapsed: compact steel row with a summary.
                if (!isOpen) {
                  return (
                    <div
                      key={entry.id}
                      id={`ex-${entry.id}`}
                      className={collapsedRowStyles}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(entry.id)}
                        aria-expanded={false}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <ExerciseThumb image={meta?.image} size="sm" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-display text-[15px] font-extrabold">
                            {entry.name}
                          </span>
                          <span className="mono-label text-[10px] text-muted-foreground">
                            {setCount} {setCount === 1 ? "SET" : "SETS"} ·{" "}
                            {doneCount === setCount
                              ? `${totalReps} REPS`
                              : "UP NEXT"}
                          </span>
                        </span>
                      </button>
                      {meta?.hasDetail && (
                        <HowToButton
                          name={entry.name}
                          onClick={() => setDetailId(meta.id)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(entry.id)}
                        aria-label="Expand exercise"
                        aria-expanded={false}
                        className="shrink-0 text-dim transition-colors hover:text-foreground"
                      >
                        <CaretDown weight="bold" className="size-5" />
                      </button>
                    </div>
                  );
                }

                // Started + expanded: the full active card with steppers.
                return (
                  <div
                    key={entry.id}
                    id={`ex-${entry.id}`}
                    className={activeCardStyles}
                  >
                    <div className="flex items-center gap-3 border-b border-muted p-4">
                      <ExerciseThumb image={meta?.image} size="lg" />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(entry.id)}
                        aria-expanded
                        className="flex min-w-0 flex-1 flex-col text-left"
                      >
                        <span className="truncate font-display text-[17px] font-extrabold">
                          {entry.name}
                        </span>
                        {tagLine && (
                          <span className="mono-label text-[10px] text-muted-foreground">
                            {tagLine}
                          </span>
                        )}
                      </button>
                      {best !== undefined && (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-spark/40 bg-spark/10 px-2 py-1">
                          <Trophy weight="fill" className="size-3 text-spark" />
                          <span className="mono-label text-[10px] text-spark-lite">
                            BEST {round1(best)}
                          </span>
                        </span>
                      )}
                      {meta?.hasDetail && (
                        <HowToButton
                          name={entry.name}
                          onClick={() => setDetailId(meta.id)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(entry.id)}
                        aria-label="Collapse exercise"
                        aria-expanded
                        className="shrink-0 text-dim transition-colors hover:text-foreground"
                      >
                        <CaretDown
                          weight="bold"
                          className="size-5 rotate-180"
                        />
                      </button>
                    </div>

                    {/* Column head */}
                    <div className="flex items-center gap-3 px-4 pb-1.5 pt-3">
                      <span className="mono-label w-7 text-[9px] text-dim">
                        SET
                      </span>
                      <span className="mono-label flex-1 text-center text-[9px] text-dim">
                        REPS
                      </span>
                      <span className="mono-label flex-1 text-center text-[9px] text-dim">
                        WEIGHT
                      </span>
                      <span className="mono-label w-9 text-right text-[9px] text-dim">
                        DONE
                      </span>
                    </div>

                    {/* Sets: done rows are dimmed; open sets get stepper panels */}
                    {entry.sets.map((s, i) => {
                      if (s.done) {
                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 px-4 py-1.5 opacity-55"
                          >
                            <span className="w-7 text-center font-display text-sm font-extrabold text-muted-foreground">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-center font-display text-lg font-extrabold tabular-nums">
                              {s.reps || 0}
                            </span>
                            <span className="flex-1 text-center font-display text-lg font-extrabold tabular-nums">
                              {s.weight || 0}
                              <span className="font-mono text-[10px] font-normal text-muted-foreground">
                                {" "}
                                {unit}
                              </span>
                            </span>
                            <span className="flex w-9 justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setSetDone(entry.id, s.id, false)
                                }
                                aria-label={`Mark set ${i + 1} incomplete`}
                                className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                              >
                                <Check weight="bold" className="size-4" />
                              </button>
                            </span>
                          </div>
                        );
                      }

                      const delta =
                        best !== undefined && s.weight.trim() !== ""
                          ? toNum(s.weight) - best
                          : null;
                      const previous = i > 0 ? entry.sets[i - 1] : null;
                      const hasPrevData =
                        !!previous &&
                        (previous.reps.trim() !== "" ||
                          previous.weight.trim() !== "");

                      return (
                        <div
                          key={s.id}
                          className="mx-3 mb-3 rounded-xl border border-accent bg-surface-3 p-3 shadow-[0_0_0_3px_rgba(215,242,74,0.1)]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-7 text-center font-display text-base font-black text-accent">
                              {i + 1}
                            </span>
                            {/* Reps ± stepper */}
                            <div className={stepperStyles}>
                              <button
                                type="button"
                                onClick={() => stepReps(entry.id, s, -1)}
                                aria-label={`Decrease set ${i + 1} reps`}
                                className={stepperButtonStyles}
                              >
                                <Minus weight="bold" className="size-3.5" />
                              </button>
                              <input
                                inputMode="numeric"
                                placeholder="0"
                                value={s.reps}
                                onChange={(e) =>
                                  updateSet(entry.id, s.id, {
                                    reps: e.target.value,
                                  })
                                }
                                aria-label={`Set ${i + 1} reps`}
                                className={stepperInputStyles}
                              />
                              <button
                                type="button"
                                onClick={() => stepReps(entry.id, s, 1)}
                                aria-label={`Increase set ${i + 1} reps`}
                                className={stepperButtonStyles}
                              >
                                <Plus weight="bold" className="size-3.5" />
                              </button>
                            </div>
                            {/* Weight ± stepper */}
                            <div className={stepperStyles}>
                              <button
                                type="button"
                                onClick={() =>
                                  stepWeight(entry.id, s, -weightStep)
                                }
                                aria-label={`Decrease set ${i + 1} weight`}
                                className={stepperButtonStyles}
                              >
                                <Minus weight="bold" className="size-3.5" />
                              </button>
                              <input
                                inputMode="decimal"
                                placeholder="0"
                                value={s.weight}
                                onChange={(e) =>
                                  updateSet(entry.id, s.id, {
                                    weight: e.target.value,
                                  })
                                }
                                aria-label={`Set ${i + 1} weight`}
                                className={stepperInputStyles}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  stepWeight(entry.id, s, weightStep)
                                }
                                aria-label={`Increase set ${i + 1} weight`}
                                className={stepperButtonStyles}
                              >
                                <Plus weight="bold" className="size-3.5" />
                              </button>
                            </div>
                            {/* DONE check */}
                            <span className="flex w-9 justify-end">
                              <button
                                type="button"
                                onClick={() => setSetDone(entry.id, s.id, true)}
                                disabled={!canFinishSet(s)}
                                title={
                                  canFinishSet(s) ? undefined : "Enter reps first"
                                }
                                aria-label={`Mark set ${i + 1} complete`}
                                className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-border-strong text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-dim"
                              >
                                <Check weight="bold" className="size-4" />
                              </button>
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            {hasPrevData && previous ? (
                              <button
                                type="button"
                                onClick={() => repeatLastSet(entry, i)}
                                className="mono-label flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-[10px] text-bright transition-[filter] hover:brightness-125"
                              >
                                <ArrowCounterClockwise
                                  weight="bold"
                                  className="size-3"
                                />
                                REPEAT LAST · {toNum(previous.reps)}×
                                {toNum(previous.weight)}
                              </button>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center gap-2">
                              <VsBestChip delta={delta} />
                              {setCount > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(entry.id, s.id)}
                                  aria-label={`Remove set ${i + 1}`}
                                  className="flex size-7 items-center justify-center rounded-lg text-dim transition-colors hover:bg-muted hover:text-red-500"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Card footer: remove exercise + add set */}
                    <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-1">
                      <button
                        type="button"
                        onClick={() => removeExercise(entry.id)}
                        aria-label={`Remove ${entry.name}`}
                        title="Remove exercise"
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash weight="bold" className="size-4" />
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => addSet(entry.id)}
                        className="mono-label flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-[11px] text-accent transition-colors hover:bg-accent/10"
                      >
                        <Plus weight="bold" className="size-3.5" />
                        ADD SET
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Add exercise — opens the library picker */}
          <button onClick={() => setPickerOpen(true)} className={dashedAddStyles}>
            <Plus weight="bold" className="size-4" />
            <span className="mono-label text-xs">ADD EXERCISE</span>
          </button>

          {/* Mobile action bar: primary action + discard (desktop uses rail) */}
          <div className="mt-2 flex flex-col gap-3 md:hidden">
            {showStartHero ? (
              // Kept clickable even with no exercises, so the tap surfaces the
              // "add at least one exercise" note instead of doing nothing.
              <StartWorkoutHero onClick={startWorkout} size="mobile" />
            ) : (
              <button
                type="button"
                onClick={primaryAction}
                disabled={primaryDisabled}
                className={finishBarStyles}
              >
                <PrimaryIcon
                  weight={PrimaryIcon === Play ? "fill" : "bold"}
                  className="size-5"
                />
                {primaryLabel}
              </button>
            )}
            {/* Discard only appears once the session has started. */}
            {!isEditing && started && (
              <button
                type="button"
                onClick={() => setDiscardOpen(true)}
                disabled={saving}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash weight="bold" className="size-4" />
                Discard workout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SESSION RAIL — desktop only */}
      <aside className="hidden w-[250px] shrink-0 flex-col gap-4 bg-surface-2 px-5 py-6 md:flex">
        <button
          type="button"
          onClick={started ? (paused ? resumeTimer : pauseTimer) : undefined}
          disabled={!started}
          title={
            !started
              ? "Start the workout to run the clock"
              : paused
                ? "Resume timer"
                : "Pause timer"
          }
          className="rounded-[14px] border border-border-strong bg-card px-4 py-5 text-center transition-colors enabled:hover:bg-muted"
        >
          <span className="mb-2 flex items-center justify-center gap-2">
            <span
              className={`size-2 rounded-full ${
                running
                  ? "animate-pulse-dot bg-accent"
                  : started
                    ? "bg-accent"
                    : "bg-dim"
              }`}
            />
            <span className="mono-label text-[10px] text-muted-foreground">
              {paused ? "PAUSED" : "SESSION"}
            </span>
          </span>
          <span className="block font-mono text-4xl font-semibold tabular-nums text-accent">
            {fmtDuration(elapsedSec ?? 0)}
          </span>
        </button>

        <div className="flex flex-col gap-2.5">
          <RailStat label="VOLUME" value={sessionVolume.toLocaleString()} />
          <RailStat label="SETS DONE" value={setsDoneCount} />
          <RailStat
            label="NEW PR"
            value={newPrCount}
            spark
            icon={<Trophy weight="fill" className="size-3" />}
          />
        </div>

        <button
          type="button"
          onClick={() => setPlateOpen(true)}
          className="mono-label flex w-full items-center justify-center gap-2 rounded-[11px] border border-border-strong bg-card px-4 py-3 text-[11px] text-bright transition-colors hover:bg-muted"
        >
          <Barbell className="size-4" />
          PLATE CALC
        </button>

        <div className="mt-auto flex flex-col gap-3">
          {showStartHero ? (
            // Clickable even when empty so the tap shows the "add an exercise" note.
            <StartWorkoutHero onClick={startWorkout} size="compact" />
          ) : (
            <button
              type="button"
              onClick={primaryAction}
              disabled={primaryDisabled}
              className={`${finishBarStyles} text-base`}
            >
              <PrimaryIcon
                weight={PrimaryIcon === Play ? "fill" : "bold"}
                className="size-5"
              />
              {primaryLabel}
            </button>
          )}
          {/* Discard only appears once the session has started. */}
          {!isEditing && started && (
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash weight="bold" className="size-4" />
              Discard
            </button>
          )}
        </div>
      </aside>

      {/* Library picker + how-to detail (shared components) */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        addedNames={addedNames}
        addLabel="Add to workout"
      />

      {/* How-to opened from an exercise card (not the picker). */}
      <ExerciseDetailModal
        exerciseId={detailId}
        onClose={() => setDetailId(null)}
        onAdd={addExercise}
        addLabel="Add to workout"
      />

      {finishPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setFinishPrompt(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-black">Finish your set</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You still have an unfinished set in{" "}
              <span className="font-medium text-foreground">
                {pendingNames.join(", ")}
              </span>
              .{" "}
              {pendingNeedsData
                ? "Add reps (or remove the set), then finish your workout."
                : "Finish it first, then wrap up your workout."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFinishPrompt(false)}>
                Keep going
              </Button>
              <Button onClick={finishPendingSets} disabled={pendingNeedsData}>
                <Check weight="bold" className="size-4" />
                Finish set
              </Button>
            </div>
          </div>
        </div>
      )}

      {discardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setDiscardOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-500">
              <Trash weight="fill" className="size-5" />
              <h2 className="font-display text-xl font-black">
                Discard workout?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This throws away everything you&apos;ve logged in this session. It
              won&apos;t be saved to your history. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
                Keep logging
              </Button>
              <Button variant="danger" onClick={discard}>
                <Trash weight="bold" className="size-4" />
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !saving && setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-black">
              {isEditing ? "Save changes?" : "Finish workout?"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isEditing ? "Update " : "Save "}
              &ldquo;{name.trim() || "Workout"}&rdquo; with {entries.length}{" "}
              exercise{entries.length === 1 ? "" : "s"}
              {isEditing ? " in" : " to"} your history?
            </p>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Keep going
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Finish workout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The loud accent "start workout" CTA — the same hero treatment as the home
// page start button. `mobile` is the big full-bleed panel; `compact` is the
// narrower version sized for the desktop session rail.
const heroHatchStyle = {
  background:
    "repeating-linear-gradient(-45deg, rgba(10,10,11,.14) 0 8px, transparent 8px 16px)",
};

function StartWorkoutHero({
  onClick,
  disabled,
  size,
}: {
  onClick: () => void;
  disabled?: boolean;
  size: "mobile" | "compact";
}) {
  const isMobile = size === "mobile";
  const wrapStyles =
    "relative flex w-full items-center justify-between overflow-hidden rounded-[20px] " +
    "bg-accent text-accent-foreground transition hover:brightness-105 " +
    "disabled:pointer-events-none disabled:opacity-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Start workout"
      className={`${wrapStyles} ${isMobile ? "p-7" : "p-5"}`}
    >
      <span
        style={heroHatchStyle}
        className={`pointer-events-none absolute inset-y-0 right-0 ${
          isMobile ? "w-[70px]" : "w-[60px]"
        }`}
      />
      <span className="relative text-left">
        <span className="mono-label text-[10px] font-semibold opacity-70">
          READY WHEN YOU ARE
        </span>
        <span
          className={`mt-1 block font-display font-black italic uppercase leading-none tracking-tight ${
            isMobile ? "text-3xl" : "text-2xl"
          }`}
        >
          START
          <br />
          WORKOUT
        </span>
      </span>
      <span
        className={`relative flex items-center justify-center rounded-full bg-accent-foreground text-accent ${
          isMobile ? "size-14" : "size-11"
        }`}
      >
        <Play weight="fill" className={`ml-0.5 ${isMobile ? "size-6" : "size-5"}`} />
      </span>
    </button>
  );
}

// The diagonal-hatch tile (or the real image) shown beside an exercise name.
function ExerciseThumb({
  image,
  size,
}: {
  image?: string;
  size: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-11" : "size-10";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        loading="lazy"
        className={`${sizeClass} shrink-0 rounded-[10px] bg-white object-cover`}
      />
    );
  }
  return (
    <span
      style={tileGradientStyle}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-[10px] text-dim`}
    >
      <Barbell className="size-5" />
    </span>
  );
}

function HowToButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`How to do ${name}`}
      title="How-to & instructions"
      className="shrink-0 text-muted-foreground transition-colors hover:text-accent"
    >
      <Info className="size-5" />
    </button>
  );
}

// The live "vs best" spark chip shown on the active set.
function VsBestChip({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return null;
  if (rounded > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-spark/10 px-2.5 py-1.5">
        <Lightning weight="fill" className="size-3 text-spark" />
        <span className="mono-label text-[10px] text-spark-lite">
          +{rounded} vs BEST
        </span>
      </span>
    );
  }
  return (
    <span className="mono-label rounded-full bg-muted px-2.5 py-1.5 text-[10px] tabular-nums text-muted-foreground">
      {rounded}
    </span>
  );
}

// A label/value row in the desktop session rail.
function RailStat({
  label,
  value,
  spark = false,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  spark?: boolean;
  icon?: React.ReactNode;
}) {
  const wrapStyles = spark
    ? "border-spark/40 bg-spark/[0.08]"
    : "border-border bg-card";
  const labelStyles = spark ? "text-spark-lite" : "text-muted-foreground";
  return (
    <div
      className={`flex items-center justify-between rounded-[11px] border px-3.5 py-3 ${wrapStyles}`}
    >
      <span
        className={`mono-label flex items-center gap-1.5 text-[10px] ${labelStyles}`}
      >
        {icon}
        {label}
      </span>
      <span
        className={`font-display text-xl font-black ${spark ? "text-spark" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
