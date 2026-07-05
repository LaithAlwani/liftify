import * as React from "react";

// A labeled text input used across the sign-in / sign-up forms.
export function AuthField({
  label,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fieldId = inputProps.id ?? inputProps.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-ring"
        {...inputProps}
      />
    </div>
  );
}
