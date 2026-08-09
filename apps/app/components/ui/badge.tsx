import type { ReactNode } from "react";

// A small rounded pill for labels/counts/status — trend chips, unit tags, "x/5"
// counts, recovery pills. One shape (full) and a fixed set of tones.
type Tone = "neutral" | "accent" | "spark" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent/15 text-accent",
  spark: "bg-spark/15 text-spark",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-lg font-medium ${tones[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
