import * as React from "react";

type Variant = "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "flex shrink-0 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "text-muted-foreground hover:bg-danger/10 hover:text-danger",
};

// md = 44px (default, meets the iOS touch-target guideline); sm = 36px only for
// genuinely dense toolbars.
const sizes: Record<Size, string> = {
  sm: "size-9",
  md: "size-11",
};

// A consistent circular icon button — use for inline actions like delete/remove.
export function IconButton({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
