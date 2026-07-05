"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

const PLATES: Record<string, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};
const DEFAULT_BAR: Record<string, number> = { lb: 45, kg: 20 };

function compute(total: number, bar: number, plates: number[]) {
  let perSide = (total - bar) / 2;
  if (perSide < 0) return null;
  const out: { plate: number; count: number }[] = [];
  for (const p of plates) {
    const n = Math.floor(perSide / p + 1e-9);
    if (n > 0) {
      out.push({ plate: p, count: n });
      perSide = Math.round((perSide - n * p) * 100) / 100;
    }
  }
  return { perSide: out, leftover: perSide };
}

export function PlateCalculator({
  open,
  unit,
  onClose,
}: {
  open: boolean;
  unit: string;
  onClose: () => void;
}) {
  const plates = PLATES[unit] ?? PLATES.lb;
  const [bar, setBar] = useState(DEFAULT_BAR[unit] ?? 45);
  const [target, setTarget] = useState("");

  if (!open) return null;

  const total = target.trim() === "" ? 0 : Number(target);
  const result = total > 0 ? compute(total, bar, plates) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Plate calculator
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Target ({unit})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="2.5"
              autoFocus
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0"
              className="h-11 rounded-xl border border-border bg-background px-3 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex w-24 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Bar</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="5"
              value={bar}
              onChange={(e) => setBar(Number(e.target.value) || 0)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        <div className="mt-5">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Enter a target at or above the bar weight to see the plates.
            </p>
          ) : result.perSide.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Just the bar — no plates needed.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Per side
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.perSide.map((p) => (
                  <span
                    key={p.plate}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-accent-strong"
                  >
                    {p.plate}
                    <span className="text-xs font-medium text-muted-foreground">
                      × {p.count}
                    </span>
                  </span>
                ))}
              </div>
              {result.leftover > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {result.leftover} {unit} per side can&apos;t be matched with
                  standard plates.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
