"use client";

import { useEffect, useMemo } from "react";
import { Trophy, Lightning, Barbell, X } from "@phosphor-icons/react";
import type { PR } from "@/lib/prs";

const recordCount = (n: number) =>
  n === 1 ? "New personal record!" : `${n} new personal records!`;

// A rotating line of encouragement — index by count so it feels fresh.
const CHEERS = [
  "You just got stronger. Keep the momentum going.",
  "That is real progress. Your future self says thanks.",
  "Stronger than last time. This is how it is done.",
  "Big lift. Rest up and come back for more.",
];

function formatPR(pr: PR, unit: string) {
  if (pr.type === "reps") return `${pr.value} reps`;
  const suffix = pr.type === "strength" ? " est. 1RM" : "";
  return `${pr.value} ${unit}${suffix}`;
}

// A full-screen, encouraging moment shown the instant a completed set beats a
// record. The workout log renders this directly (per set) with the PRs that set
// just broke; tapping anywhere (or the button) dismisses it so logging resumes.
export function Celebration({
  unit,
  prs,
  onDismiss,
}: {
  unit: string;
  prs: PR[];
  onDismiss: () => void;
}) {
  // Lock the page behind the overlay so only it is interactive.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const cheer = CHEERS[Math.min(prs.length - 1, CHEERS.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New personal record"
      onClick={onDismiss}
    >
      {/* Confetti fills the whole backdrop; the opaque card keeps its own area
          clean, so the celebration frames the card rather than sitting on it. */}
      <Confetti />

      <div
        className="relative w-full max-w-sm animate-pop-in rounded-[26px] border border-spark/40 bg-card p-7 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        {/* Trophy medallion */}
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-spark/15 text-spark">
          <Trophy weight="fill" className="size-11" />
        </span>

        <p className="mono-label mt-5 text-[11px] text-spark-lite">
          Personal best
        </p>
        <h2 className="mt-1 font-display text-3xl font-black uppercase italic leading-none tracking-tight text-spark">
          {recordCount(prs.length)}
        </h2>
        <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-snug text-muted-foreground">
          {cheer}
        </p>

        {/* The records beaten */}
        <ul className="mt-6 flex flex-col gap-2 text-left">
          {prs.map((pr, index) => (
            <li
              key={`${pr.name}-${pr.type}`}
              className="animate-rise-in flex items-center gap-3 rounded-2xl border border-border bg-surface-3 px-4 py-3"
              style={{ animationDelay: `${0.15 + index * 0.08}s` }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-spark/15 text-spark">
                {pr.type === "reps" ? (
                  <Barbell weight="fill" className="size-4" />
                ) : (
                  <Lightning weight="fill" className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[15px] font-extrabold">
                  {pr.name}
                </span>
                <span className="mono-label text-[10px] text-muted-foreground">
                  was {pr.previous}
                </span>
              </span>
              <span className="shrink-0 font-display text-lg font-black text-spark">
                {formatPR(pr, unit)}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 font-display text-lg font-black italic tracking-tight text-accent-foreground transition-[filter] hover:brightness-105"
        >
          Keep crushing it
        </button>
      </div>
    </div>
  );
}

// A full-screen shower of falling, spinning confetti. Colors come from the
// design tokens so it always matches the theme. Each piece starts at a random
// point in its own fall (negative delay), so the whole background is full of
// confetti from the first frame instead of only near the top.
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["bg-spark", "bg-accent", "bg-spark-lite", "bg-bright"];
    return Array.from({ length: 70 }, (_, index) => {
      const duration = 2.5 + Math.random() * 2.5;
      return {
        id: index,
        left: Math.random() * 100,
        // Negative offset so pieces are already mid-fall on the first frame.
        delay: -(Math.random() * duration),
        duration,
        size: 6 + Math.random() * 8,
        color: colors[index % colors.length],
        rounded: index % 3 === 0,
      };
    });
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`animate-confetti absolute top-0 ${piece.color} ${
            piece.rounded ? "rounded-full" : "rounded-[2px]"
          }`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
