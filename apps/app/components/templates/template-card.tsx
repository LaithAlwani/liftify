"use client";

import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { Play, PencilSimple, Trash, Barbell } from "@phosphor-icons/react";

// One saved template: name + a "Squat 3×5 · Leg Press 3×10" summary + actions.
// The list page owns the delete confirmation, so the card just calls onDelete.
export function TemplateCard({
  template,
  onDelete,
}: {
  template: Doc<"templates">;
  onDelete: () => void;
}) {
  const exerciseCount = template.exercises.length;
  // "Squat 3×5" per exercise, joined — reps is taken from the first target set.
  const summary = template.exercises
    .map((exercise) => {
      const setCount = exercise.sets.length;
      const reps = exercise.sets[0]?.reps ?? 0;
      return `${exercise.name} ${setCount}×${reps}`;
    })
    .join(" · ");

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-black uppercase tracking-tight">
          {template.name}
        </h2>
        <p className="mono-label mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Barbell weight="bold" className="size-3" />
          {exerciseCount} {exerciseCount === 1 ? "EXERCISE" : "EXERCISES"}
        </p>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>

      <div className="flex items-center gap-2">
        <Link
          href={`/workout/new?template=${template._id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-display font-black italic tracking-tight text-accent-foreground transition-[filter] hover:brightness-105 active:translate-y-px"
        >
          <Play weight="fill" className="size-4" />
          START
        </Link>
        <Link
          href={`/templates/${template._id}`}
          aria-label={`Edit ${template.name}`}
          title="Edit template"
          className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PencilSimple weight="bold" className="size-5" />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${template.name}`}
          title="Delete template"
          className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash weight="bold" className="size-5" />
        </button>
      </div>
    </div>
  );
}
