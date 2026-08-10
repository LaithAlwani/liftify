"use client";

import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { Play, PencilSimple, Trash, Barbell } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { buttonClass } from "@/components/ui/button";

// Edit is a navigation <Link>, so it can't be an IconButton (a <button>). These
// classes mirror the IconButton ghost style + 44px touch target so both action
// controls read as the same shape.
const iconLinkStyles =
  "flex size-11 shrink-0 items-center justify-center rounded-full " +
  "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

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
    <Card className="flex flex-col gap-3 p-4">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-black uppercase tracking-tight">
          {template.name}
        </h2>
        <p className="mono-label mt-0.5 flex items-center gap-1.5 text-label text-muted-foreground">
          <Barbell weight="bold" className="size-3" />
          {exerciseCount} {exerciseCount === 1 ? "EXERCISE" : "EXERCISES"}
        </p>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>

      <div className="flex items-center gap-2">
        <Link
          href={`/workout/new?template=${template._id}`}
          className={buttonClass("display", "md", "flex-1")}
        >
          <Play weight="fill" className="size-4" />
          START
        </Link>
        <Link
          href={`/templates/${template._id}`}
          aria-label={`Edit ${template.name}`}
          title="Edit template"
          className={iconLinkStyles}
        >
          <PencilSimple weight="bold" className="size-5" />
        </Link>
        <IconButton
          variant="danger"
          onClick={onDelete}
          aria-label={`Delete ${template.name}`}
          title="Delete template"
        >
          <Trash weight="bold" className="size-5" />
        </IconButton>
      </div>
    </Card>
  );
}
