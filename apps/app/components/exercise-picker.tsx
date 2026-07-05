"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MagnifyingGlass, X, Plus, Barbell, Info, Check } from "@phosphor-icons/react";
import { ExerciseDetailModal } from "@/components/exercise-detail-modal";

// The steel diagonal-hatch tile shown when an exercise has no image.
const tileGradientStyle = {
  background: "repeating-linear-gradient(45deg,#1c1c22 0 6px,#17171b 6px 12px)",
};

const inputBase =
  "rounded-xl border border-border bg-background px-3 text-base text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// The library exercise picker: search + muscle/equipment filters + a scrollable
// list, plus an "add as custom" affordance for names not in the library. Shared
// by the workout log screen and the template editor.
export function ExercisePicker({
  open,
  onClose,
  onPick,
  addedNames,
  addLabel = "Add to workout",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseName: string) => void;
  // Names already in the current workout/template — drives the ✓ vs + affordance.
  addedNames: Set<string>;
  addLabel?: string;
}) {
  const allExercises = useQuery(api.exercises.list, {});
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<Id<"exercises"> | null>(null);

  const groups = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.muscleGroup).filter((g): g is string => !!g),
      ),
    ].sort();
  }, [allExercises]);
  const equipments = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.equipment).filter((g): g is string => !!g),
      ),
    ].sort();
  }, [allExercises]);

  const term = search.trim().toLowerCase();
  const visibleExercises = (allExercises ?? []).filter(
    (e) =>
      (!group || e.muscleGroup === group) &&
      (!equip || e.equipment === equip) &&
      (!term || e.name.toLowerCase().includes(term)),
  );

  const customName = search.trim();
  const showAddCustom =
    customName.length > 0 &&
    allExercises !== undefined &&
    !allExercises.some((e) => e.name.toLowerCase() === customName.toLowerCase());

  // Reset transient state whenever the sheet closes.
  function close() {
    setSearch("");
    setDetailId(null);
    onClose();
  }
  // Add an exercise, then close the picker (matches the log-screen flow).
  function handlePick(exerciseName: string) {
    onPick(exerciseName);
    close();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-card border border-border bg-card shadow-xl sm:rounded-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="font-display text-lg font-black">Add exercise</h2>
            <button
              onClick={close}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 pb-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                autoFocus
                className={`h-11 w-full pl-9 pr-4 ${inputBase} rounded-full`}
              />
            </div>

            {/* Muscle-group pills — scroll horizontally */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterPill active={group === null} onClick={() => setGroup(null)}>
                All muscles
              </FilterPill>
              {groups.map((g) => (
                <FilterPill
                  key={g}
                  active={group === g}
                  onClick={() => setGroup(group === g ? null : g)}
                >
                  {g}
                </FilterPill>
              ))}
            </div>

            {/* Equipment pills */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterPill active={equip === null} onClick={() => setEquip(null)}>
                All equipment
              </FilterPill>
              {equipments.map((g) => (
                <FilterPill
                  key={g}
                  active={equip === g}
                  onClick={() => setEquip(equip === g ? null : g)}
                >
                  {g}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {showAddCustom && (
              <button
                onClick={() => handlePick(customName)}
                className="mb-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-accent-strong/40"
              >
                <Plus className="size-4 text-accent-strong" />
                Add &ldquo;{customName}&rdquo; as a custom exercise
              </button>
            )}

            {allExercises === undefined ? (
              <ul className="flex flex-col gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-12 animate-pulse rounded-xl border border-border bg-muted"
                  />
                ))}
              </ul>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {visibleExercises.map((ex) => {
                  const isAdded = addedNames.has(ex.name);
                  return (
                    <li
                      key={ex._id}
                      className="flex items-center gap-1 rounded-xl border border-border pr-2 transition-colors hover:border-accent-strong/40"
                    >
                      <button
                        type="button"
                        onClick={() => handlePick(ex.name)}
                        className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left"
                      >
                        {ex.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ex.image}
                            alt=""
                            loading="lazy"
                            className="size-12 shrink-0 rounded-lg bg-white object-cover"
                          />
                        ) : (
                          <span
                            style={tileGradientStyle}
                            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-dim"
                          >
                            <Barbell className="size-5" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-display font-extrabold">
                            {ex.name}
                          </span>
                          {ex.muscleGroup && (
                            <span className="mono-label text-[10px] text-muted-foreground">
                              {ex.muscleGroup}
                            </span>
                          )}
                        </span>
                      </button>
                      {ex.hasDetail && (
                        <button
                          type="button"
                          onClick={() => setDetailId(ex._id)}
                          aria-label={`How to do ${ex.name}`}
                          title="How-to & instructions"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-accent-strong"
                        >
                          <Info className="size-5" />
                        </button>
                      )}
                      {isAdded ? (
                        <Check
                          weight="bold"
                          className="size-4 shrink-0 text-accent-strong"
                        />
                      ) : (
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </li>
                  );
                })}
                {visibleExercises.length === 0 && (
                  <p className="px-1 text-sm text-muted-foreground">
                    No matches — type a name and add it as custom.
                  </p>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* How-to for an exercise in the list — adds it and closes the picker. */}
      <ExerciseDetailModal
        exerciseId={detailId}
        onClose={() => setDetailId(null)}
        onAdd={handlePick}
        addLabel={addLabel}
      />
    </>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
