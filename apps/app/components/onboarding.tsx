"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Barbell } from "@phosphor-icons/react";

const KEY = "liftify:onboarded";
const UNITS = ["lb", "kg"] as const;

// One-time welcome for brand-new accounts: pick units + a weekly goal.
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
  const setPrefs = useMutation(api.users.setPreferences);
  const [open, setOpen] = useState(false);
  const [units, setUnitsState] = useState<"lb" | "kg">(defaultUnits ?? "lb");
  const [goal, setGoal] = useState(defaultGoal ?? 4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  async function finish() {
    setSaving(true);
    try {
      await Promise.all([setUnits({ units }), setPrefs({ weeklyGoal: goal })]);
    } catch {
      /* best-effort */
    } finally {
      setSaving(false);
      dismiss();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="size-8" />
          <h2 className="text-lg font-semibold tracking-tight">
            Welcome to Liftify
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Two quick settings and you&apos;re ready to lift.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium">Weight unit</p>
            <div className="mt-2 inline-flex rounded-full border border-border p-1">
              {UNITS.map((u) => (
                <button
                  key={u}
                  onClick={() => setUnitsState(u)}
                  className={`rounded-full px-6 py-2 text-sm font-medium uppercase transition-colors ${
                    units === u
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Weekly goal</p>
              <p className="text-xs text-muted-foreground">Workouts per week.</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <button
                onClick={() => setGoal((g) => Math.max(1, g - 1))}
                aria-label="Decrease"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              >
                −
              </button>
              <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                {goal}
              </span>
              <button
                onClick={() => setGoal((g) => Math.min(14, g + 1))}
                aria-label="Increase"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={finish}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          <Barbell weight="bold" className="size-4" />
          {saving ? "Saving…" : "Start lifting"}
        </button>
      </div>
    </div>
  );
}
