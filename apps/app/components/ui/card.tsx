import * as React from "react";

// The standard panel surface — one card radius (rounded-card) + hairline border.
// Replaces the per-screen `const cardStyles = "rounded-[…] border …"` strings.
// Padding is left to the caller (p-4 compact / p-5 section) so image-flush cards
// can opt out.
export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-card ${className}`.trim()}
      {...props}
    />
  );
}

// A header row for a Card: title on the left, optional action on the right.
export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-border p-4 ${className}`.trim()}
      {...props}
    />
  );
}

export function CardTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`font-display text-lg font-black ${className}`.trim()}
      {...props}
    />
  );
}
