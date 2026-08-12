"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Barbell, CaretLeft, Check } from "@phosphor-icons/react";
import {
  Segmented,
  Stepper,
  Switch,
  type SegmentOption,
} from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { PushToggle } from "@/components/push-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import { EQUIPMENT_OPTIONS, SPLIT_OPTIONS } from "@/lib/presets";

// A light, skippable welcome flow for brand-new accounts. Every question maps to
// a real setting, and each step is optional — "Skip for now" drops the user
// straight into logging (the app's whole point is a fast first workout).
//
// The parent controls visibility via `enabled`. Finishing calls
// `completeOnboarding` (never shown again). Skipping calls `skipOnboarding`,
// which records a skip so the home screen can gently remind them to finish.

const UNIT_OPTIONS: SegmentOption<"lb" | "kg">[] = [
  { key: "lb", label: "LB" },
  { key: "kg", label: "KG" },
];

// "Skip" pseudo-option for the split step — build your own days later.
const SKIP_SPLIT = "none";

type FitnessGoal =
  | "build-muscle"
  | "cardio"
  | "home-workout"
  | "recovery"
  | "general";

// Single-select goal options — we tailor gear + tips to the chosen focus.
const GOAL_OPTIONS: { key: FitnessGoal; label: string; description: string }[] = [
  { key: "build-muscle", label: "Build muscle", description: "Hypertrophy & strength focus" },
  { key: "cardio", label: "Cardio", description: "Conditioning & endurance" },
  { key: "home-workout", label: "Home workout", description: "Minimal-equipment training" },
  { key: "recovery", label: "Recovery", description: "Mobility & easing back in" },
  { key: "general", label: "General", description: "A balanced bit of everything" },
];

// One entry per step — keeps the header text easy to edit in one place.
const STEP_META = [
  {
    title: "Your weight unit",
    subtitle: "This is how every weight shows across the app.",
  },
  {
    title: "Your weight room",
    subtitle: "What can you train with? Pick everything you have.",
  },
  {
    title: "Pick your split",
    subtitle: "We'll set up ready-to-go days you can start in one tap.",
  },
  {
    title: "Your goal",
    subtitle: "We'll tailor gear + tips to it.",
  },
  {
    title: "Weekly goal",
    subtitle: "How many workouts are you aiming for each week?",
  },
  {
    title: "Starting weight",
    subtitle: "Optional — kicks off your Body trend. You can add it later.",
  },
  {
    title: "Stay on track",
    subtitle: "Optional reminders to train and weigh in.",
  },
];
const TOTAL_STEPS = STEP_META.length;

