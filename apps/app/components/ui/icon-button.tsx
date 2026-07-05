import * as React from "react";

type Variant = "ghost" | "danger";

const base =
  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "text-muted-foreground hover:bg-red-500/10 hover:text-red-600",
};

// A consistent square icon button — use for inline actions like delete/remove.
export function IconButton({
  variant = "ghost",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
