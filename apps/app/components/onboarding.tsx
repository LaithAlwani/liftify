"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Barbell, CaretLeft } from "@phosphor-icons/react";
import {
  Segmented,
  Stepper,
  Switch,
  type SegmentOption,
} from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { PushToggle } from "@/components/push-toggle";

// A light, skippable welcome flow for brand-new accounts. Every question maps to
// a real setting, and each step is optional — "Skip for now" drops the user
// straight into logging (the app's whole point is a fast first workout).
//
// It shows once per account: the parent passes `enabled` based on the server
// `onboardedAt` flag, and finishing/skipping calls `completeOnboarding`.

const UNIT_OPTIONS: SegmentOption<"lb" | "kg">[] = [
  { key: "lb", label: "LB" },
  { key: "kg", label: "KG" },
];

// One entry per step — keeps the header text easy to edit in one place.
const STEP_META = [
  {
    title: "Your weight unit",
    subtitle: "This is how every weight shows across the app.",
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
}: {
  enabled: boolean;
  defaultUnits?: "lb" | "kg";
  defaultGoal?: number;
}) {
  const setUnits = useMutation(api.users.setUnits);
  const setPreferences = useMutation(api.users.setPreferences);
  const createBodyEntry = useMutation(api.bodyEntries.create);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Visibility is derived from `enabled` (the parent's server-flag gate) plus a
  // local "dismissed" once the user finishes or skips — no effect needed.
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Everything the user picks, seeded with sensible defaults.
  const [units, setUnitsState] = useState<"lb" | "kg">(defaultUnits ?? "lb");
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

  // Persist the current step's answer. Called when advancing so a later "skip"
  // keeps the answers the user already gave. All best-effort — a failed save
  // never blocks the user.
  async function commitStep(currentStep: number) {
    try {
      if (currentStep === 0) {
        await setUnits({ units }); // server no-ops if unchanged
      } else if (currentStep === 1) {
        await setPreferences({ weeklyGoal });
      } else if (currentStep === 2) {
        const startingWeight = parseFloat(bodyWeightInput);
        if (startingWeight > 0) {
          await Promise.all([
            createBodyEntry({ weight: startingWeight }),
            setPreferences({ bodyWeight: startingWeight }),
          ]);
        }
      } else if (currentStep === 3) {
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

  // "Skip for now" — mark onboarding done without saving the remaining steps.
  // Anything committed on earlier steps stays.
  async function handleSkip() {
    setSaving(true);
    await finishFlow();
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
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-3 px-4 py-4">
                <p className="text-sm font-medium">Workouts per week</p>
                <Stepper
                  value={`${weeklyGoal}`}
                  onDec={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
                  onInc={() => setWeeklyGoal((g) => Math.min(14, g + 1))}
                />
              </div>
            )}

            {step === 2 && (
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

            {step === 3 && (
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
