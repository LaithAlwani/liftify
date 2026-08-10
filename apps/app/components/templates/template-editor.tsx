"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Minus,
  Trash,
  X,
  CaretLeft,
  Check,
  PencilSimple,
  Barbell,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ExercisePicker } from "@/components/exercise-picker";
import { kindByLibrary, type Kind } from "@/lib/prs";

// Reps/weight are stored as strings while editing (raw input), converted to
// numbers on save — same approach as the workout log screen.
type SetRow = { id: string; reps: string; weight: string };
type Entry = { id: string; name: string; kind?: Kind; sets: SetRow[] };

// A short label for an exercise's weight mode (null for standard).
function kindLabel(kind?: Kind) {
  if (kind === "bodyweight") return "Bodyweight";
  if (kind === "dumbbell") return "Dumbbell";
  return null;
}

let counter = 0;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `t${counter++}`;
const toNum = (value: string) => (value.trim() === "" ? 0 : Number(value));

// A newly added exercise starts with one target set (3 sets of this is a tap away).
const DEFAULT_TARGET_REPS = "10";

const stepperStyles =
  "flex items-center gap-1 rounded-field border border-border-strong bg-card p-1";
const stepperButtonStyles =
  "flex size-7 shrink-0 items-center justify-center rounded-field bg-muted text-bright transition-[filter] hover:brightness-125";
