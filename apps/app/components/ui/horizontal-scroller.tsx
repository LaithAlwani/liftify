"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

// A horizontally-scrollable row with desktop arrow controls. On touch/mobile the
// user just swipes (arrows are hidden); on desktop the arrows appear only when
// there's more to scroll in that direction. Scrollbars stay hidden either way —
// pass the scrollbar-hiding utilities through `className` on the row itself.
export function HorizontalScroller({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const row = scrollRef.current;
    if (!row) return;
    // 1px slack so rounding never leaves a phantom "can scroll" state.
    setCanScrollLeft(row.scrollLeft > 1);
    setCanScrollRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
  }

  useEffect(() => {
    const row = scrollRef.current;
    if (!row) return;
    updateArrows();
    row.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      row.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, []);

  // Recheck when the content changes (items load / are added or removed).
  useEffect(() => {
    updateArrows();
  }, [children]);

  function scrollByPage(direction: -1 | 1) {
    const row = scrollRef.current;
    if (!row) return;
    row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: "smooth" });
  }

  // Circular arrow overlaid on the row's edge. Desktop only (lg+); fades out when
  // there's nothing more to scroll that way.
  const arrowStyles =
    "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-0 lg:flex";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollLeft}
        className={`${arrowStyles} left-0`}
      >
        <CaretLeft weight="bold" className="size-4" />
      </button>

      <div ref={scrollRef} className={className}>
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByPage(1)}
        disabled={!canScrollRight}
        className={`${arrowStyles} right-0`}
      >
        <CaretRight weight="bold" className="size-4" />
      </button>
    </div>
  );
}
