// Client-safe metadata for the onboarding "weight room" + "your split" steps
// and the settings equipment editor.
//
// The server-side generator (convex/presets.ts) owns the equipment → exercise
// library mapping and the actual exercise slots for each split. It is keyed by
// the SAME keys used here, so keep the two in sync when adding options.

export type EquipmentOption = { key: string; label: string };

// The equipment chips shown in onboarding + settings. Bodyweight is always
// available, so it is not a chip. Edit this list to change what is offered.
export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { key: "barbell", label: "Barbell" },
  { key: "dumbbell", label: "Dumbbells" },
  { key: "cable", label: "Cable machine" },
  { key: "machine", label: "Machines" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "bands", label: "Resistance bands" },
];

export type SplitOption = {
  key: string;
  label: string;
  description: string;
  dayCount: number;
};

// The training splits a new user can pick from. Each becomes a set of
// quick-start day templates (templates are capped at 5, so no split exceeds 5).
export const SPLIT_OPTIONS: SplitOption[] = [
  {
    key: "ppl",
    label: "Push / Pull / Legs",
    description: "The classic 3-day split",
    dayCount: 3,
  },
  {
    key: "upper-lower",
    label: "Upper / Lower",
    description: "Two days you rotate through the week",
    dayCount: 2,
  },
  {
    key: "full-body",
    label: "Full Body A / B / C",
    description: "Three full-body days — great for beginners",
    dayCount: 3,
  },
  {
    key: "bro",
    label: "Bro split",
    description: "One muscle group per day",
    dayCount: 5,
  },
];
