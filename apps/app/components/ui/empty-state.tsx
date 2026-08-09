import type { ReactNode } from "react";

// A consistent "no data yet" block — dashed border, optional icon, message, and
// an optional call-to-action. Replaces the 5+ hand-rolled dashed empty blocks.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10 text-center ${className}`.trim()}
    >
      {icon && (
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-display text-base font-extrabold">{title}</p>
        {description && (
          <p className="mx-auto max-w-xs text-sm leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
