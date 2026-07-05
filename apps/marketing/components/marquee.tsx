import { Barbell } from "@phosphor-icons/react/dist/ssr";

const ITEMS = [
  "Bench Press",
  "Back Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull Up",
  "Hip Thrust",
  "Romanian Deadlift",
  "Incline Press",
  "Lunge",
];

export function Marquee() {
  const items = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-[#1c1c22] bg-[#0c0c0e] py-4">
      <div className="flex w-max animate-marquee gap-11 whitespace-nowrap pr-11">
        {items.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-3 font-display text-lg not-italic text-[#6a6a72]"
            style={{ fontWeight: 800 }}
          >
            <Barbell weight="fill" className="size-4 text-accent" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
