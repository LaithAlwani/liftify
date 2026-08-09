import type { ReactNode } from "react";

// The mono-eyebrow + Archivo-black title header used atop every screen.
// Replaces the ~7 hand-rolled copies. Optional action sits on the right.
export function PageHeader({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mono-label text-label text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight lg:text-4xl">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
