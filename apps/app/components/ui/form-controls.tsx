"use client";

import { Minus, Plus } from "@phosphor-icons/react";

// Small, shared form controls used by the Settings page and the onboarding
// wizard. Kept in one place so the two screens always look and behave the same.

// Rounded pill of mutually exclusive options (e.g. LB/KG, text size).
export type SegmentOption<T extends string> = { key: T; label: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-surface-3 p-1">
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.04em] transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// On/off toggle.
export function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
        on ? "justify-end bg-accent" : "justify-start bg-muted"
      }`}
    >
      <span
        className={`size-5 rounded-full transition-colors ${
          on ? "bg-accent-foreground" : "bg-dim"
        }`}
      />
    </button>
  );
}

// −/+ stepper around a formatted value (weekly goal, rest length, reminder hour).
export function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const stepButtonStyles =
    "flex size-[30px] items-center justify-center rounded-full bg-muted text-bright transition-colors hover:text-foreground";
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border-strong p-1">
      <button onClick={onDec} aria-label="Decrease" className={stepButtonStyles}>
        <Minus weight="bold" className="size-3.5" />
      </button>
      <span className="min-w-[58px] text-center font-display text-[15px] font-extrabold tabular-nums">
        {value}
      </span>
      <button onClick={onInc} aria-label="Increase" className={stepButtonStyles}>
        <Plus weight="bold" className="size-3.5" />
      </button>
    </div>
  );
}
