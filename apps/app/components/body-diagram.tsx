"use client";

import Link from "next/link";
import Model, { type Muscle } from "react-body-highlighter";

type Meas = {
  waist?: number | null;
  chest?: number | null;
  arms?: number | null;
  hips?: number | null;
  thighs?: number | null;
} | null;

// Which muscle regions light up for each tracked measurement.
const MUSCLE_MAP: Record<string, Muscle[]> = {
  chest: ["chest"],
  arms: ["biceps", "triceps", "forearm"],
  waist: ["abs", "obliques"],
  hips: ["abductors", "adductor", "gluteal"],
  thighs: ["quadriceps"],
};

const CHIPS: { key: keyof NonNullable<Meas>; label: string }[] = [
  { key: "chest", label: "Chest" },
  { key: "arms", label: "Arms" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "thighs", label: "Thighs" },
];

export function BodyDiagram({
  weight,
  unit,
  measurements,
}: {
  weight: number | null;
  unit: string;
  measurements: Meas;
}) {
  const present = CHIPS.filter((c) => measurements?.[c.key] != null);
  const hasAny = weight != null || present.length > 0;

  const muscles = present.flatMap((c) => MUSCLE_MAP[c.key] ?? []);
  const data = muscles.length
    ? [{ name: "Tracked", muscles: [...new Set(muscles)] }]
    : [];

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Your body</h2>
        {weight != null && (
          <span className="text-sm font-semibold tabular-nums">
            {weight}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div
          className={`mx-auto w-[7.5rem] shrink-0 ${hasAny ? "" : "opacity-40"}`}
          aria-hidden
        >
          <Model
            data={data}
            type="anterior"
            bodyColor="#52525b"
            highlightedColors={["#d7f24a"]}
            style={{ width: "100%" }}
          />
        </div>

        {hasAny ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-1">
            {CHIPS.map((c) => {
              const v = measurements?.[c.key];
              return (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {c.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {v != null ? `${v}"` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <p className="max-w-[16rem] text-sm text-muted-foreground">
              Log a weigh-in to see your weight and measurements light up here.
            </p>
            <Link
              href="/body"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
            >
              Add a weigh-in
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
