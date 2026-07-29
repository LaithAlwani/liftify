"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, Lightning, Barbell, X } from "@phosphor-icons/react";
import type { PR } from "@/lib/prs";

// The key the workout log writes to when a finished session beats a record.
const HANDOFF_KEY = "liftify:new-prs";

type Handoff = { unit: string; prs: PR[] };

// A full-screen, encouraging moment shown right after a workout that set a new
// record. It reads the one-shot handoff the log screen leaves in localStorage,
// celebrates, and clears itself on dismiss. Self-contained so the home page just
// renders <PRCelebration /> once.
export function PRCelebration() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Handoff;
      // Clear immediately so it only ever celebrates once.
      localStorage.removeItem(HANDOFF_KEY);
      if (parsed?.prs?.length > 0) setHandoff(parsed);
    } catch {
      /* ignore corrupt handoff */
    }
  }, []);

  if (!handoff) return null;
  return (
    <Celebration
      unit={handoff.unit}
      prs={handoff.prs}
      onDismiss={() => setHandoff(null)}
    />
  );
}

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

function Celebration({
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
    >
      <Confetti />

      <div className="relative w-full max-w-sm animate-pop-in rounded-[26px] border border-spark/40 bg-card p-7 text-center shadow-2xl">
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

// A burst of falling, spinning confetti. Colors come from the design tokens so
// it always matches the theme. Sizes/positions are randomized once on mount.
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["bg-spark", "bg-accent", "bg-spark-lite", "bg-bright"];
    return Array.from({ length: 40 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.8,
      size: 6 + Math.random() * 8,
      color: colors[index % colors.length],
      rounded: index % 3 === 0,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
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
