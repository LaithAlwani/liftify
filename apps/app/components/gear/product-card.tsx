"use client";

import { ArrowUpRight, ShoppingBag } from "@phosphor-icons/react";

// The recommended-product shape returned by api.affiliate.recommend — the
// visible link always points at the tracked `clickUrl` (/api/go/…), never a raw
// affiliate URL.
export type RecoProduct = {
  _id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: string | null;
  retailer?: string;
  clickUrl: string;
};

const iconTileStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg,#1c1c22 0 6px,#17171b 6px 12px)",
};

// Reusable, mobile-first gear card. `compact` is the subtle inline variant used
// for exercise-level recommendations.
export function ProductCard({
  product,
  compact = false,
}: {
  product: RecoProduct;
  compact?: boolean;
}) {
  const thumb = product.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image}
      alt={product.name}
      className={`${compact ? "size-10" : "size-[52px]"} shrink-0 rounded-field bg-white object-contain`}
    />
  ) : (
    <span
      className={`flex ${compact ? "size-10" : "size-[52px]"} shrink-0 items-center justify-center rounded-field text-dim`}
      style={iconTileStyle}
    >
      <ShoppingBag weight="regular" className="size-5" />
    </span>
  );

  if (compact) {
    return (
      <a
        href={product.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="flex items-center gap-2.5 rounded-card border border-border bg-card px-3 py-2.5 transition-colors hover:border-accent/40"
      >
        {thumb}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {product.name}
          </span>
          {product.description && (
            <span className="block truncate text-xs text-muted-foreground">
              {product.description}
            </span>
          )}
        </span>
        <ArrowUpRight weight="bold" className="size-4 shrink-0 text-accent" />
      </a>
    );
  }

  return (
    <div className="flex flex-col rounded-card border border-border bg-card p-4 transition hover:border-accent/35">
      <div className="flex items-center gap-3">
        {thumb}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold leading-tight">
            {product.name}
          </p>
          {product.description && (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
        <span className="mono-label text-label text-muted-foreground">
          View on Amazon
        </span>
        <a
          href={product.clickUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          aria-label={`View ${product.name} on Amazon`}
          className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent transition hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowUpRight weight="bold" className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