const dashedAddStyles =
  "flex w-full items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed " +
  "border-border-strong px-4 py-4 text-accent transition-colors hover:border-accent hover:bg-accent/5";

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const isEditing = !!templateId;

  const me = useQuery(api.users.me, {});
  const allExercises = useQuery(api.exercises.list, {});
  const existing = useQuery(
    api.templates.getById,
    templateId ? { templateId: templateId as Id<"templates"> } : "skip",
  );
  const create = useMutation(api.templates.create);
  const update = useMutation(api.templates.update);

  const [name, setName] = useState("New template");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = me?.units ?? "lb";

  // Library-inferred weight modes, so newly added exercises pick up the right
  // bodyweight / dumbbell mode automatically.
  const kindByName = useMemo(
    () => kindByLibrary(allExercises ?? []),
    [allExercises],
  );

  // Edit mode: prefill from the saved template, once.
  const editLoaded = useRef(false);
  useEffect(() => {
    if (!isEditing || editLoaded.current || !existing) return;
    setName(existing.name);
    setEntries(
      existing.exercises.map((exercise) => ({
        id: uid(),
        name: exercise.name,
        kind: exercise.kind ?? kindByName.get(exercise.name.toLowerCase()),
        sets: exercise.sets.map((set) => ({
          id: uid(),
          reps: String(set.reps),
          weight: set.weight > 0 ? String(set.weight) : "",
        })),
      })),
    );
    editLoaded.current = true;
  }, [isEditing, existing, kindByName]);

  const addedNames = new Set(entries.map((entry) => entry.name));

  function addExercise(exerciseName: string) {
    setError(null);
    const alreadyAdded = entries.some(
      (entry) => entry.name.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (alreadyAdded) return;
    setEntries((prev) => [
      ...prev,
      {
        id: uid(),
        name: exerciseName,
        kind: kindByName.get(exerciseName.toLowerCase()),
        sets: [{ id: uid(), reps: DEFAULT_TARGET_REPS, weight: "" }],
      },
    ]);
  }
  function removeExercise(entryId: string) {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  }
  function addSet(entryId: string) {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const lastSet = entry.sets[entry.sets.length - 1];
        return {
          ...entry,
          sets: [
            ...entry.sets,
            {
              id: uid(),
              reps: lastSet?.reps ?? DEFAULT_TARGET_REPS,
              weight: lastSet?.weight ?? "",
            },
          ],
        };
      }),
    );
  }
  function removeSet(entryId: string, setId: string) {
    setEntries((prev) =>
      prev.flatMap((entry) => {
        if (entry.id !== entryId) return [entry];
        const sets = entry.sets.filter((set) => set.id !== setId);
        return sets.length === 0 ? [] : [{ ...entry, sets }];
      }),
    );
  }
  function updateSet(entryId: string, setId: string, patch: Partial<SetRow>) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id !== entryId
          ? entry
          : {
              ...entry,
              sets: entry.sets.map((set) =>
                set.id === setId ? { ...set, ...patch } : set,
              ),
            },
      ),
    );
  }
  function stepReps(entryId: string, set: SetRow, delta: number) {
    const next = Math.max(0, toNum(set.reps) + delta);
    updateSet(entryId, set.id, { reps: String(next) });
  }

  async function handleSave() {
    setError(null);
    if (entries.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    const exercises = entries.map((entry) => ({
      name: entry.name,
      ...(entry.kind ? { kind: entry.kind } : {}),
      sets: entry.sets.map((set) => ({
        reps: toNum(set.reps),
        weight: toNum(set.weight),
      })),
    }));
    setSaving(true);
    try {
      if (isEditing && templateId) {
        await update({
          templateId: templateId as Id<"templates">,
          name,
          exercises,
        });
      } else {
        await create({ name, exercises });
      }
      router.push("/templates");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save template.");
      setSaving(false);
    }
  }

  const displayName = name.trim() || "Template";

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 py-8">
      {/* Header: back + editable name */}
      <header className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => router.push("/templates")}
          aria-label="Back to templates"
          className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft weight="bold" className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="mono-label text-label text-muted-foreground">
            {isEditing ? "EDIT TEMPLATE" : "NEW TEMPLATE"}
          </p>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Template name"
              className="min-w-0 flex-1 bg-transparent font-display text-2xl font-black uppercase tracking-tight focus:outline-none"
            />
            <PencilSimple className="size-4 shrink-0 text-dim" />
          </div>
        </div>
      </header>

      {/* Exercises with their target sets */}
      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-muted p-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-sm font-extrabold">
                    {entry.name}
                  </span>
                  {kindLabel(entry.kind) && (
                    <span className="mono-label text-label text-muted-foreground">
                      {kindLabel(entry.kind)}
                    </span>
                  )}
                </span>
                <IconButton
                  variant="danger"
                  onClick={() => removeExercise(entry.id)}
                  aria-label={`Remove ${entry.name}`}
                  title="Remove exercise"
                >
                  <Trash className="size-4" />
                </IconButton>
              </div>

              {/* Target set rows */}
              <div className="flex flex-col gap-2 p-3">
                {entry.sets.map((set, index) => (
                  <div key={set.id} className="flex items-center gap-2">
                    <span className="w-7 text-center font-display text-sm font-black text-accent">
                      {index + 1}
                    </span>

                    {/* Reps ± stepper */}
                    <div className={stepperStyles}>
                      <button
                        type="button"
                        onClick={() => stepReps(entry.id, set, -1)}
                        aria-label={`Decrease set ${index + 1} reps`}
                        className={stepperButtonStyles}
                      >
                        <Minus weight="bold" className="size-3" />
                      </button>
                      <input
                        inputMode="numeric"
                        placeholder="0"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(entry.id, set.id, { reps: e.target.value })
                        }
                        aria-label={`Set ${index + 1} reps`}
                        className="w-10 bg-transparent text-center font-display text-lg font-black tabular-nums focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => stepReps(entry.id, set, 1)}
                        aria-label={`Increase set ${index + 1} reps`}
                        className={stepperButtonStyles}
                      >
                        <Plus weight="bold" className="size-3" />
                      </button>
                    </div>
                    <span className="mono-label text-label text-dim">REPS</span>

                    {/* Optional target weight (blank = fill in live) */}
                    <div className="relative ml-auto">
                      <Input
                        inputMode="decimal"
                        placeholder="—"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(entry.id, set.id, { weight: e.target.value })
                        }
                        aria-label={`Set ${index + 1} target weight`}
                        className="h-9 w-24! py-0 pr-9 text-center"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-label text-muted-foreground">
                        {unit}
                      </span>
                    </div>

                    {/* Remove set (only when more than one) */}
                    {entry.sets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSet(entry.id, set.id)}
                        aria-label={`Remove set ${index + 1}`}
                        className="flex size-7 items-center justify-center rounded-full text-dim transition-colors hover:bg-muted hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : (
                      <span className="size-7" />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addSet(entry.id)}
                  className="mono-label mt-1 flex items-center gap-1.5 self-start rounded-full border border-border-strong px-3 py-1.5 text-label-lg text-accent transition-colors hover:bg-accent/10"
                >
                  <Plus weight="bold" className="size-3.5" />
                  ADD SET
                </button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {entries.length === 0 && (
        <EmptyState
          icon={<Barbell weight="fill" className="size-5" />}
          title="No exercises yet"
          description="Add the exercises for this day and set target reps."
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Add exercise — opens the shared library picker */}
      <button onClick={() => setPickerOpen(true)} className={dashedAddStyles}>
        <Plus weight="bold" className="size-4" />
        <span className="mono-label text-xs">ADD EXERCISE</span>
      </button>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push("/templates")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || entries.length === 0}>
          <Check weight="bold" className="size-4" />
          {saving
            ? "Saving…"
            : isEditing
              ? "Save changes"
              : `Save “${displayName}”`}
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        addedNames={addedNames}
        addLabel="Add to template"
      />
    </div>
  );
}
