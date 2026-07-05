"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// A read-only "how-to" sheet for a single exercise (images + instructions).
// Shown from the exercise picker and from exercise cards. Renders nothing until
// an `exerciseId` is provided. When `onAdd` is given, a footer CTA lets the user
// add the exercise, then the sheet closes.
export function ExerciseDetailModal({
  exerciseId,
  onClose,
  onAdd,
  addLabel = "Add to workout",
}: {
  exerciseId: Id<"exercises"> | null;
  onClose: () => void;
  onAdd?: (exerciseName: string) => void;
  addLabel?: string;
}) {
  const detail = useQuery(
    api.exercises.getById,
    exerciseId ? { id: exerciseId } : "skip",
  );

  if (!exerciseId) return null;

  function handleAdd() {
    if (!detail || !onAdd) return;
    onAdd(detail.name);
    onClose();
  }

  return (
    <div
      // z-[60] so it stacks above the picker (z-50).
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-card border border-border bg-card shadow-xl sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="truncate font-display text-lg font-black">
            {detail?.name ?? "Exercise"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {detail === undefined ? (
            <div className="aspect-video animate-pulse bg-muted" />
          ) : detail === null ? (
            <p className="p-4 text-sm text-muted-foreground">
              Couldn&apos;t load this exercise.
            </p>
          ) : (
            <>
              {detail.images && detail.images.length > 0 && (
                <div
                  className={`grid gap-px bg-border ${
                    detail.images.length > 1 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {detail.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${detail.name} ${i === 0 ? "start" : "end"} position`}
                      className="aspect-square w-full bg-white object-contain"
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {[detail.muscleGroup, detail.equipment, detail.level]
                    .filter(Boolean)
                    .map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground"
                      >
                        {chip}
                      </span>
                    ))}
                </div>
                {detail.instructions && detail.instructions.length > 0 ? (
                  <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {detail.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No description available for this exercise.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {onAdd && (
          <div className="border-t border-border p-4">
            <Button className="w-full" onClick={handleAdd} disabled={!detail}>
              <Plus weight="bold" className="size-4" />
              {addLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
