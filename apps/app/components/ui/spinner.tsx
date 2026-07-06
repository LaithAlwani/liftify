import { CircleNotch } from "@phosphor-icons/react";

// A simple loading spinner. Pass a size via className (e.g. "size-8").
export function Spinner({ className = "size-6" }: { className?: string }) {
  return (
    <CircleNotch
      weight="bold"
      className={`animate-spin text-accent ${className}`}
      aria-label="Loading"
    />
  );
}
