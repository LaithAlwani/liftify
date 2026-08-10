"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CaretRight, ArrowsClockwise, Barbell } from "@phosphor-icons/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { shortDate, weekdayLabel } from "@/lib/date";

function monthKey(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function formatDuration(sec: number | undefined) {
  if (!sec || sec <= 0) return null;
  const totalMinutes = Math.round(sec / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Steel row card. The most recent workout gets a volt accent (border + bar).
const rowCardStyles =
  "flex items-center gap-3 rounded-card border bg-card p-3 transition-colors";
const accentBarStyles = "w-[3px] self-stretch rounded-full";
const iconAffordanceStyles =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-dim transition-colors";
const sectionLabel = "mono-label text-label text-muted-foreground";

export default function HistoryPage() {
  const workouts = useQuery(api.workouts.listForUser, { limit: 500 });

  // Group newest-first into [month, workouts[]] sections.
  const groups: { month: string; items: Doc<"workouts">[] }[] = [];
  if (workouts) {
    for (const workout of workouts) {
      const month = monthKey(workout.date);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.month === month) lastGroup.items.push(workout);
      else groups.push({ month, items: [workout] });
    }
  }

  // The newest workout overall is highlighted with the volt accent.
  const mostRecentId: Id<"workouts"> | null =
    workouts && workouts.length > 0 ? workouts[0]._id : null;

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <PageHeader eyebrow="Every session you have logged" title="History" />

      {workouts === undefined ? (
        <HistorySkeleton />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={<Barbell weight="fill" className="size-5" />}
          title="No sessions yet"
          action={
            <Link
              href="/workout/new"
              className="font-display text-base font-extrabold uppercase tracking-tight text-accent transition hover:brightness-110"
            >
              Log your first workout
            </Link>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.month} className="flex flex-col gap-2.5">
            <h2 className={sectionLabel}>{group.month}</h2>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {group.items.map((workout) => (
                <WorkoutRow
                  key={workout._id}
                  workout={workout}
                  isMostRecent={workout._id === mostRecentId}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function WorkoutRow({
  workout,
  isMostRecent,
}: {
  workout: Doc<"workouts">;
  isMostRecent: boolean;
}) {
  const exerciseNames = workout.exercises.map((exercise) => exercise.name);
  const totalSets = workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.length,
    0,
  );
  const duration = formatDuration(workout.durationSec);
  const metaLine =
    `${workout.exercises.length} exercises · ${totalSets} sets` +
    (duration ? ` · ${duration}` : "");
  const dateLabel = `${weekdayLabel(workout.date)} ${shortDate(workout.date)}`;

  const borderStyles = isMostRecent
    ? "border-accent/35"
    : "border-border hover:border-border-strong";
  const barColorStyles = isMostRecent ? "bg-accent" : "bg-steel";

  return (
    <li className={`${rowCardStyles} ${borderStyles}`}>
      <span className={`${accentBarStyles} ${barColorStyles}`} />
      <Link href={`/workout/${workout._id}`} className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-display text-sm font-extrabold">
            {workout.name}
          </span>
          <span className="shrink-0 font-mono text-label text-dim">
            {dateLabel}
          </span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-label text-muted-foreground">
          {exerciseNames.join(" · ")}
        </span>
        <span className="mt-0.5 block font-mono text-label text-dim">
          {metaLine}
        </span>
      </Link>
      <Link
        href={`/workout/new?repeat=${workout._id}`}
        aria-label={`Repeat ${workout.name}`}
        title="Repeat this workout"
        className={`${iconAffordanceStyles} hover:bg-accent/10 hover:text-accent`}
      >
        <ArrowsClockwise weight="bold" className="size-[17px]" />
      </Link>
      <Link
        href={`/workout/${workout._id}`}
        aria-label={`Open ${workout.name}`}
        className="shrink-0 text-dim transition-colors hover:text-foreground"
      >
        <CaretRight weight="bold" className="size-4" />
      </Link>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <section key={groupIndex} className="flex flex-col gap-2.5">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Array.from({ length: groupIndex === 0 ? 4 : 2 }).map((_, i) => (
              <div
                key={i}
                className="h-[68px] rounded-card border border-border bg-card"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