function formatHour(hour: number) {
  const isMorning = hour < 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${isMorning ? "AM" : "PM"}`;
}

export function Onboarding({
  enabled,
  defaultUnits,
  defaultGoal,
  onClose,
}: {
  enabled: boolean;
  defaultUnits?: "lb" | "kg";
  defaultGoal?: number;
  // Called after the user finishes or skips — lets a parent that manually
  // re-opened the flow (e.g. the "finish setup" reminder) reset its state.
  onClose?: () => void;
}) {
  const setUnits = useMutation(api.users.setUnits);
  const setPreferences = useMutation(api.users.setPreferences);
  const saveEquipment = useMutation(api.users.setEquipment);
  const createStarterDays = useMutation(api.presets.createStarterDays);
  const createBodyEntry = useMutation(api.bodyEntries.create);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const skipOnboarding = useMutation(api.users.skipOnboarding);

  // Visibility is derived from `enabled` (the parent's server-flag gate) plus a
  // local "dismissed" once the user finishes or skips — no effect needed.
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Everything the user picks, seeded with sensible defaults.
  const [units, setUnitsState] = useState<"lb" | "kg">(defaultUnits ?? "lb");
  // Most home gyms start with a barbell and dumbbells — preselect those.
  const [equipmentKeys, setEquipmentKeys] = useState<Set<string>>(
    () => new Set(["barbell", "dumbbell"]),
  );
  const [split, setSplit] = useState<string>("ppl"); // Push/Pull/Legs by default
  const [goal, setGoal] = useState<FitnessGoal>("general");
  const [weeklyGoal, setWeeklyGoal] = useState(defaultGoal ?? 4);
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [reminderHour, setReminderHour] = useState(10); // default 10 AM
  const [remindExercise, setRemindExercise] = useState(true);
  const [remindWeighIn, setRemindWeighIn] = useState(true);

  const visible = enabled && !dismissed;

  // Lock the page behind the dialog so only the dialog scrolls while it's open.
  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  function changeReminderHour(hour: number) {
    setReminderHour(((hour % 24) + 24) % 24);
  }

  function toggleEquipment(key: string) {
    setEquipmentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Persist the current step's answer. Called when advancing so a later "skip"
  // keeps the answers the user already gave. All best-effort — a failed save
  // never blocks the user.
  async function commitStep(currentStep: number) {
    try {
      if (currentStep === 0) {
        await setUnits({ units }); // server no-ops if unchanged
      } else if (currentStep === 1) {
        await saveEquipment({ equipment: [...equipmentKeys] });
      } else if (currentStep === 2) {
        // Generate the chosen split's starter days. Equipment was saved on the
        // previous step, so the server tailors the picks to what the user has.
        if (split !== SKIP_SPLIT) {
          await createStarterDays({ split });
        }
      } else if (currentStep === 3) {
        await setPreferences({ fitnessGoal: goal });
      } else if (currentStep === 4) {
        await setPreferences({ weeklyGoal });
      } else if (currentStep === 5) {
        const startingWeight = parseFloat(bodyWeightInput);
        if (startingWeight > 0) {
          await Promise.all([
            createBodyEntry({ weight: startingWeight }),
            setPreferences({ bodyWeight: startingWeight }),
          ]);
        }
      } else if (currentStep === 6) {
        await setPreferences({ reminderHour, remindExercise, remindWeighIn });
      }
    } catch {
      /* best-effort */
    }
  }

  async function finishFlow() {
    try {
      await completeOnboarding({});
    } catch {
      /* best-effort */
    }
    setSaving(false);
    setDismissed(true);
    onClose?.();
  }

  async function handleNext() {
    setSaving(true);
    await commitStep(step);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      setSaving(false);
    } else {
      await finishFlow();
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  // "Skip for now" — record a SKIP (not a completion) so the home screen can
  // remind them to finish later. Anything committed on earlier steps stays.
  async function handleSkip() {
    setSaving(true);
    try {
      await skipOnboarding({});
    } catch {
      /* best-effort */
    }
    setSaving(false);
    setDismissed(true);
    onClose?.();
  }

  if (!visible) return null;

  const meta = STEP_META[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Liftify"
    >
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-2xl">
        {/* Scrollable content — the footer below stays pinned. */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Top row — brand mark, progress dots (centered), step counter */}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="" className="size-7 rounded-lg" />
              <span className="font-display text-sm font-black tracking-tight">
                LIFTIFY
              </span>
            </span>

            <div className="flex items-center gap-2" aria-hidden="true">
              {STEP_META.map((_, index) => {
                const state =
                  index === step ? "current" : index < step ? "done" : "todo";
                const dotStyles =
                  state === "current"
                    ? "size-2.5 bg-accent"
                    : state === "done"
                      ? "size-2 bg-accent/50"
                      : "size-2 bg-muted";
                return (
                  <span
                    key={index}
                    className={`rounded-full transition-all ${dotStyles}`}
                  />
                );
              })}
            </div>

            <span className="mono-label text-[11px] text-muted-foreground">
              <span className="text-foreground">{step + 1}</span> / {TOTAL_STEPS}
            </span>
          </div>

          {/* Install nudge — first thing they see, so they can add Liftify to
              the home screen up front and get reminders on a closed app. */}
          {step === 0 && (
            <div className="mt-5">
              <InstallPrompt compact />
            </div>
          )}

          {/* Step title */}
          <div className="mt-6">
            <h2 className="font-display text-2xl font-black leading-tight">
              {meta.title}
            </h2>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              {meta.subtitle}
            </p>
          </div>

          {/* Step body */}
          <div className="mt-6 min-h-[140px]">
            {step === 0 && (
              <div className="flex justify-center py-4">
                <Segmented
                  options={UNIT_OPTIONS}
                  value={units}
                  onChange={setUnitsState}
                />
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <EquipmentChip
                      key={option.key}
                      label={option.label}
                      selected={equipmentKeys.has(option.key)}
                      onClick={() => toggleEquipment(option.key)}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bodyweight moves are always included.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-2">
                {SPLIT_OPTIONS.map((option) => (
                  <SplitRow
                    key={option.key}
                    label={option.label}
                    description={option.description}
                    dayCount={option.dayCount}
                    selected={split === option.key}
                    onClick={() => setSplit(option.key)}
                  />
                ))}
                <SplitRow
                  label="Skip for now"
                  description="I'll build my own days later"
                  selected={split === SKIP_SPLIT}
                  onClick={() => setSplit(SKIP_SPLIT)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-2">
                {GOAL_OPTIONS.map((option) => (
                  <SplitRow
                    key={option.key}
                    label={option.label}
                    description={option.description}
                    selected={goal === option.key}
                    onClick={() => setGoal(option.key)}
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-3 px-4 py-4">
                <p className="text-sm font-medium">Workouts per week</p>
                <Stepper
                  value={`${weeklyGoal}`}
                  onDec={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
                  onInc={() => setWeeklyGoal((g) => Math.min(14, g + 1))}
                />
              </div>
            )}

            {step === 5 && (
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="onboarding-weight"
                >
                  Body weight
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-surface-3 px-4 py-1 focus-within:border-accent">
                  <input
                    id="onboarding-weight"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={bodyWeightInput}
                    onChange={(e) => setBodyWeightInput(e.target.value)}
                    placeholder="e.g. 165"
                    className="w-full bg-transparent py-3 text-lg font-semibold tabular-nums outline-none"
                  />
                  <span className="font-mono text-sm uppercase text-muted-foreground">
                    {units}
                  </span>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-3 px-4 py-3">
                  <p className="text-sm font-medium">Reminder time</p>
                  <Stepper
                    value={formatHour(reminderHour)}
                    onDec={() => changeReminderHour(reminderHour - 1)}
                    onInc={() => changeReminderHour(reminderHour + 1)}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-3 px-4 py-3">
                  <p className="text-sm font-medium">Daily exercise nudge</p>
                  <Switch
                    on={remindExercise}
                    onClick={() => setRemindExercise((v) => !v)}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-3 px-4 py-3">
                  <p className="text-sm font-medium">Weekly weigh-in</p>
                  <Switch
                    on={remindWeighIn}
                    onClick={() => setRemindWeighIn((v) => !v)}
                  />
                </div>
                <PushToggle compact />
              </div>
            )}
          </div>
        </div>

        {/* Footer — pinned below the scroll area so it never overlaps content */}
        <div className="shrink-0 border-t border-border p-5">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleBack}
                disabled={saving}
                aria-label="Back"
                className="px-4"
              >
                <CaretLeft weight="bold" className="size-4" />
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={saving}
              className="flex-1"
            >
              {isLastStep && <Barbell weight="bold" className="size-4" />}
              {saving ? "Saving…" : isLastStep ? "Start lifting" : "Continue"}
            </Button>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// A tappable equipment chip for the "weight room" step (multi-select).
function EquipmentChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const base =
    "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-colors";
  const state = selected
    ? "border-accent bg-accent/10 text-foreground"
    : "border-border bg-surface-3 text-muted-foreground hover:text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} ${state}`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border-strong"
        }`}
      >
        {selected && <Check weight="bold" className="size-3" />}
      </span>
    </button>
  );
}

// A single-select row for the "pick your split" step.
function SplitRow({
  label,
  description,
  dayCount,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  dayCount?: number;
  selected: boolean;
  onClick: () => void;
}) {
  const base =
    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors";
  const state = selected
    ? "border-accent bg-accent/10"
    : "border-border bg-surface-3 hover:border-border-strong";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} ${state}`}
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-accent" : "border-border-strong"
        }`}
      >
        {selected && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-extrabold">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      {dayCount !== undefined && (
        <span className="mono-label shrink-0 text-[10px] text-muted-foreground">
          {dayCount} {dayCount === 1 ? "DAY" : "DAYS"}
        </span>
      )}
    </button>
  );
}
