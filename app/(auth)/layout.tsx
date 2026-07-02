"use client";

import Link from "next/link";
import Image from "next/image";
import { Flame, ChartLineUp, Lightning } from "@phosphor-icons/react";

const PERKS = [
  { icon: Lightning, text: "Log a full session in under 30 seconds" },
  { icon: ChartLineUp, text: "A performance dashboard for every PR" },
  { icon: Flame, text: "Streaks and weekly goals that keep you honest" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Full-bleed sign-in photo — centered; the sides crop (object-cover).
            next/image serves a resized WebP/AVIF and only loads on desktop,
            where this panel is shown (~50vw). */}
        <Image
          src="/sign-in-image.jpg"
          alt=""
          fill
          sizes="50vw"
          className="pointer-events-none object-cover object-center"
        />
        {/* Scrim so the overlaid brand content stays readable over the photo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30"
        />

        <Link
          href="/"
          className="relative flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="size-9 rounded-lg" />
          Liftify
        </Link>

        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md font-display text-4xl font-black uppercase leading-[1.05] tracking-tight">
            Lift heavy. Log fast.{" "}
            <span className="text-accent">Watch strength climb.</span>
          </h2>
          <ul className="flex flex-col gap-4">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/85">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-strong">
                  <p.icon weight="bold" className="size-5" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © Liftify — built for people who actually lift.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 items-center justify-center p-6 py-16">
        {/* Mobile-only: the same photo sits behind the form (desktop shows it in
            the brand panel instead). Dimmed so the frosted form stays readable. */}
        <Image
          src="/sign-in-image.jpg"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-cover object-center lg:hidden"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/60 lg:hidden"
        />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-background/80 p-5 backdrop-blur-md lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {children}
        </div>
      </main>
    </div>
  );
}
