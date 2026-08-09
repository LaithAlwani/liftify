import * as React from "react";

// Shared text input + label-above field group. Replaces the per-screen
// `const inputBase = "…"` strings. Label above, helper or error below.
const inputBase =
  "w-full rounded-field border border-border bg-surface-3 px-3.5 py-2.5 text-sm " +
  "text-foreground placeholder:text-dim transition-colors focus-visible:outline-none " +
  "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40 " +
  "disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input ref={ref} className={`${inputBase} ${className}`.trim()} {...props} />
  );
});

export function Label({
  className = "",
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium text-foreground ${className}`.trim()}
      {...props}
    />
  );
}

// Label-above field group. `error` takes precedence over `helper`.
export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
  className = "",
}: {
  label?: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
