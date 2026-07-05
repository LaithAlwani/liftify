import type { ReactNode } from "react";

// A scoreboard-style stat tile: a small mono label with an inline icon, then a
// loud Archivo-black number. The "spark" variant (orange) is used for streaks.
export function StatCard({
  label,
  value,
  unit,
  icon,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  variant?: "default" | "spark";
}) {
  const isSpark = variant === "spark";
  const cardStyles = `rounded-[14px] border bg-card p-3.5 sm:p-4 ${
    isSpark ? "border-spark/40" : "border-border"
  }`;
  const labelStyles = `mono-label flex items-center gap-1.5 text-[9px] sm:text-[10px] ${
    isSpark ? "text-spark-lite" : "text-muted-foreground"
  }`;
  const valueStyles = `font-display text-3xl font-black leading-none sm:text-4xl ${
    isSpark ? "text-spark" : ""
  }`;

  return (
    <div className={cardStyles}>
      <span className={labelStyles}>
        {icon}
        {label}
      </span>
      <span className="mt-2 flex items-baseline gap-1.5">
        <span className={valueStyles}>{value}</span>
        {unit && (
          <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
